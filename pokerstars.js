import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function numberOfDays(){
    return document.querySelector(".innerList.sidebarDailyList").querySelectorAll("a").length
}

async function scrapeItems(page, itemCount){
    let items = [] 
    const days = await page.evaluate(numberOfDays)
    for(let i = 0; i < days; i++){
        items = items.concat(await scrapeItemsForDayIndex(page, i))
        if(items.length > itemCount){
            break;
        }
    }
    return items;
}

function moveToDay(index){
    document.querySelector(".innerList.sidebarDailyList").querySelectorAll("a")[index].click()
}

function extractItems(index){
    console.log("HELLO")
    const divAllMatch = document.querySelector(".market.h2h.in-play.active.soccer")
        .querySelectorAll(".eventView.groupedEventView.promoted-market.slide")

    matchTexts = []
    for (let match of divAllMatch) {
        let date = document.querySelector(".innerList.sidebarDailyList").querySelectorAll("a")[index].innerText
        let divTime = match.querySelector(".match-time")
        let divTeams = match.querySelector(".event-schedule-participants-names.standard-formatted-event-display")
        let divQuotes = match.querySelector(".table-row.groupedEventViewCollection.standard-formatted-event-display")
        console.log(date)
        if(divTime !== null && divTeams !== null && divQuotes !== null){
            matchTexts.push(date + '#' + divTime.innerText + '#' + divTeams.innerText + '#' + divQuotes.innerText)
        }
    }
    return matchTexts
}

async function scrapeItemsForDayIndex(page, dayIndex) {
    let items = []
    let height = 0;
    await page.evaluate(moveToDay, dayIndex)
    await page.waitForTimeout(5000)
    let i = 0;
    while (i < 100) {
        let itemsPulled = await page.evaluate(extractItems, dayIndex);
        console.log("day " + dayIndex + " : " + itemsPulled.length + " | " + items.length)
        if(itemsPulled.length == items.length && itemsPulled != 0){
            break;
        }
        items = itemsPulled
        height = height + 2000;
        await page.evaluate(`window.scrollTo({ top: ${height}, left: 0});`)
        await page.waitForTimeout(2500);
        i = i++
    }
    return items;
}

function formatResult(result){
    let toReturn = { site: "POKERSTARS", data: [] }
    for(let line of result){
        let lines = line.split('#')
        if(line[2].length == 0){
            continue
        }
        let matchInfo = {
            match: lines[2],
            date: lines[0] + " - " + lines[1],
            quoteTeam1: lines[3].split('\n')[0],
            nameTeam1: lines[2].split('\n')[0],
            quoteTeam2: lines[3].split('\n')[2],
            nameTeam2: lines[2].split('\n')[1],
            quoteDraw: lines[3].split('\n')[1]
        }
        toReturn.data.push(matchInfo)
    }
    return toReturn
}

function prepareToScrap(){
    document.querySelector(".sort-options__wrapper").querySelectorAll(".sort-options__selection")[0].click()
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://www.pokerstars.fr/sports/#/soccer/daily', {"waitUntil" : "networkidle0"})
        await page.evaluate(prepareToScrap)

        const result = await scrapeItems(page, 100);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/poker-stars.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('Poker Stars datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
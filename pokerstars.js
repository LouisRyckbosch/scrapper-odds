import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function numberOfDays(){
    return document.querySelector(".innerList.sidebarDailyList").querySelectorAll("a")
}

async function scrapeItems(page, itemCount){
    const items = [] 
    const days = await page.evaluate(numberOfDays)
    for(let i = 0; i < days; i++){
        items.push(await scrapeItemsForDayIndex(page, i))
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
    const divAllMatch = document.querySelector(".market.h2h.in-play.active.soccer")
        .querySelectorAll(".eventView.groupedEventView.promoted-market.slide")

    let notLiveDivs = []
    for(let divMatchs of divAllMatch){
        if(!divMatchs.classList.contains("inplay")){
            notLiveDivs.push(divMatchs)
        }
    }

    matchTexts = []
    for(let divMatchs of notLiveDivs){
        matchs = divMatchs.querySelectorAll("a.cardEvent.ng-star-inserted")
        for(let match of matchs){
            matchTexts.push(
                document.querySelector(".innerList.sidebarDailyList").querySelectorAll("a")[index].innerText + " " +
                match.querySelector(".match-time").innerText + "#" +
                match.querySelector(".event-schedule-participants-names.standard-formatted-event-display").innerText + "#" +
                match.querySelector(".table-row.groupedEventViewCollection.standard-formatted-event-display").innerText
            )
        }
    }
    return matchTexts
}

async function scrapeItemsForDayIndex(page, dayIndex) {
    let items = []
    let height = 0;
    await page.evaluate(moveToDay, dayIndex)
    await page.waitForTimeout(2000)
    while (true) {
        let itemsPulled = await page.evaluate(extractItems);
        if(itemsPulled.length == items.length){
            break;
        }
        hello = items.concat(itemsPulled)
        height = height + 2000;
        await page.evaluate(`window.scrollTo({ top: ${height}, left: 0, behavior: 'smooth'});`)
        await page.waitForTimeout(1000);
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
            match: lines[0] + " - " + lines[1],
            date: lines[0],
            quoteTeam1: lines[2].split('\n')[0],
            nameTeam1: lines[1].split('//')[0],
            quoteTeam2: lines[2].split('\n')[2],
            nameTeam2: lines[1].split('//')[1],
            quoteDraw: lines[2].split('\n')[1]
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
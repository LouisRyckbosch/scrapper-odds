import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    const divsAllMatch = document.querySelectorAll(".obet-event-list-container")
    const footballTable = divsAllMatch[1]

    const matchTexts = []
    const divsWithDates = footballTable.querySelectorAll(".table.shadow")
    for (divsDate of divsWithDates) {
        const date = divsDate.getAttribute("data-date")
        let divMatchesList = divsDate.querySelectorAll(".time_group")
        const filtered = []
        for (let divMatch of divMatchesList) {
            const time = divMatch.innerText.split('\n')[0]
            if (time != " Dans moins d'1 heure" && time != "En ce moment") {
                filtered.push(divMatch)
            }
        }
        divMatchesList = filtered
        
        for (let divMatches of divMatchesList) {
            const rows = divMatches.querySelectorAll(".row.trow")
            for (let row of rows) {
                matchTexts.push(
                    divMatches.innerText.split('\n')[0] + "#" +
                    row.querySelector(".trow--event--name").innerText + "#" +
                    row.querySelector(".row.trow--odd.event-list-odds-list").innerText + "#" +
                    date
                )
            }
        }
    }

    return matchTexts
}

function matchKey(line){
    return line.split('#')[1]
}

function genMatchHeaders(array){
    let result = []
    for(let value of array){
        result.push(matchKey(value))
    }
    return result
}

function isNotLive(line){
    return true
}

function mergeNoDuplicates(array1, array2){
    let matchHeaders = genMatchHeaders(array1) 
    let matchExiting = []
    let matchLive = []
    for(let value of array2){
        if(matchHeaders.indexOf(matchKey(value)) == -1 && isNotLive(value)){
            array1.push(value)
        } else if (!isNotLive(value)){
            matchLive.push(value)
        } else {
            matchExiting.push(value)
        }
    }
    return array1
}

async function scrapeItems(page, itemCount, scrollDelay = 2000) {
    let items = []
    let height = 0;
    await page.waitForTimeout(scrollDelay)
    while (items.length < itemCount) {
        let itemsPulled = await page.evaluate(extractItems);
        items = mergeNoDuplicates(items, itemsPulled)
        height = height + 2000;
        await page.evaluate(`window.scrollTo({ top: ${height}, left: 0, behavior: 'smooth'});`)
        await page.evaluate(clickOnMoreData)
        await page.waitForTimeout(scrollDelay);
    }
    return items;
}

function formatResult(result){
    let toReturn = { site: "PMU", data: [] }
    for(let line of result){
        let lines = line.split('#')
        if(line[2].length == 0){
            continue
        }
        let matchInfo = {
            match: lines[1],
            date: lines[3] + "#" + lines[0],
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

function clickOnMoreData(){
    const elmt = document.querySelector("#pmu-event-list-load-more-8").click()
}

function prepareToScrap(){
    const elmt = document.querySelector(".tc-tab-football>a").click()
}

function clickOnCorrectSortButton(){
    document.querySelector(".sort-toggle-button.right-btn").click()
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://paris-sportifs.pmu.fr/', {"waitUntil" : "networkidle0"})
        await page.evaluate(prepareToScrap)

        const result = await scrapeItems(page, 100);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/pmu.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('PMU datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    const teams = document.querySelectorAll(".ReactVirtualized__Grid__innerScrollContainer > div")

    teamsFiltered = []
    for(team of teams){
        teamsFiltered.push(team.innerText)
    }
    console.log(teamsFiltered)

    return { site: "UNIBET", data: teamsFiltered }
}

function isNotLive(line){
    return !line.split('\n')[1].includes("MI-TEMPS")
}

function mergeNoDuplicates(array1, array2){
    for(let value of array2){
        if(array1.indexOf(value) == -1 && isNotLive(value)){
            array1.push(value)
        }
    }
    return array1
}

async function scrapeItems(page, itemCount, scrollDelay = 1500) {
    let items = { site: "UNIBET", data: [] };
    let height = 0;
    while (items.data.length < itemCount) {
        let itemsPulled = await page.evaluate(extractItems);
        items.data = mergeNoDuplicates(items.data, itemsPulled.data)
        height = height + 2000;
        await page.evaluate(`window.scrollTo({ top: ${height}, left: 0, behavior: 'smooth'});`)
        await page.waitForTimeout(scrollDelay);
    }
    return items;
}

function formatResult(result){
    let toReturn = { site: "WINAMAX", data: [] }
    for(let line of result.data){
        let lines = line.split('\n')
        let matchInfo = {
            match: lines[2] + lines[3] + lines[4],
            date: lines[1],
            quoteTeam1: lines[9],
            nameTeam1: lines[8],
            quoteTeam2: lines[15],
            nameTeam2: lines[14],
            quoteDraw: lines[12]
        }
        toReturn.data.push(matchInfo)
    }
    return toReturn
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://www.winamax.fr/paris-sportifs/sports/1', {"waitUntil" : "networkidle0"})

        const result = await scrapeItems(page, 100);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/winamax.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('Winamax data collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
import * as puppeteer from 'puppeteer'
import * as fs from 'fs'
import { timingSafeEqual } from 'crypto'

function extractItems() {
    const divAllMatch = document.querySelectorAll(".groupEvents.ng-star-inserted")

    let notLiveDivs = []
    for(let divMatchs of divAllMatch){
        if(!divMatchs.classList.contains("is-live")){
            notLiveDivs.push(divMatchs)
        }
    }

    matchTexts = []
    for(let divMatchs of notLiveDivs){
        matchs = divMatchs.querySelectorAll("a.cardEvent.ng-star-inserted")
        for(let match of matchs){
            matchTexts.push(match.innerText)
        }
    }
    return matchTexts
}

function matchKey(line){
    return line.split('\n')[2] + line.split('\n')[3] + line.split('\n')[1]
}

function genMatchHeaders(array){
    let result = []
    for(let value of array){
        result.push(matchKey(value))
    }
    return result
}

function mergeNoDuplicates(array1, array2){
    let matchHeaders = genMatchHeaders(array1) 
    for(let value of array2){
        if(matchHeaders.indexOf(matchKey(value)) == -1){
            array1.push(value)
        } 
    }
    return array1
}

async function scrapeItems(page, extractItems, itemCount, scrollDelay = 2000) {
    let items = []
    let height = 0;
    await page.waitForTimeout(scrollDelay)
    while (items.length < itemCount) {
        let itemsPulled = await page.evaluate(extractItems);
        items = mergeNoDuplicates(items, itemsPulled)
        height = height + 2000;
        await page.evaluate(`window.scrollTo({ top: ${height}, left: 0, behavior: 'smooth'});`)
        await page.waitForTimeout(scrollDelay);
    }
    return items;
}

function extractQuoteInfo(line, matchInfo, team){
    line = line.replace(/\n/g, '')
    line = line.replace(matchInfo.nameTeam1 + "-" + matchInfo.nameTeam2, '')
    line = line.replace(/\s/g, '')
    team = team.replace(/\s/g, '')
    let indexOfQuote = line.indexOf(team) + team.length
    let result = line.slice(indexOfQuote, indexOfQuote + 4)
    if(result.includes(',')){
        return result
    } else {
        return result.slice(0, 2)
    }
}

function formatResult(result){
    let toReturn = { site: "BETCLIC", data: [] }
    for(let line of result){
        let lines = line.split('\n')
        let matchInfo = {
            match: lines[2] + " - " + lines[4],
            date: lines[1],
            nameTeam1: lines[2],
            nameTeam2: lines[4]
        }
        if(!matchInfo.nameTeam1 || !matchInfo.nameTeam2){
            continue
        }
        matchInfo.quoteTeam1 = extractQuoteInfo(line, matchInfo, matchInfo.nameTeam1)
        matchInfo.quoteTeam2 = extractQuoteInfo(line, matchInfo, matchInfo.nameTeam2)
        matchInfo.quoteDraw = extractQuoteInfo(line, matchInfo, 'Nul')
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
        await page.goto('https://www.betclic.fr/football-s1', {"waitUntil" : "networkidle0"})

        const result = await scrapeItems(page, extractItems, 100);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/betclic.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('BETCLIC datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
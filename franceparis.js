import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    let divMatchesList = document.querySelectorAll(".lines")
    const matchTexts = []
    for(let match of divMatchesList){
        matchTexts.push(
            match.querySelector(".date-event").innerText + "#" +
            match.querySelector(".actors.text-ellipsis").innerText + "#" +
            match.querySelector(".odds-box").innerText 
        )
    }
    return matchTexts
}

async function scrapeItems(page, scrollDelay = 1000) {
    await page.waitForTimeout(3000)
    return await page.evaluate(extractItems)
}

function formatResult(result){
    let toReturn = { site: "FRANCEPARIS", data: [] }
    for(let line of result){
        let lines = line.split('#')
        let date = lines[0].split('\n')
        let quote = lines[2].split('\n')
        let match = lines[1].split('\n')
        let matchInfo = {
            match: match[0] + " - " + match[1],
            date: date[1] + " - " + date[2],
            quoteTeam1: quote[1],
            nameTeam1: match[0],
            quoteTeam2: quote[5],
            nameTeam2: match[1],
            quoteDraw: quote[3]
        }
        toReturn.data.push(matchInfo)
    }
    return toReturn
}

function clickOnMoreData(){
    let div = document.querySelector("#top-paris-block > * button.nb-load")
    if(div != 'undefined'){
        div.click()
        return false
    }
    return true
}

function prepareToScrap(){
    document.querySelector(".tab.tab-system.flexbox-centered.full-height").querySelectorAll(".uk-flex-middle")[2].click()
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://www.france-pari.fr/football')
        await page.waitForTimeout(4000)
        await page.evaluate(prepareToScrap)
    
        const result = await scrapeItems(page);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/france-paris.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('FRANCE PARIS datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
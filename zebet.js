import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    const matches = document.querySelectorAll(".item-bloc.item-bloc-type-1")
    const matchTexts = []
    for(let matchDiv of matches){
        const date = matchDiv.querySelector(".bet-time.uk-flex-item-none.uk-margin-left").innerText
        const match = matchDiv.querySelector(".uk-text-truncate").innerText
        const quotes = document.querySelector(".pari-1.uk-flex-item-auto").innerText.split('\n') 
        matchTexts.push(date + "#" + match + "#" + quotes[1] + "#" + quotes[3] + "#" + quotes[5])
    }
    return matchTexts
}

async function scrapeItems(page, itemCount, scrollDelay = 2000) {
    return page.evaluate(extractItems);
}

function formatResult(result){
    let toReturn = { site: "ZEBET", data: [] }
    for(let line of result){
        let lines = line.split('#')
        let matchInfo = {
            match: lines[1],
            date: lines[0],
            quoteTeam1: lines[2],
            nameTeam1: lines[1].split(' / ')[0],
            quoteTeam2: lines[4],
            nameTeam2: lines[1].split(' / ')[1],
            quoteDraw: lines[3]
        }
        toReturn.data.push(matchInfo)
    }
    return toReturn
}

function clickOnMoreData(){
    const elmt = document.querySelector("#pmu-event-list-load-more-8").click()
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://www.zebet.fr/en/sport/13-football')
        await page.waitForTimeout(5000);

        const result = await scrapeItems(page, 100);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/zebet.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('ZEBET datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
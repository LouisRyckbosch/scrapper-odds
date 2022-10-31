import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    const divsAllMatch = document.querySelectorAll(".event-info")

    const matchTexts = []
    for(let divMatch of divsAllMatch){
        divMatch.querySelector('.category-date')
        divMatch.querySelectorAll('.team-name-layout2 ')
        matchTexts.push(divMatch.innerText)
    }

    return matchTexts
}

async function scrapeItems(page, itemCount, scrollDelay = 2000) {
    await page.waitForTimeout(scrollDelay)
    let items = []
    let height = 0;
    let i = 0;
    while (i < 100) {
        let itemsPulled = await page.evaluate(extractItems);
        if(itemsPulled.length == items.length && itemsPulled != 0){
            break;
        }
        items = itemsPulled
        height = height + 2000;
        await page.evaluate(`window.scrollTo({ top: ${height}, left: 0});`)
        await page.waitForTimeout(1000);
        i = i++
    }
    return items;
}

function formatResult(result){
    let toReturn = { site: "BARRIEREBET", data: [] }
    for(let line of result){
        let lines = line.split('\n')
        if(line[2].length == 0){
            continue
        }
        let matchInfo = {
            match: lines[0] + " - " + lines[2],
            date: lines[1],
            quoteTeam1: lines[4],
            nameTeam1: lines[0],
            quoteTeam2: lines[6],
            nameTeam2: lines[2],
            quoteDraw: lines[5]
        }
        toReturn.data.push(matchInfo)
    }
    return toReturn
}

function prepareToScrap(){
    document.querySelector(".sidebar-title.todays-events-title ").click()
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://www.barrierebet.fr/', {"waitUntil" : "networkidle0"})
        await page.evaluate(prepareToScrap)

        const result = await scrapeItems(page, 100);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/barriere-bet.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('BARRIERE BET datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
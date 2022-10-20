import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    let divMatchesList = document.querySelectorAll(".nb-event.topbets")
    const matchTexts = []
    for(let divMatches of divMatchesList){
        const date = divMatches.querySelector(".nb-event_date")
        const quotes = divMatches.querySelectorAll(".nb-odds_amount")
        const teams = divMatches.querySelectorAll(".nb-match_actor")
        console.log(date)
        console.log(quotes)
        console.log(teams)

        if(date.innerText.includes(" min") || quotes.length < 3){
            continue
        }
        matchTexts.push(date.innerText + "#" + teams[0].innerText + "#" + teams[1].innerText + "#" + quotes[0].innerText + "#" 
            + quotes[1].innerText + "#" + quotes[2].innerText)
    }
    return matchTexts
}

async function scrapeItems(page, scrollDelay = 1000) {
    page.waitForTimeout(1000)
    let height = 0;
    let shouldBreak = false;
    for(let i = 0 ; i < 8 ; i++){
        height = height + 1000;
        await page.waitForTimeout(scrollDelay);
        await page.evaluate(`window.scrollTo({ top: ${height}, left: 0, behavior: 'smooth'});`)
        await page.waitForTimeout(scrollDelay);
        if(shouldBreak){
            break;
        }
        shouldBreak = await page.evaluate(clickOnMoreData)
    }

    return await page.evaluate(extractItems);
}

function formatResult(result){
    let toReturn = { site: "NETBET", data: [] }
    for(let line of result){
        let lines = line.split('#')
        let matchInfo = {
            match: lines[1] + " - " + lines[2],
            date: lines[0],
            quoteTeam1: lines[3],
            nameTeam1: lines[1],
            quoteTeam2: lines[5],
            nameTeam2: lines[2],
            quoteDraw: lines[4]
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

function getPositionTopBetFoot(){
    div = document.querySelector("#homeFilterBySporttopBetsBlock").querySelectorAll("li")[0].getBoundingClientRect()
    return [div.x, div.y]
}

function clickOnTopBet(){
    document.querySelector(".nb-switcher-tab.uk-tab").querySelectorAll("a")[0].click()
}

function clickOnTopBetFootBall(){
    document.querySelector("#homeFilterBySporttopBetsBlock").querySelectorAll("li")[1].click()
}

function clickOnMoreElementDefault(){
    document.querySelector("#top-paris-block > * button.nb-load").click()
}


async function rustineLoading(page){
    await page.evaluate(clickOnTopBet)
    const pos = await page.evaluate(getPositionTopBetFoot)
    await page.mouse.move(pos[0], pos[1], {steps: 100})
    await page.hover(".nb-switcher-tab.uk-tab")
    await page.mouse.click(pos[0], pos[1])
    await page.mouse.wheel({ deltaY: 800 })
    await page.waitForTimeout(1000)
    await page.evaluate(clickOnMoreElementDefault)
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://www.netbet.fr/', {"waitUntil" : "networkidle0"})
        await rustineLoading(page)
    
        const result = await scrapeItems(page);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/netbet.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('NETBET datas collected')
        )

        //browser.close()
    } catch (error) {
        console.log(error)
    }
}
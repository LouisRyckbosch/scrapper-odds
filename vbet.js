import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    let scrollMatches = document.querySelector(".style__Wrapper-sc-fcwv3m-0.bjOCpD")
    let matchCard = scrollMatches.querySelectorAll(".match-card__container")
    let date = scrollMatches.querySelector(".competition-date-collapse").innerText
    const matchTexts = []
    for(let match of matchCard){
        let teams = match.querySelectorAll(".style__Name-sc-1pz2fdq-1.ljGkAe")
        let quoteDiv = match.querySelector(".am-flexbox.am-flexbox-justify-end.am-flexbox-align-center")
        if(teams.length > 1 && quoteDiv != 'undefined'){
            const team1 = teams[0].innerText
            const team2 = teams[1].innerText
            const quotes = quoteDiv.innerText.split('\n') 
            matchTexts.push(date + "#" + team1 + "#" + team2 + "#" + quotes[0] + "#" + quotes[1] + "#" + quotes[2])
        }
    }
    return matchTexts
}

function clickAtChampionShipIndex(index){
    const wrapperChampionShip = document.querySelector(".style__Wrapper-sc-nitumr-0.cdHtJQ")
    wrapperChampionShip.querySelectorAll("a > div")[index].click()
}

function getChampionShipSize(){
    const wrapperChampionShip = document.querySelector(".style__Wrapper-sc-nitumr-0.cdHtJQ")
    return wrapperChampionShip.querySelectorAll("a").length
}

async function scrapeItems(page, itemCount, scrollDelay = 2000) {
    let result = []
    await page.waitForTimeout(1000)
    let lenghtCS = await page.evaluate(getChampionShipSize)
    for(let i = 0; i < lenghtCS; i++){
        await page.evaluate(clickAtChampionShipIndex, i)
        await page.waitForTimeout(5000)
        result = result.concat(await page.evaluate(extractItems))
    }
    return result
}

function formatResult(result){
    console.log(result)
    let toReturn = { site: "VBET", data: [] }
    for(let line of result){
        let lines = line.split('#')
        let matchInfo = {
            match: lines[1] + " // " + lines[2],
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

function moveToCorrectPage(){
    document.querySelectorAll(".style__MenuItem-sc-1uncf6a-4.faMrax")[1].click() 
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://www.vbet.fr/paris-sportifs/match/Soccer/', {"waitUntil" : "networkidle0"})
        await page.evaluate(moveToCorrectPage)
        const result = await scrapeItems(page, 100);
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/vbet.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('VBET datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
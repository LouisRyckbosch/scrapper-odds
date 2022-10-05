import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    const divAllMatch = document.querySelector("#match-list")
    divMatchs = divAllMatch.querySelectorAll("tr.m-s-0")

    const matchTexts = []
    for(let match of divMatchs){
        matchTexts.push(match.innerText)
    }

    return matchTexts
}

function matchKey(line){
    return line.split('\n')[0] + line.split('\n')[1]
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
    let matchExiting = []
    let matchLive = []
    for(let value of array2){
        if(matchHeaders.indexOf(matchKey(value)) == -1){
            array1.push(value)
        } else if (!isNotLive(value)){
            matchLive.push(value)
        } else {
            matchExiting.push(value)
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
        await page.evaluate(height => { window.scrollTo({ top: height, left: 0, behavior: 'smooth' }); }, height);
        await page.waitForTimeout(scrollDelay);
    }
    return items;
}

function formatResult(result){
    let toReturn = { site: "PARIONSSPORT", data: [] }
    for(let line of result){
        let lines = line.split('\n')
        let quotes = lines[2].split('\t')
        let teams = lines[1].split('-')
        let matchInfo = {
            match: teams[0] + " - " + teams[1],
            date: lines[0],
            quoteTeam1: quotes[3],
            nameTeam1: teams[0],
            quoteTeam2: quotes[5],
            nameTeam2: teams[1],
            quoteDraw: quotes[4]
        }
        toReturn.data.push(matchInfo)
    }
    return toReturn
}

function clickOnCorrectSortButton(){
    document.querySelector(".sort-toggle-button.right-btn.active").click()
}

async function addCorrectSorting(page){
    await page.waitForTimeout(2000);
    await page.evaluate(clickOnCorrectSortButton)
}

function clickOnListButton() {
    document.querySelector("a.liste-on").click()
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://www.pronosoft.com/fr/parions_sport/liste-parions-sport-plein-ecran.htm', {"waitUntil" : "networkidle0"})
        await page.evaluate(clickOnListButton)

        const result = await scrapeItems(page, extractItems, 100);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/parionssport.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('Parions Sport datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
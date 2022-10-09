import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    const divAllMatch = document.querySelector("#main-view > ms-fixture-list > div > div:nth-child(1) > div > div.swipe-container.ng-star-inserted > ms-grid > div")
    divMatchs = divAllMatch.querySelectorAll("ms-event.grid-event.ms-active-highlight.ng-star-inserted")

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

function isNotLive(line){
    return !line.includes("EN DIRECT")
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

async function scrapeItems(page, extractItems, itemCount, scrollDelay = 2000) {
    let items = []
    let height = 0;
    await page.waitForTimeout(scrollDelay)
    while (items.length < itemCount) {
        let itemsPulled = await page.evaluate(extractItems);
        items = mergeNoDuplicates(items, itemsPulled)
        height = height + 2000;
        await page.evaluate(height => {
            const scrollableSection = document.querySelector("#main-content > ms-main > ng-scrollbar.column.column-center.ng-scrollbar.ng-star-inserted > div > div > div");
            scrollableSection.scrollTo({ top: height, left: 0, behavior: 'smooth' });
        }, height);
        await page.waitForTimeout(scrollDelay);
    }
    return items;
}

function formatResult(result){
    let toReturn = { site: "BWIN", data: [] }
    for(let line of result){
        let lines = line.split('\n')
        let matchInfo = {
            match: lines[0] + " - " + lines[1],
            date: lines[2],
            quoteTeam1: lines[3],
            nameTeam1: lines[0],
            quoteTeam2: lines[5],
            nameTeam2: lines[1],
            quoteDraw: lines[4]
        }
        toReturn.data.push(matchInfo)
    }
    return toReturn
}

function moveToCorrectPage(){
    console.log("Start")
    const elmts = document.querySelectorAll("ms-item.ng-star-inserted")
    let containerTarget = null
    for(let elmt of elmts){
        if(elmt.innerText == "TOUTES LES COMPÉTITIONS"){
            containerTarget = elmt
        }
    }
    const spans = containerTarget.querySelectorAll("span.ng-star-inserted")
    let targetToBeClicked = null 
    for(const span of spans){
        if(span.innerText = "Toutes les compétitions"){
            targetToBeClicked = span
        }
    }
    targetToBeClicked.click()
    
}

function clickOnCorrectSortButton(){
    document.querySelector(".sort-toggle-button.right-btn").click()
}

async function addCorrectSorting(page){
    await page.waitForTimeout(2000);
    await page.evaluate(clickOnCorrectSortButton)
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://sports.bwin.fr/fr/sports/football-4/paris-sportifs', {"waitUntil" : "networkidle0"})
        await page.evaluate(moveToCorrectPage)
        await addCorrectSorting(page)

        const result = await scrapeItems(page, extractItems, 100);      
        const resultFormatted = formatResult(result)
        fs.writeFile( 
            './json/bwin.json', 
            JSON.stringify(resultFormatted, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('BWIN datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
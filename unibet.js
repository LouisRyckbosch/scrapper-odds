import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

function extractItems() {
    const teams = document.querySelectorAll(".bettingbox-item")
    const result = []
    for (div of teams) {
        let divDate = div.querySelector("span.bettingbox-date")
        if (divDate) {
            matchs = div.querySelectorAll(".calendar-event")
            for (match of matchs) {
                let matchInfo = {}
                matchInfo.match = match.querySelector("div.cell-event > span").innerText
                quotes = match.querySelector(".oddsbox").querySelectorAll(".oddc")

                matchInfo.date = divDate.innerText
                matchInfo.quoteTeam1 = quotes[0].querySelector(".price").innerText.split('\n')[1]
                matchInfo.nameTeam1 = quotes[0].querySelector(".longlabel-inner").innerText
                matchInfo.quoteTeam2 = quotes[2].querySelector(".price").innerText.split('\n')[1]
                matchInfo.nameTeam2 = quotes[2].querySelector(".longlabel-inner").innerText
                matchInfo.quoteDraw = quotes[1].querySelector(".price").innerText.split('\n')[1]

                console.log(matchInfo)
                result.push(matchInfo)
            }
        }
    }
    return { site: "UNIBET", data: result }
}

async function scrapeItems(page, extractItems, itemCount, scrollDelay = 800) {
    let items = { site: "UNIBET", data: [] };
    try {
        let previousHeight;
        while (items.data.length < itemCount) {
            items = await page.evaluate(extractItems);
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitForTimeout(scrollDelay);
        }
    } catch (e) { 
        console.log(e) 
    }
    return items;
}

export async function scrap() {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp"
        })
        const page = await browser.newPage()
        await page.goto('https://www.unibet.fr/sport/football', {"waitUntil" : "networkidle0"})

        const result = await scrapeItems(page, extractItems, 100);      

        fs.writeFile( 
            './json/unibet.json', 
            JSON.stringify(result, null, 2),
            (err) => err ? console.error('Data not written', err) : console.log('Unibet datas collected')
        )

        browser.close()
    } catch (error) {
        console.log(error)
    }
}
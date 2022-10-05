import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

import * as unibet from './unibet.js'
import * as winamax from './winamax.js'
import * as bwin from './bwin.js'
import * as ps from './parionssport.js'
import * as betclic from './betclic.js'

void (async () => {
    await unibet.scrap()
    await winamax.scrap()
    await bwin.scrap()
    await ps.scrap()
    await betclic.scrap()
})()
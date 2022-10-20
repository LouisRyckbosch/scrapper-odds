import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

import * as unibet from './unibet.js'
import * as winamax from './winamax.js'
import * as bwin from './bwin.js'
import * as ps from './parionssport.js'
import * as betclic from './betclic.js'
import * as pmu from './pmu.js'
import * as zebet from './zebet.js'
import * as vbet from './vbet.js'
import * as netbet from './netbet.js'

void (async () => {
    //await unibet.scrap()
    //await winamax.scrap()
    //await bwin.scrap()
    //await ps.scrap()
    //await betclic.scrap()
    //await pmu.scrap()
    //await zebet.scrap()
    //await vbet.scrap()
    await netbet.scrap()
})()
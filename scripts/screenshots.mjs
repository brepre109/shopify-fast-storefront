#!/usr/bin/env node
/**
 * Captures the README screenshot set: collection -> variant select -> cart drawer,
 * on desktop (1440px) and mobile (390px). Run against a production server:
 *
 *   npm run build && npm start            # in one terminal
 *   npm run screenshots                    # in another (BASE_URL defaults to :3000)
 *
 * Pass --gif to also record the desktop flow and convert it to docs/screenshots/flow.gif
 * (needs ffmpeg on PATH).
 */
import { execFileSync } from 'node:child_process'
import { mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.resolve('docs/screenshots')
const gif = process.argv.includes('--gif')

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}

async function flow(page, name, shot) {
  await page.goto(BASE_URL + '/')
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.waitForLoadState('networkidle')
  await shot(`${name}-1-collection`)

  await page.goto(BASE_URL + '/products/loom-cotton-tee')
  await page.waitForLoadState('networkidle')
  // Keyboard-select "Clay" (Right, Right from Chalk), then pick size M.
  const color = page.getByRole('radiogroup', { name: /Color/ })
  await color.getByRole('radio', { checked: true }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.getByRole('radiogroup', { name: /Size/ }).getByRole('radio', { name: /^M$/ }).click()
  await page.waitForLoadState('networkidle')
  await page.getByTestId('product-image').evaluate((img) => img.decode())
  await page.mouse.move(0, 0)
  // Phones: bring the title, price and option pickers into view; desktop shows it all.
  await page.getByRole('heading', { level: 1 }).evaluate((h1) => {
    const top = window.innerWidth < 900 ? h1.getBoundingClientRect().top + window.scrollY - 150 : 0
    window.scrollTo(0, top)
  })
  await page.waitForTimeout(250) // let the swatch colour transition settle
  await shot(`${name}-2-variant`)

  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.getByRole('dialog', { name: /Your cart/ }).waitFor()
  await page.waitForTimeout(450) // let the slide-in transition finish
  await shot(`${name}-3-cart`)
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
for (const [name, options] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext({ ...options, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  await flow(page, name, (file) => page.screenshot({ path: path.join(OUT, `${file}.png`) }))
  await context.close()
  console.log(`captured ${name}`)
}

if (gif) {
  const videoDir = path.join(OUT, '.video')
  const context = await browser.newContext({
    ...VIEWPORTS.desktop,
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  await flow(page, 'gif', async () => page.waitForTimeout(1200))
  await context.close()
  const [video] = await readdir(videoDir)
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', path.join(videoDir, video),
    '-vf', 'fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer',
    path.join(OUT, 'flow.gif'),
  ])
  await rm(videoDir, { recursive: true })
  console.log('captured flow.gif')
}
await browser.close()

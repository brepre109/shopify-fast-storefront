#!/usr/bin/env node
/**
 * Runs Lighthouse against a production server and writes a score summary.
 *
 *   npm run build && npm start             # in one terminal
 *   npm run lighthouse                     # in another (BASE_URL defaults to :3000)
 *
 * Uses Lighthouse's default mobile config (Moto G Power emulation, simulated slow 4G,
 * 4x CPU slowdown) and the desktop preset. Each page/form factor is run RUNS times
 * and the median performance run is kept. Uses CHROME_PATH if set, otherwise
 * Playwright's bundled Chromium.
 */
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const RUNS = Number(process.env.RUNS ?? 3)
const OUT = path.resolve('lighthouse')
const CHROME_PATH = process.env.CHROME_PATH ?? chromium.executablePath()

const PAGES = [
  ['Collection', '/'],
  ['Product', '/products/loom-cotton-tee'],
]
const FORM_FACTORS = ['mobile', 'desktop']
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

await mkdir(OUT, { recursive: true })
const rows = []

for (const [name, route] of PAGES) {
  for (const formFactor of FORM_FACTORS) {
    const runs = []
    for (let i = 0; i < RUNS; i++) {
      const file = path.join(OUT, `${name.toLowerCase()}-${formFactor}-${i}.json`)
      const args = [
        'lighthouse',
        BASE_URL + route,
        '--quiet',
        '--output=json',
        `--output-path=${file}`,
        `--only-categories=${CATEGORIES.join(',')}`,
        '--chrome-flags=--headless --no-sandbox',
        ...(formFactor === 'desktop' ? ['--preset=desktop'] : []),
      ]
      const res = spawnSync('npx', args, { stdio: 'inherit', env: { ...process.env, CHROME_PATH } })
      if (res.status !== 0) throw new Error(`lighthouse failed for ${route} (${formFactor})`)
      const lhr = JSON.parse(await readFile(file, 'utf8'))
      runs.push({
        scores: Object.fromEntries(CATEGORIES.map((c) => [c, Math.round(lhr.categories[c].score * 100)])),
        lcp: lhr.audits['largest-contentful-paint'].numericValue,
        cls: lhr.audits['cumulative-layout-shift'].numericValue,
        tbt: lhr.audits['total-blocking-time'].numericValue,
        fcp: lhr.audits['first-contentful-paint'].numericValue,
        version: lhr.lighthouseVersion,
        userAgent: lhr.environment.hostUserAgent,
      })
    }
    runs.sort((a, b) => a.scores.performance - b.scores.performance)
    const median = runs[Math.floor(runs.length / 2)]
    rows.push({ page: name, route, formFactor, runs: runs.map((r) => r.scores.performance), ...median })
  }
}

const summary = { measuredAt: new Date().toISOString(), baseUrl: BASE_URL, runsPerPage: RUNS, rows }
await writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')

console.log('\n| Page | Form factor | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |')
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for (const r of rows) {
  console.log(
    `| ${r.page} | ${r.formFactor} | ${r.scores.performance} | ${r.scores.accessibility} | ${r.scores['best-practices']} | ${r.scores.seo} | ${(r.lcp / 1000).toFixed(1)} s | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} ms |`,
  )
}
console.log(`\nLighthouse ${rows[0]?.version}; performance scores per run: ${rows.map((r) => r.runs.join('/')).join(', ')}`)

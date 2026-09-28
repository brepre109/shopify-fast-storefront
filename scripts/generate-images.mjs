#!/usr/bin/env node
/**
 * Draws the product artwork for the synthetic catalog as SVG and rasterises it to
 * WebP with sharp. Output is committed under public/products, so this only needs to
 * run when the catalog changes.
 *
 *   npm run images
 *
 * Requires Node >= 22.18 (native TypeScript type stripping) to import the seed file.
 * All artwork is original and released under the repository's MIT licence.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { IMAGE_HEIGHT as H, IMAGE_WIDTH as W, SEED_PRODUCTS, imagePath } from '../src/lib/commerce/mock/seed.ts'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

// --- colour helpers --------------------------------------------------------
const hex = (h) => h.replace('#', '').match(/../g).map((x) => parseInt(x, 16))
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t))
const shade = (c, t) => mix(c, '#1d1a17', t)
const tint = (c, t) => mix(c, '#ffffff', t)
const luminance = (c) => {
  const [r, g, b] = hex(c).map((v) => v / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Deterministic PRNG so regenerated images are byte-stable. */
function rng(seed) {
  let s = [...seed].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

const speckles = (rand, n, box, color, opacity = 0.35) =>
  Array.from({ length: n }, () => {
    const x = box.x + rand() * box.w
    const y = box.y + rand() * box.h
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + rand() * 3).toFixed(1)}" fill="${color}" opacity="${opacity}"/>`
  }).join('')

// --- artwork ---------------------------------------------------------------
// Every drawing is centred on (600, 800) and sits on the "floor" at y≈1130.
const floor = (w = 360) => `<ellipse cx="600" cy="1140" rx="${w}" ry="34" fill="#000" opacity="0.10"/>`

const ART = {
  mug(c, rand) {
    return `${floor(250)}
      <path d="M770 700 h40 a110 110 0 0 1 0 220 h-40" fill="none" stroke="${shade(c, 0.12)}" stroke-width="46" stroke-linecap="round"/>
      <path d="M390 640 h390 v420 a70 70 0 0 1 -70 70 h-250 a70 70 0 0 1 -70 -70 z" fill="${c}"/>
      <path d="M390 640 h60 v490 a70 70 0 0 1 -60 -70 z" fill="${tint(c, 0.12)}" opacity="0.6"/>
      <rect x="390" y="1010" width="390" height="120" rx="0" fill="${tint(c, 0.35)}" opacity="0.55"/>
      <ellipse cx="585" cy="640" rx="195" ry="34" fill="${shade(c, 0.25)}"/>
      <ellipse cx="585" cy="646" rx="170" ry="24" fill="${shade(c, 0.45)}"/>
      ${speckles(rand, 60, { x: 410, y: 690, w: 350, h: 310 }, shade(c, 0.5))}`
  },
  dripper(c, rand) {
    return `${floor(230)}
      <path d="M430 860 h340 l-20 250 a40 40 0 0 1 -40 36 h-220 a40 40 0 0 1 -40 -36 z" fill="#f4efe6" stroke="${shade(c, 0.2)}" stroke-width="6" opacity="0.9"/>
      <path d="M455 990 h290 l-8 118 a28 28 0 0 1 -28 24 h-218 a28 28 0 0 1 -28 -24 z" fill="#6b4a33" opacity="0.8"/>
      <rect x="470" y="820" width="260" height="46" rx="12" fill="${shade(c, 0.15)}"/>
      <path d="M390 520 h420 l-110 300 h-200 z" fill="${c}"/>
      <ellipse cx="600" cy="520" rx="210" ry="30" fill="${shade(c, 0.3)}"/>
      ${speckles(rand, 40, { x: 470, y: 560, w: 260, h: 220 }, shade(c, 0.5))}`
  },
  throw(c) {
    const stripe = luminance(c) > 0.5 ? '#2f3a4a' : '#e9dcc3'
    const layer = (y, w, col) =>
      `<rect x="${600 - w / 2}" y="${y}" width="${w}" height="120" rx="46" fill="${col}"/>`
    const fringe = Array.from({ length: 24 }, (_, i) =>
      `<line x1="${330 + i * 23}" y1="1128" x2="${326 + i * 23}" y2="1170" stroke="${shade(c, 0.1)}" stroke-width="6" stroke-linecap="round"/>`,
    ).join('')
    return `${floor(340)}
      ${fringe}
      ${layer(1010, 600, shade(c, 0.08))}
      ${layer(890, 620, c)}
      <rect x="290" y="930" width="620" height="22" fill="${stripe}" opacity="0.85"/>
      ${layer(770, 600, tint(c, 0.06))}
      <rect x="300" y="810" width="600" height="22" fill="${stripe}" opacity="0.85"/>
      ${layer(650, 580, c)}
      <path d="M340 690 q260 -40 520 0" stroke="${tint(c, 0.25)}" stroke-width="8" fill="none" opacity="0.6"/>`
  },
  tee(c) {
    return `${floor(300)}
      <path d="M470 470 q130 60 260 0 l200 90 l-70 180 l-80 -40 v400 h-360 v-400 l-80 40 l-70 -180 z" fill="${c}" stroke="${shade(c, 0.12)}" stroke-width="4"/>
      <path d="M470 470 q130 110 260 0" fill="none" stroke="${shade(c, 0.2)}" stroke-width="14"/>
      <path d="M420 740 l-40 -20 M780 740 l40 -20" stroke="${shade(c, 0.15)}" stroke-width="6" stroke-linecap="round"/>
      <path d="M480 560 v540" stroke="${shade(c, 0.06)}" stroke-width="10" opacity="0.5"/>`
  },
  tote(c) {
    return `${floor(270)}
      <path d="M470 700 v-120 a130 130 0 0 1 260 0 v120" fill="none" stroke="${shade(c, 0.25)}" stroke-width="30"/>
      <path d="M380 680 h440 l30 460 h-500 z" fill="${c}"/>
      <path d="M380 680 h440 v40 h-440 z" fill="${shade(c, 0.12)}"/>
      <rect x="520" y="820" width="160" height="110" rx="8" fill="${tint(c, 0.5)}"/>
      <text x="600" y="890" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="${shade(c, 0.5)}">F·W</text>`
  },
  candle(c) {
    return `${floor(200)}
      <path d="M600 520 q40 60 0 110 q-40 -50 0 -110 z" fill="#f2b04b"/>
      <path d="M600 560 q18 30 0 58 q-18 -28 0 -58 z" fill="#fff3c4"/>
      <line x1="600" y1="628" x2="600" y2="680" stroke="#2b241e" stroke-width="6"/>
      <rect x="420" y="660" width="360" height="470" rx="40" fill="#f1ede6" opacity="0.55" stroke="#c9c1b3" stroke-width="6"/>
      <rect x="440" y="700" width="320" height="410" rx="28" fill="${c}"/>
      <ellipse cx="600" cy="700" rx="160" ry="22" fill="${tint(c, 0.25)}"/>
      <rect x="470" y="850" width="260" height="170" rx="6" fill="#f7f3ec"/>
      <text x="600" y="925" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#3a332c">EMBER</text>
      <line x1="530" y1="955" x2="670" y2="955" stroke="#3a332c" stroke-width="3"/>`
  },
  napkins(c) {
    const napkin = (x, y, col) =>
      `<rect x="${x}" y="${y}" width="420" height="90" rx="10" fill="${col}"/>
       <rect x="${x + 18}" y="${y + 16}" width="384" height="58" rx="6" fill="none" stroke="${shade(col, 0.25)}" stroke-width="3" stroke-dasharray="10 8"/>`
    return `${floor(260)}
      ${napkin(380, 1040, shade(c, 0.1))}
      ${napkin(400, 945, c)}
      ${napkin(370, 850, tint(c, 0.08))}
      ${napkin(395, 755, c)}
      <path d="M560 755 v-120 q40 -40 80 0 v120" fill="none" stroke="#b9a37c" stroke-width="10"/>`
  },
  bowl(c, rand) {
    return `${floor(320)}
      <path d="M300 800 h600 a300 300 0 0 1 -220 290 v40 h-160 v-40 a300 300 0 0 1 -220 -290 z" fill="${c}"/>
      <path d="M300 800 h110 a300 300 0 0 0 150 280 a300 300 0 0 1 -260 -280 z" fill="${tint(c, 0.15)}" opacity="0.5"/>
      <ellipse cx="600" cy="800" rx="300" ry="54" fill="${shade(c, 0.2)}"/>
      <ellipse cx="600" cy="806" rx="270" ry="40" fill="${shade(c, 0.4)}"/>
      ${speckles(rand, 70, { x: 360, y: 860, w: 480, h: 200 }, shade(c, 0.5))}`
  },
  beanie(c) {
    const ribs = Array.from({ length: 17 }, (_, i) =>
      `<line x1="${390 + i * 26}" y1="930" x2="${390 + i * 26}" y2="1110" stroke="${shade(c, 0.22)}" stroke-width="7"/>`,
    ).join('')
    return `${floor(260)}
      <circle cx="600" cy="520" r="70" fill="${tint(c, 0.15)}"/>
      <path d="M380 940 q0 -360 220 -360 q220 0 220 360 z" fill="${c}"/>
      <path d="M430 900 q10 -260 170 -300" fill="none" stroke="${shade(c, 0.12)}" stroke-width="10" opacity="0.6"/>
      <rect x="360" y="920" width="480" height="200" rx="28" fill="${shade(c, 0.06)}"/>
      ${ribs}`
  },
}

function svgFor(product, value, detail) {
  const rand = rng(`${product.handle}-${value.name}`)
  const color = value.swatch ?? '#cccccc'
  const bg = detail ? tint(color, 0.72) : '#efe9df'
  const art = ART[product.art](color, rand)
  const body = detail
    ? `<g transform="translate(600 800) scale(1.75) translate(-600 -800)">${art}</g>`
    : `<g transform="translate(600 1140) scale(1.22) translate(-600 -1140)">${art}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${tint(bg, 0.25)}"/><stop offset="1" stop-color="${bg}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#wall)"/>
    <rect y="1060" width="${W}" height="${H - 1060}" fill="${shade(bg, 0.05)}"/>
    ${body}
  </svg>`
}

let count = 0
for (const product of SEED_PRODUCTS) {
  const [primary] = product.options
  const jobs = primary.values.map((v) => [v, false])
  jobs.push([primary.values[0], true])
  for (const [value, detail] of jobs) {
    const out = path.join(root, 'public', imagePath(product.handle, value.name, detail))
    await mkdir(path.dirname(out), { recursive: true })
    const webp = await sharp(Buffer.from(svgFor(product, value, detail))).webp({ quality: 82 }).toBuffer()
    await writeFile(out, webp)
    count++
  }
}
console.log(`Wrote ${count} images to public/products`)

#!/usr/bin/env node
/**
 * regen-ink-graph.mjs — rebuild the baked-in `const DATA = {...};` blob in
 * data/ink-graph.html from a dataset JSON ({artists, cities, styles, shops},
 * same shape as data/master.json), leaving every other byte of the viz alone.
 *
 * Usage:
 *   node scripts/regen-ink-graph.mjs <dataset.json> <out.html> [timestamp] [--template <in.html>]
 *
 * DATA schema the viz consumes (see the inline script after the blob):
 *   t       : string   — snapshot label, shown verbatim in the header
 *   target  : number   — progress bar denominator (artists+shops vs target)
 *   cities  : string[] — "City, ST" labels; shops reference by index
 *   styles  : string[] — style names; artists reference by index
 *   shops   : [name:string, cityIdx:int, rating:number|null, reviews:number|null][]
 *   artists : [name:string, igHandle:string(no @), shopIdx:int, styleIdxs:int[], hasImg:0|1][]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function die(msg) {
  console.error('regen-ink-graph: ERROR: ' + msg);
  process.exit(1);
}

/* ---------- args ---------- */
const args = process.argv.slice(2);
let templatePath = null;
const ti = args.indexOf('--template');
if (ti !== -1) {
  templatePath = args[ti + 1] || die('--template requires a path');
  args.splice(ti, 2);
}
const [datasetPath, outPath, tsArg] = args;
if (!datasetPath || !outPath) {
  die('usage: node regen-ink-graph.mjs <dataset.json> <out.html> [timestamp] [--template <in.html>]');
}
const timestamp = tsArg || '2026-07-17';
templatePath = templatePath || resolve(new URL('.', import.meta.url).pathname, '../data/ink-graph.html');

/* ---------- load inputs ---------- */
let dataset;
try {
  dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
} catch (e) {
  die('cannot read/parse dataset ' + datasetPath + ': ' + e.message);
}
for (const k of ['artists', 'cities', 'styles', 'shops']) {
  if (!Array.isArray(dataset[k])) die('dataset missing array key "' + k + '"');
}
let html;
try {
  html = readFileSync(templatePath, 'utf8');
} catch (e) {
  die('cannot read template html ' + templatePath + ': ' + e.message);
}

/* ---------- locate & validate the existing DATA blob ---------- */
const marker = 'const DATA = ';
const start = html.indexOf(marker);
if (start === -1) die('template html has no "const DATA = " marker');
if (html.indexOf(marker, start + 1) !== -1) die('template html has multiple "const DATA = " markers');
const lineEnd = html.indexOf('\n', start);
if (lineEnd === -1) die('no newline after DATA blob — unexpected file layout');
const blobText = html.slice(start + marker.length, lineEnd).replace(/;\s*$/, '');
let oldData;
try {
  oldData = JSON.parse(blobText);
} catch (e) {
  die('existing DATA blob is not one-line JSON as expected: ' + e.message);
}

function validateSchema(D, label) {
  const errs = [];
  const keys = Object.keys(D).sort().join(',');
  const expected = ['t', 'target', 'cities', 'styles', 'shops', 'artists'].sort().join(',');
  if (keys !== expected) errs.push('keys are {' + keys + '}, expected {' + expected + '}');
  if (typeof D.t !== 'string') errs.push('t is not a string');
  if (typeof D.target !== 'number') errs.push('target is not a number');
  for (const k of ['cities', 'styles']) {
    if (!Array.isArray(D[k]) || !D[k].every(x => typeof x === 'string')) {
      errs.push(k + ' is not string[]');
    }
  }
  if (!Array.isArray(D.shops)) errs.push('shops is not an array');
  else D.shops.forEach((s, i) => {
    const ok = Array.isArray(s) && s.length === 4 &&
      typeof s[0] === 'string' &&
      Number.isInteger(s[1]) && s[1] >= 0 && s[1] < D.cities.length &&
      (s[2] === null || typeof s[2] === 'number') &&
      (s[3] === null || typeof s[3] === 'number');
    if (!ok) errs.push('shops[' + i + '] is not [name, cityIdx, rating|null, reviews|null]: ' + JSON.stringify(s));
  });
  if (!Array.isArray(D.artists)) errs.push('artists is not an array');
  else D.artists.forEach((a, i) => {
    const ok = Array.isArray(a) && a.length === 5 &&
      typeof a[0] === 'string' && typeof a[1] === 'string' &&
      Number.isInteger(a[2]) && a[2] >= 0 && a[2] < D.shops.length &&
      Array.isArray(a[3]) && a[3].every(x => Number.isInteger(x) && x >= 0 && x < D.styles.length) &&
      (a[4] === 0 || a[4] === 1);
    if (!ok) errs.push('artists[' + i + '] is not [name, ig, shopIdx, styleIdxs, hasImg]: ' + JSON.stringify(a));
  });
  if (errs.length) die(label + ' DATA schema mismatch — refusing to proceed:\n  ' + errs.slice(0, 10).join('\n  '));
}
validateSchema(oldData, 'template');

/* ---------- build the new blob from the dataset ---------- */
const styles = dataset.styles.map(s => {
  if (typeof s !== 'string') die('dataset.styles contains a non-string entry: ' + JSON.stringify(s));
  return s;
});
const styleIdx = new Map(styles.map((s, i) => [s, i]));

const loc = r => {
  if (typeof r.city !== 'string' || typeof r.state !== 'string') {
    die('record missing city/state: ' + JSON.stringify(r).slice(0, 200));
  }
  return r.city + ', ' + r.state;
};

// Shops: one tuple per dataset shop record, in dataset order. Artists whose
// shop (shopName + location) has no shop record get a synthesized shop entry
// appended, so every artist maps to a valid shop index (the viz requires it).
const shopTuplesRaw = dataset.shops.map(s => {
  if (typeof s.shopName !== 'string') die('shop missing shopName: ' + JSON.stringify(s).slice(0, 200));
  return { name: s.shopName, loc: loc(s), rating: s.rating ?? null, reviews: s.reviewCount ?? null };
});
const shopIdxByKey = new Map(); // "name|City, ST" -> index; first record wins
shopTuplesRaw.forEach((s, i) => {
  const k = s.name + '|' + s.loc;
  if (!shopIdxByKey.has(k)) shopIdxByKey.set(k, i);
});

let synthesized = 0;
const artistTuplesRaw = dataset.artists.map(a => {
  if (typeof a.name !== 'string') die('artist missing name: ' + JSON.stringify(a).slice(0, 200));
  if (typeof a.instagram !== 'string' || !a.instagram) die('artist missing instagram: ' + JSON.stringify(a).slice(0, 200));
  if (typeof a.shopName !== 'string' || !a.shopName) die('artist missing shopName: ' + JSON.stringify(a).slice(0, 200));
  const key = a.shopName + '|' + loc(a);
  let si = shopIdxByKey.get(key);
  if (si === undefined) {
    // shop record absent from dataset.shops — synthesize from the artist record
    si = shopTuplesRaw.length;
    const shopRating = a.tags && a.tags.includes('shop-rating') ? (a.rating ?? null) : null;
    shopTuplesRaw.push({
      name: a.shopName, loc: loc(a),
      rating: shopRating,
      reviews: shopRating !== null ? (a.reviewCount ?? null) : null,
    });
    shopIdxByKey.set(key, si);
    synthesized++;
  }
  const styleIdxs = (a.styles || []).map(s => {
    const i = styleIdx.get(s);
    if (i === undefined) die('artist ' + a.instagram + ' has style "' + s + '" not present in dataset.styles');
    return i;
  });
  return {
    name: a.name,
    ig: a.instagram.replace(/^@/, ''),
    shop: si,
    styles: styleIdxs,
    hasImg: Array.isArray(a.portfolioImages) && a.portfolioImages.length > 0 ? 1 : 0,
  };
});

// Cities: sorted unique "City, ST" over all shop tuples (matches the original
// blob: every city is referenced by at least one shop).
const cities = [...new Set(shopTuplesRaw.map(s => s.loc))].sort();
const cityIdx = new Map(cities.map((c, i) => [c, i]));

const newData = {
  t: timestamp,
  target: oldData.target,
  cities,
  styles,
  shops: shopTuplesRaw.map(s => [s.name, cityIdx.get(s.loc), s.rating, s.reviews]),
  artists: artistTuplesRaw.map(a => [a.name, a.ig, a.shop, a.styles, a.hasImg]),
};
validateSchema(newData, 'generated'); // self-check before writing

/* ---------- splice & write ---------- */
const out = html.slice(0, start) + marker + JSON.stringify(newData) + ';' + html.slice(lineEnd);
writeFileSync(outPath, out);

console.log('regen-ink-graph: wrote ' + outPath);
console.log('  t: ' + JSON.stringify(newData.t) + '  target: ' + newData.target);
console.log('  cities: ' + cities.length + '  styles: ' + styles.length +
  '  shops: ' + newData.shops.length + ' (' + dataset.shops.length + ' from dataset + ' +
  synthesized + ' synthesized from artist records)  artists: ' + newData.artists.length);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outDir } from './vscode-path.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function stylesheets() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.css')) out.push(p);
    }
  })(outDir());
  return out.sort();
}

const varToKey = (v) => v.replace(/^--vscode-/, '').replace(/-/g, '.');
const FG_PROP = /(^|;)\s*color\s*:\s*([^;]+)/g;
const BG_PROP = /(^|;)\s*background(-color)?\s*:\s*([^;]+)/g;
const VAR = /var\(\s*(--vscode-[A-Za-z0-9-]+)/g;

function outerVars(value) {
  const out = [];
  let i = 0;
  while (i < value.length) {
    const at = value.indexOf('var(', i);
    if (at < 0) break;
    let depth = 0, end = at + 3;
    for (; end < value.length; end++) {
      if (value[end] === '(') depth++;
      else if (value[end] === ')' && --depth === 0) break;
    }
    const m = value.slice(at, at + 60).match(VAR);
    if (m) out.push(m[0].replace(/^var\(\s*/, ''));
    i = end + 1;
  }
  return out;
}

const pairs = new Map();
const selectorFor = new Map();
let ruleCount = 0;
const files = stylesheets();
for (const file of files) {
  const css = fs.readFileSync(file, 'utf8');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  ruleCount += rules.length;
  for (const [, sel, body] of rules) {
    const fgs = new Set(), bgs = new Set();
    for (const m of body.matchAll(FG_PROP)) for (const v of outerVars(m[2])) fgs.add(varToKey(v));
    for (const m of body.matchAll(BG_PROP)) for (const v of outerVars(m[3])) bgs.add(varToKey(v));
    if (!fgs.size || !bgs.size) continue;
    for (const f of fgs) for (const b of bgs) {
      if (f === b) continue;
      const k = f + '|' + b;
      pairs.set(k, (pairs.get(k) || 0) + 1);
      if (!selectorFor.has(k)) selectorFor.set(k, sel.trim().split(',')[0].slice(0, 90));
    }
  }
}

const GENERIC_FG = new Set(['foreground', 'descriptionForeground', 'disabledForeground', 'errorForeground', 'icon.foreground']);
const NOT_A_SURFACE = /Border$|border|[Oo]utline|^contrast|^focusBorder$|^charts\.|Stroke$|shadow|Shadow|^sash\.|Separator$|indicator/;
const NOT_TEXT = /Border$|border|[Oo]utline|^contrast|shadow|Shadow|Background$|background/;
const root = (k) => k.split('.')[0];

const out = [...pairs.entries()]
  .map(([k, n]) => { const [fg, bg] = k.split('|'); return { fg, bg, n, sel: selectorFor.get(k) }; })
  .filter(({ fg, bg }) => {
    if (NOT_A_SURFACE.test(bg)) return false;
    if (NOT_TEXT.test(fg)) return false;
    if (!/[Ff]oreground$|^foreground$/.test(fg)) return false;
    if (root(fg) === root(bg)) return true;
    return GENERIC_FG.has(fg) && /[Bb]ackground$/.test(bg);
  })
  .sort((a, b) => b.n - a.n);

fs.writeFileSync(path.join(HERE, 'render-pairs.json'), JSON.stringify(out, null, 2));
console.log(`stylesheets read: ${files.length}, CSS rules analysed: ${ruleCount}`);
console.log(`text/background pairs that share a rule: ${out.length}`);
console.log('\nfirst 12:');
for (const p of out.slice(0, 12)) console.log(`  ${p.fg}  on  ${p.bg}`);

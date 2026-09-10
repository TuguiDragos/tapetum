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

// What one declaration puts on screen. A plain value counts every key it names, gradients included.
// A color-mix of a key with transparent is that key at a share of its strength; a color-mix of 2
// keys is the dominant key as the surface with the other riding on it at its share. A mix that
// names something the registry cannot resolve, a local custom property, currentColor or a literal,
// is not measured, because nothing in a theme can change it.
const MIX = /^color-mix\(\s*in\s+srgb\s*,([^,]+),([^,]+)\)\s*(?:!important)?$/i;
const PART = /^\s*(?:var\(\s*(--vscode-[A-Za-z0-9-]+)\s*\)|(transparent))(?:\s+([\d.]+)%)?\s*$/;
const round = (x) => Math.round(x * 1000) / 1000;

function paints(value) {
  const m = MIX.exec(value.trim());
  if (!m) return outerVars(value).map((v) => ({ key: varToKey(v) }));
  const parts = [m[1], m[2]].map((p) => PART.exec(p)).map((q) => q && { key: q[1] ? varToKey(q[1]) : null, pct: q[3] === undefined ? null : Number(q[3]) });
  if (!parts.every(Boolean)) return [];
  const [a, b] = parts;
  const share = Math.max(0, Math.min(1, a.pct !== null ? a.pct / 100 : b.pct !== null ? 1 - b.pct / 100 : 0.5));
  const faded = (key, alpha) => (alpha <= 0 ? [] : alpha >= 1 ? [{ key }] : [{ key, alpha: round(alpha) }]);
  if (!a.key && !b.key) return [];
  if (!b.key) return faded(a.key, share);
  if (!a.key) return faded(b.key, 1 - share);
  if (a.key === b.key) return [{ key: a.key }];
  return share >= 0.5 ? [{ key: a.key, mix: { key: b.key, share: round(1 - share) } }] : [{ key: b.key, mix: { key: a.key, share: round(share) } }];
}

const pairs = new Map();
let ruleCount = 0;
const files = stylesheets();
for (const file of files) {
  const css = fs.readFileSync(file, 'utf8');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  ruleCount += rules.length;
  for (const [, sel, body] of rules) {
    const fgs = [], bgs = [];
    for (const m of body.matchAll(FG_PROP)) fgs.push(...paints(m[2]));
    for (const m of body.matchAll(BG_PROP)) bgs.push(...paints(m[3]));
    if (!fgs.length || !bgs.length) continue;
    const inRule = new Set();
    for (const f of fgs) for (const b of bgs) {
      if (f.key === b.key) continue;
      const k = JSON.stringify([f, b]);
      if (inRule.has(k)) continue;
      inRule.add(k);
      const seen = pairs.get(k);
      if (seen) { seen.n++; continue; }
      pairs.set(k, {
        fg: f.key, bg: b.key, n: 1, sel: sel.trim().split(',')[0].slice(0, 90),
        ...(f.alpha !== undefined && { fgAlpha: f.alpha }),
        ...(b.alpha !== undefined && { bgAlpha: b.alpha }),
        ...(f.mix && { fgMix: f.mix }),
        ...(b.mix && { bgMix: b.mix }),
      });
    }
  }
}

const GENERIC_FG = new Set(['foreground', 'descriptionForeground', 'disabledForeground', 'errorForeground', 'icon.foreground']);
const NOT_A_SURFACE = /Border$|border|[Oo]utline|^contrast|^focusBorder$|^charts\.|Stroke$|shadow|Shadow|^sash\.|Separator$|indicator/;
const NOT_TEXT = /Border$|border|[Oo]utline|^contrast|shadow|Shadow|Background$|background/;
const root = (k) => k.split('.')[0];

const out = [...pairs.values()]
  .filter(({ fg, bg }) => {
    if (NOT_A_SURFACE.test(bg)) return false;
    if (NOT_TEXT.test(fg)) return false;
    if (!/[Ff]oreground$|^foreground$/.test(fg)) return false;
    if (root(fg) === root(bg)) return true;
    return GENERIC_FG.has(fg) && /[Bb]ackground$/.test(bg);
  })
  .sort((a, b) => b.n - a.n);

fs.writeFileSync(path.join(HERE, 'render-pairs.json'), JSON.stringify(out, null, 2));
const blended = out.filter((p) => p.fgMix || p.bgMix).length;
const fadedOut = out.filter((p) => p.fgAlpha !== undefined || p.bgAlpha !== undefined).length;
console.log(`stylesheets read: ${files.length}, CSS rules analysed: ${ruleCount}`);
console.log(`text/background pairs that share a rule: ${out.length}, of which ${blended} blend 2 keys and ${fadedOut} paint a key at a share of its strength`);
console.log('\nfirst 12:');
for (const p of out.slice(0, 12)) console.log(`  ${p.fg}  on  ${p.bg}`);

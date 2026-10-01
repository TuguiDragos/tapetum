import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, toLab } from './color.mjs';
import { bundledExtensions } from './vscode-path.mjs';
import { accepted, FLOOR, surfacesFor, textOn } from './pairs.mjs';
import { syntaxFloor } from './scheme-kit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = bundledExtensions();
const REG = JSON.parse(fs.readFileSync(path.join(HERE, 'vscode-color-keys-full.json'), 'utf8'));
const PAIRS = JSON.parse(fs.readFileSync(path.join(HERE, 'render-pairs.json'), 'utf8'));
const ALL = REG.confirmedReal.filter((k) => !REG.deprecated.includes(k));

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');

const KIND = { 'vs-dark': 'dark', vs: 'light', 'hc-black': 'hcDark', 'hc-light': 'hcLight' };

// a theme with its includes resolved, as VS Code loads it
function resolve(file) {
  let colors = {}, tokenColors = [], name;
  for (let cur = file, seen = new Set(); cur && !seen.has(cur); ) {
    seen.add(cur);
    const j = JSON.parse(strip(fs.readFileSync(cur, 'utf8')));
    colors = { ...(j.colors || {}), ...colors };
    tokenColors = [...(j.tokenColors || []), ...tokenColors];
    name ??= j.name;
    cur = j.include ? path.join(path.dirname(cur), j.include) : null;
  }
  return { colors, tokenColors, name };
}

const skipped = [];
function loadOfficial() {
  const out = [];
  for (const ext of fs.readdirSync(EXT)) {
    const pj = path.join(EXT, ext, 'package.json');
    if (!fs.existsSync(pj)) continue;
    const man = JSON.parse(fs.readFileSync(pj, 'utf8'));
    const nlsFile = path.join(EXT, ext, 'package.nls.json');
    const nls = fs.existsSync(nlsFile) ? JSON.parse(fs.readFileSync(nlsFile, 'utf8')) : {};
    for (const e of man.contributes?.themes || []) {
      const t = resolve(path.join(EXT, ext, e.path));
      const label = /^%.*%$/.test(e.label || '') ? nls[e.label.slice(1, -1)] : e.label;
      if (!t.colors['editor.background']) { skipped.push(`${label || e.path}: no editor.background, even through its includes`); continue; }
      out.push({ name: label || t.name || path.basename(e.path, '.json'), file: path.basename(e.path), colors: t.colors, tokenColors: t.tokenColors, type: KIND[e.uiTheme] });
    }
  }
  return out;
}

function loadMine() {
  const pkg = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'package.json'), 'utf8'));
  return pkg.contributes.themes.map((e) => {
    const t = JSON.parse(fs.readFileSync(path.join(HERE, '..', e.path.slice(2)), 'utf8'));
    return { name: t.name, file: path.basename(e.path), colors: t.colors, tokenColors: t.tokenColors, type: t.type };
  });
}

const pid = (p) => JSON.stringify([p.fg, p.bg, p.fgAlpha, p.bgAlpha, p.fgMix, p.bgMix]);

function score(t, onlyPairs) {
  const c = t.colors;
  const covered = ALL.filter((k) => k in c).length;

  let checked = 0, failed = 0, worst = { c: 99, what: '' };
  for (const p of PAIRS) {
    if (accepted(p)) continue;
    if (onlyPairs && !onlyPairs.has(pid(p))) continue;
    if (!c[p.fg] || !c[p.bg]) continue;
    const floor = FLOOR(p.fg);
    for (const { resolved } of surfacesFor(t, p) || []) {
      const v = contrast(textOn(t, p, resolved), resolved);
      checked++;
      if (v < floor) failed++;
      if (v < worst.c) worst = { c: v, what: `${p.fg} on ${p.bg}` };
    }
  }

  const eb = c['editor.background'];
  let synChecked = 0, synFailed = 0, synWorst = 99;
  for (const r of t.tokenColors) {
    const fg = r.settings?.foreground;
    if (!fg || !/^#/.test(fg)) continue;
    const v = contrast(over(fg, eb), eb);
    synChecked++;
    if (v < synWorst) synWorst = v;
    if (v < syntaxFloor(r)) synFailed++;
  }

  const N = ['Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan'];
  let ansiSet = 0, ansiDup = 0, ansiInverted = 0, ansiLow = 0;
  const tb = c['terminal.background'] || eb;
  const seen = [];
  for (const n of N) {
    const base = c['terminal.ansi' + n], br = c['terminal.ansiBright' + n];
    if (!base) continue;
    ansiSet++;
    if (contrast(base, tb) < 3.0) ansiLow++;
    if (br && toLab(br)[0] <= toLab(base)[0]) ansiInverted++;
    for (const o of seen) if (deltaE(base, o) < 8) ansiDup++;
    seen.push(base);
  }

  return { covered, pct: Math.round(covered / ALL.length * 100), checked, failed, worst, synChecked, synFailed, synWorst, ansiSet, ansiDup, ansiInverted, ansiLow };
}

const official = loadOfficial();
const mine = loadMine();

const settable = (t) => new Set(PAIRS.filter((p) => t.colors[p.fg] && t.colors[p.bg]).map(pid));
const commonWith = (t) => {
  const a = settable(t);
  const b = settable(mine[0]);
  return new Set([...a].filter((x) => b.has(x)));
};

console.log('COMPARISON WITH THE THEMES MICROSOFT SHIPS');
console.log(`measured identically, with the same code, on the same ${PAIRS.length} pairs extracted from the CSS\n`);
const head = 'theme'.padEnd(28) + 'type'.padEnd(8) + 'keys'.padStart(4) + 'cover'.padStart(7) + 'pairs'.padStart(9) + 'fail'.padStart(6) + 'weakest'.padStart(11) + 'syntax fails'.padStart(15) + 'ANSI dupes'.padStart(14) + 'ANSI inverted'.padStart(16);
console.log(head);
console.log('-'.repeat(head.length));

const row = (t, s, mark) => `${mark}${t.name.slice(0, 25).padEnd(26)}${(t.type || '?').padEnd(8)}${String(Object.keys(t.colors).length).padStart(4)}${String(s.pct + '%').padStart(7)}${String(s.checked).padStart(9)}${String(s.failed).padStart(6)}${s.worst.c.toFixed(2).padStart(11)}${String(s.synFailed + '/' + s.synChecked).padStart(15)}${String(s.ansiDup).padStart(14)}${String(s.ansiInverted).padStart(16)}`;

for (const t of mine) console.log(row(t, score(t), '* '));
console.log();
for (const t of official.sort((a, b) => a.name.localeCompare(b.name))) console.log(row(t, score(t), '  '));
for (const why of skipped) console.log(`  not measured: ${why}`);

console.log('\n\nMEASURED ON THE COMMON SUBSET, that is only the pairs BOTH set');
console.log('  ' + 'official theme'.padEnd(28) + 'pairs'.padStart(7) + 'it fails'.padStart(10) + 'mine fail on average'.padStart(23));
console.log('-'.repeat(82));
for (const t of official.sort((a, b) => a.name.localeCompare(b.name))) {
  const common = commonWith(t);
  if (!common.size) { console.log('  ' + t.name.slice(0,25).padEnd(28) + '0'.padStart(7) + '   (sets no checkable pair)'); continue; }
  const theirs = score(t, common);
  const mineOnSame = mine.map((m) => score(m, common).failed);
  const avgMine = mineOnSame.reduce((a,b)=>a+b,0) / mineOnSame.length;
  console.log('  ' + t.name.slice(0,25).padEnd(28) + String(theirs.checked).padStart(7) + String(theirs.failed).padStart(10) + avgMine.toFixed(1).padStart(23));
}

const ms = mine.map((t) => score(t)), os = official.map((t) => score(t));
const avg = (a, f) => (a.reduce((s, x) => s + f(x), 0) / a.length);
console.log('\nAVERAGES');
console.log(`  coverage         mine ${avg(ms, (x) => x.pct).toFixed(0)}%   official ${avg(os, (x) => x.pct).toFixed(0)}%`);
console.log(`  pairs failed     mine ${avg(ms, (x) => x.failed).toFixed(1)}    official ${avg(os, (x) => x.failed).toFixed(1)}`);
console.log(`  syntax failed    mine ${avg(ms, (x) => x.synFailed).toFixed(1)}    official ${avg(os, (x) => x.synFailed).toFixed(1)}`);
console.log(`  ANSI dupes       mine ${avg(ms, (x) => x.ansiDup).toFixed(1)}    official ${avg(os, (x) => x.ansiDup).toFixed(1)}`);
console.log(`  ANSI inverted    mine ${avg(ms, (x) => x.ansiInverted).toFixed(1)}    official ${avg(os, (x) => x.ansiInverted).toFixed(1)}`);

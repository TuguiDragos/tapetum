import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, toLab, parse } from './color.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions';
const REG = JSON.parse(fs.readFileSync(path.join(HERE, 'vscode-color-keys.json'), 'utf8'));
const PAIRS = JSON.parse(fs.readFileSync(path.join(HERE, 'render-pairs.json'), 'utf8'));
const ALL = Object.values(REG.groups).flat();

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');

function loadOfficial() {
  const out = [];
  for (const ext of fs.readdirSync(EXT)) {
    const td = path.join(EXT, ext, 'themes');
    if (!fs.existsSync(td)) continue;
    for (const f of fs.readdirSync(td)) {
      if (!f.endsWith('.json') || f.includes('icon')) continue;
      try {
        const raw = JSON.parse(strip(fs.readFileSync(path.join(td, f), 'utf8')));
        if (!raw.colors || !raw.colors['editor.background']) continue;
        out.push({ name: raw.name || f.replace('.json', ''), file: f, colors: raw.colors, tokenColors: raw.tokenColors || [], type: raw.type });
      } catch (e) { /* include-based themes skipped */ }
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

const isTrans = (c) => parse(c).a < 1;
const SURF = ['editor.background', 'sideBar.background', 'panel.background', 'editorWidget.background',
  'titleBar.activeBackground', 'activityBar.background', 'editorGroupHeader.tabsBackground'];

const ACCEPTED = new Set(['descriptionForeground|badge.background']);

function score(t, onlyPairs) {
  const c = t.colors;
  const covered = ALL.filter((k) => k in c).length;

  let checked = 0, failed = 0, worst = { c: 99, what: '' };
  for (const p of PAIRS) {
    if (ACCEPTED.has(p.fg + '|' + p.bg)) continue;
    if (onlyPairs && !onlyPairs.has(p.fg + '|' + p.bg)) continue;
    const fg = c[p.fg], bg = c[p.bg];
    if (!fg || !bg) continue;
    const floor = /placeholder|inactive|ghost|disabled|dimmed/i.test(p.fg) ? 3.0
      : /description|comment/i.test(p.fg) ? 4.0 : 4.5;
    const surfaces = isTrans(bg)
      ? SURF.filter((s) => c[s] && !isTrans(c[s])).map((s) => over(bg, c[s]))
      : [bg];
    for (const s of surfaces) {
      const v = contrast(over(fg, s), s);
      checked++;
      if (v < floor) failed++;
      if (v < worst.c) worst = { c: v, what: `${p.fg} pe ${p.bg}` };
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
    if (v < 4.0) synFailed++;
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

const settable = (t) => new Set(PAIRS.filter((p) => t.colors[p.fg] && t.colors[p.bg]).map((p) => p.fg + '|' + p.bg));
const commonWith = (t) => {
  const a = settable(t);
  const b = settable(mine[0]);
  return new Set([...a].filter((x) => b.has(x)));
};

console.log('COMPARATIE CU TEMELE LIVRATE DE MICROSOFT');
console.log('masurate identic, cu acelasi cod, pe aceleasi 81 de perechi extrase din CSS\n');
const head = 'tema                        tip     chei   acop   perechi  pica  cel mai slab   sintaxa pica  ANSI dubluri  ANSI inversate';
console.log(head);
console.log('-'.repeat(head.length));

const row = (t, s, mark) => `${mark}${t.name.slice(0, 25).padEnd(26)}${(t.type || '?').padEnd(8)}${String(Object.keys(t.colors).length).padStart(4)}${String(s.pct + '%').padStart(7)}${String(s.checked).padStart(9)}${String(s.failed).padStart(6)}${s.worst.c.toFixed(2).padStart(11)}${String(s.synFailed + '/' + s.synChecked).padStart(15)}${String(s.ansiDup).padStart(14)}${String(s.ansiInverted).padStart(16)}`;

for (const t of mine) console.log(row(t, score(t), '* '));
console.log();
for (const t of official.sort((a, b) => a.name.localeCompare(b.name))) console.log(row(t, score(t), '  '));

console.log('\n\nMASURAT PE SUBSETUL COMUN, adica doar perechile pe care le seteaza AMBELE');
console.log('tema oficiala               perechi   ea pica   media mea pica pe aceleasi perechi');
console.log('-'.repeat(82));
for (const t of official.sort((a, b) => a.name.localeCompare(b.name))) {
  const common = commonWith(t);
  if (!common.size) { console.log('  ' + t.name.slice(0,25).padEnd(28) + '0'.padStart(7) + '   (nu seteaza nicio pereche verificabila)'); continue; }
  const theirs = score(t, common);
  const mineOnSame = mine.map((m) => score(m, common).failed);
  const avgMine = mineOnSame.reduce((a,b)=>a+b,0) / mineOnSame.length;
  console.log('  ' + t.name.slice(0,25).padEnd(28) + String(theirs.checked).padStart(7) + String(theirs.failed).padStart(10) + avgMine.toFixed(1).padStart(20));
}

const ms = mine.map((t) => score(t)), os = official.map((t) => score(t));
const avg = (a, f) => (a.reduce((s, x) => s + f(x), 0) / a.length);
console.log('\nMEDII');
console.log(`  acoperire        ale mele ${avg(ms, (x) => x.pct).toFixed(0)}%   oficiale ${avg(os, (x) => x.pct).toFixed(0)}%`);
console.log(`  perechi picate   ale mele ${avg(ms, (x) => x.failed).toFixed(1)}    oficiale ${avg(os, (x) => x.failed).toFixed(1)}`);
console.log(`  sintaxa picata   ale mele ${avg(ms, (x) => x.synFailed).toFixed(1)}    oficiale ${avg(os, (x) => x.synFailed).toFixed(1)}`);
console.log(`  ANSI dubluri     ale mele ${avg(ms, (x) => x.ansiDup).toFixed(1)}    oficiale ${avg(os, (x) => x.ansiDup).toFixed(1)}`);
console.log(`  ANSI inversate   ale mele ${avg(ms, (x) => x.ansiInverted).toFixed(1)}    oficiale ${avg(os, (x) => x.ansiInverted).toFixed(1)}`);

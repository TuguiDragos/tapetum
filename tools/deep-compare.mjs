import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, parse } from './color.mjs';
import { bundledExtensions } from './vscode-path.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const isAlpha = (c) => parse(c).a < 1;
const ANSI = ['Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan'];

const NOT_TEXT = /^(gauge|welcomePage\.progress|agentsVoice|chart|scmGraph|minimap|progressBar|editorError|editorWarning|editorInfo|editorHint|inlineEdit|editorMultiCursor)/;
const DIM_OK = /placeholder|inactive|disabled|dimmed|ghost|unnecessary|deemphasized|retired|ignored|deprecated/i;

function resolve(theme, dir) {
  const seen = new Set();
  let cur = theme, colors = {}, tokens = [];
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const j = JSON.parse(fs.readFileSync(cur, 'utf8'));
    colors = { ...(j.colors || {}), ...colors };
    tokens = [...(j.tokenColors || []), ...tokens];
    cur = j.include ? path.join(path.dirname(cur), j.include) : null;
  }
  return { colors, tokens };
}

function measure(name, colors, tokens) {
  const c = colors;
  const eb = c['editor.background'];
  if (!eb) return null;
  const r = { name, keys: Object.keys(c).length };

  let sibChecked = 0, sibFail = 0, sibWorst = 99;
  for (const k of Object.keys(c)) {
    if (!/(\.foreground|Foreground)$/.test(k) || NOT_TEXT.test(k) || DIM_OK.test(k)) continue;
    for (const cand of [k.replace(/(\.foreground|Foreground)$/, '.background'), k.replace(/(\.foreground|Foreground)$/, 'Background')]) {
      if (!(cand in c)) continue;
      const ground = isAlpha(c[cand]) ? over(c[cand], eb) : c[cand];
      const cr = contrast(over(c[k], ground), ground);
      sibChecked++;
      if (cr < sibWorst) sibWorst = cr;
      if (cr < 4.5) sibFail++;
    }
  }
  r.siblings = { checked: sibChecked, failed: sibFail, worst: sibChecked ? sibWorst : null };

  const tb = c['terminal.background'] || eb;
  const tsel = c['terminal.selectionBackground'] ? over(c['terminal.selectionBackground'], tb) : null;
  let aWorst = 99, aSel = 99, aSet = 0;
  for (const n of ANSI) for (const pre of ['terminal.ansi', 'terminal.ansiBright']) {
    const v = c[pre + n];
    if (!v) continue;
    aSet++;
    aWorst = Math.min(aWorst, contrast(v, tb));
    if (tsel) aSel = Math.min(aSel, contrast(v, tsel));
  }
  r.ansi = { set: aSet, onBg: aSet ? aWorst : null, onSel: tsel && aSet ? aSel : null };

  const br = [1, 2, 3, 4, 5, 6].map((i) => c[`editorBracketHighlight.foreground${i}`]).filter(Boolean);
  let bMin = 999;
  for (let i = 0; i < br.length; i++) for (let j = i + 1; j < br.length; j++) bMin = Math.min(bMin, deltaE(br[i], br[j]));
  r.brackets = { set: br.length, minDeltaE: br.length > 1 ? bMin : null };

  const sel = c['editor.selectionBackground'];
  const fmh = c['editor.findMatchHighlightBackground'];
  let stack = null;
  if (sel && fmh) {
    const ground = over(fmh, over(sel, eb));
    const roles = tokens.flatMap((t) => (t.settings && t.settings.foreground ? [t.settings.foreground] : []));
    if (roles.length) stack = Math.min(...roles.map((f) => contrast(over(f, ground), ground)));
  }
  r.stacked = stack;

  const ins = c['diffEditor.insertedTextBackground'], del = c['diffEditor.removedTextBackground'];
  r.diff = ins && del ? deltaE(over(ins, eb), over(del, eb)) : null;

  const gi = ['added', 'untracked', 'modified', 'stageModified', 'deleted', 'conflicting', 'renamed', 'submodule']
    .map((k) => c[`gitDecoration.${k}ResourceForeground`]);
  r.gitSet = gi.filter(Boolean).length;
  return r;
}

const rows = [];
for (const fam of (await import('./palettes.mjs')).FAMILIES) for (const v of ['dark', 'light']) {
  const p = path.join(ROOT, `themes/${fam.id}-${v}.json`);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  rows.push({ mine: true, ...measure(j.name, j.colors, j.tokenColors) });
}

const extDir = bundledExtensions();
for (const name of fs.readdirSync(extDir)) {
  const pj = path.join(extDir, name, 'package.json');
  if (!fs.existsSync(pj)) continue;
  let man;
  try { man = JSON.parse(fs.readFileSync(pj, 'utf8')); } catch { continue; }
  for (const t of man.contributes?.themes || []) {
    const file = path.join(extDir, name, t.path);
    if (!fs.existsSync(file)) continue;
    try {
      const { colors, tokens } = resolve(file, path.dirname(file));
      let label = t.label || path.basename(file);
    if (/^%.*%$/.test(label)) {
      const nls = path.join(extDir, name, 'package.nls.json');
      if (fs.existsSync(nls)) {
        try { label = JSON.parse(fs.readFileSync(nls, 'utf8'))[label.slice(1, -1)] || label; } catch { /* fara nls */ }
      }
    }
    const m = measure(label, colors, tokens);
      if (m) rows.push({ mine: false, ...m });
    } catch { /* tema nu se poate rezolva */ }
  }
}

const mine = rows.filter((r) => r.mine);
const off = rows.filter((r) => !r.mine);
const num = (v, d = 2) => (v === null || v === undefined || !isFinite(v) ? '  .' : v.toFixed(d));
console.log('COMPARATIE ADANCA CU TEMELE LIVRATE DE MICROSOFT');
console.log('aceleasi verificari, acelasi cod, doar pe chei de culoare\n');
console.log('tema                          chei  perechi  pica  cea mai slaba   ANSI  ANSI/sel  paranteze dE  stivuit  diff dE  git');
console.log('-'.repeat(120));
const line = (r) => r.name.padEnd(30) + String(r.keys).padStart(5) + String(r.siblings.checked).padStart(9)
  + String(r.siblings.failed).padStart(6) + num(r.siblings.worst).padStart(16) + num(r.ansi.onBg).padStart(7)
  + num(r.ansi.onSel).padStart(10) + num(r.brackets.minDeltaE, 1).padStart(14) + num(r.stacked).padStart(9)
  + num(r.diff, 1).padStart(9) + String(r.gitSet).padStart(5);
const agg = (list, f) => { const v = list.map(f).filter((x) => x !== null && x !== undefined && isFinite(x)); return v.length ? v : null; };
for (const r of off.sort((a, b) => a.name.localeCompare(b.name))) console.log(line(r));
console.log('-'.repeat(120));
console.log('ALE MELE, extreme peste toate cele 56');
const worstMine = { keys: Math.min(...mine.map((r) => r.keys)), sib: Math.min(...agg(mine, (r) => r.siblings.worst)),
  fail: Math.max(...mine.map((r) => r.siblings.failed)), ansi: Math.min(...agg(mine, (r) => r.ansi.onBg)),
  sel: Math.min(...agg(mine, (r) => r.ansi.onSel)), br: Math.min(...agg(mine, (r) => r.brackets.minDeltaE)),
  st: Math.min(...agg(mine, (r) => r.stacked)), diff: Math.min(...agg(mine, (r) => r.diff)) };
console.log('cel mai slab din 56'.padEnd(30) + String(worstMine.keys).padStart(5) + String(mine[0].siblings.checked).padStart(9)
  + String(worstMine.fail).padStart(6) + num(worstMine.sib).padStart(16) + num(worstMine.ansi).padStart(7)
  + num(worstMine.sel).padStart(10) + num(worstMine.br, 1).padStart(14) + num(worstMine.st).padStart(9)
  + num(worstMine.diff, 1).padStart(9) + '   10');
const oa = (f, agg2 = Math.min) => { const v = agg(off, f); return v ? agg2(...v) : null; };
console.log('cel mai slab dintre oficiale'.padEnd(30) + String(Math.min(...off.map((r) => r.keys))).padStart(5)
  + ''.padStart(9) + String(Math.max(...off.map((r) => r.siblings.failed))).padStart(6)
  + num(oa((r) => r.siblings.worst)).padStart(16) + num(oa((r) => r.ansi.onBg)).padStart(7)
  + num(oa((r) => r.ansi.onSel)).padStart(10) + num(oa((r) => r.brackets.minDeltaE), 1).padStart(14)
  + num(oa((r) => r.stacked)).padStart(9) + num(oa((r) => r.diff), 1).padStart(9)
  + String(Math.max(...off.map((r) => r.gitSet))).padStart(5));

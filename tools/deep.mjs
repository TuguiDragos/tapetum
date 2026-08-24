import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, parse, deuter, protan, relLum } from './color.mjs';
import { FAMILIES } from './palettes.mjs';
const VARIANT_KEYS = (f) => ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k]);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const load = (id, v) => JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${id}-${v}.json`), 'utf8'));
const isAlpha = (c) => parse(c).a < 1;
const ANSI = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'];

const OVERLAYS = ['editor.selectionBackground', 'editor.findMatchBackground', 'editor.findMatchHighlightBackground',
  'editor.wordHighlightBackground', 'editor.wordHighlightStrongBackground', 'editorBracketMatch.background',
  'editor.symbolHighlightBackground', 'editor.snippetTabstopHighlightBackground', 'diffEditor.insertedTextBackground',
  'diffEditor.removedTextBackground', 'editor.hoverHighlightBackground', 'editor.rangeHighlightBackground',
  'editor.selectionHighlightBackground', 'editor.lineHighlightBackground', 'merge.currentContentBackground'];

const GIT = ['modified', 'untracked', 'ignored', 'conflicting', 'deleted', 'added', 'renamed', 'stageModified',
  'stageDeleted', 'submodule'].map((k) => `gitDecoration.${k}ResourceForeground`);

const GIT_TWINS = [['added', 'untracked'], ['modified', 'stageModified'], ['deleted', 'stageDeleted']]
  .map(([a, b]) => `${a}/${b}`);

const NOT_TEXT = /^(gauge|welcomePage\.progress|agentsVoice|chart|scmGraph|minimap|progressBar|editorError|editorWarning|editorInfo|editorHint|inlineEdit|editorMultiCursor\.primary)/;
const DIM_OK = /placeholder|inactive|disabled|dimmed|ghost|unnecessary|deemphasized|retired|ignored|deprecated/i;

function analyse(fam, v) {
  const t = load(fam.id, v);
  const c = t.colors;
  const eb = c['editor.background'];
  const p = fam[v];
  const out = { label: t.name, findings: [] };
  const bad = (sev, msg) => out.findings.push({ sev, msg });

  const sem = Object.entries(t.semanticTokenColors || {})
    .map(([k, val]) => [k, typeof val === 'string' ? val : val && val.foreground])
    .filter(([, val]) => val);
  let semWorst = 99, semKey = '';
  for (const [k, val] of sem) {
    const cr = contrast(over(val, eb), eb);
    if (cr < semWorst) { semWorst = cr; semKey = k; }
    const floor = /comment|deprecated|unnecessary|documentation/i.test(k) ? 4.0 : 4.5;
    if (cr < floor) bad('semantic', `${k} la ${cr.toFixed(2)}, sub ${floor}`);
  }
  out.semantic = { count: sem.length, worst: semWorst, worstKey: semKey };

  const pairs = [];
  for (const k of Object.keys(c)) {
    if (!k.endsWith('Foreground') && !k.endsWith('.foreground')) continue;
    const base = k.replace(/(\.foreground|Foreground)$/, '');
    for (const cand of [`${base}.background`, `${base}Background`]) {
      if (!(cand in c) || NOT_TEXT.test(k) || DIM_OK.test(k)) continue;
      const bgv = c[cand];
      const ground = isAlpha(bgv) ? over(bgv, eb) : bgv;
      if (relLum(ground) === relLum(eb) && isAlpha(bgv) && parse(bgv).a < 0.04) continue;
      pairs.push({ fg: k, bg: cand, cr: contrast(over(c[k], ground), ground) });
    }
  }
  const sibFails = pairs.filter((x) => x.cr < 4.5 && !DIM_OK.test(x.fg) && !NOT_TEXT.test(x.fg));
  out.siblings = { checked: pairs.length, failed: sibFails.length, worst: pairs.length ? Math.min(...pairs.map((x) => x.cr)) : null };
  for (const f of sibFails) bad('pereche', `${f.fg} pe ${f.bg} la ${f.cr.toFixed(2)}`);

  let stackWorst = 99, stackAt = '';
  const sel = c['editor.selectionBackground'];
  const selFg = c['editor.selectionForeground'];
  for (const o of ['editor.wordHighlightStrongBackground', 'editor.findMatchHighlightBackground', 'editor.lineHighlightBackground']) {
    const ground = over(c[o], over(sel, eb));
    for (const r of ['keyword', 'func', 'string', 'type', 'number', 'tag']) {
      const cr = contrast(selFg && parse(selFg).a === 1 ? selFg : p[r], ground);
      if (cr < stackWorst) { stackWorst = cr; stackAt = `${r} peste selectie plus ${o.split('.').pop()}`; }
    }
  }
  out.stacked = { worst: stackWorst, at: stackAt };
  if (stackWorst < 1.5) bad('straturi', `${stackAt} la ${stackWorst.toFixed(2)}`);

  const tb = c['terminal.background'];
  const tsel = over(c['terminal.selectionBackground'], tb);
  let ansiWorst = 99, ansiWorstK = '', ansiSelWorst = 99, ansiSelK = '';
  for (const n of ANSI) for (const pre of ['terminal.ansi', 'terminal.ansiBright']) {
    const k = pre + n, val = c[k];
    const lightTheme = t.type === 'light' || t.type === 'hcLight';
    const skip = n === 'Black' || (n === 'White' && lightTheme);
    if (!skip) {
      const cr = contrast(val, tb);
      if (cr < ansiWorst) { ansiWorst = cr; ansiWorstK = k; }
      if (cr < 3.0) bad('terminal', `${k} la ${cr.toFixed(2)} pe fundalul terminalului`);
    }
    const crs = contrast(val, tsel);
    if (!skip && crs < ansiSelWorst) { ansiSelWorst = crs; ansiSelK = k; }
    if (!skip && crs < 2.2) bad('terminal', `${k} la ${crs.toFixed(2)} peste selectia din terminal`);
  }
  out.terminal = { worst: ansiWorst, worstKey: ansiWorstK, onSelection: ansiSelWorst, onSelectionKey: ansiSelK };

  const git = GIT.filter((k) => c[k]);
  const sb = c['sideBar.background'];
  let gitMin = 999, gitPair = '', gitCr = 99, gitCrK = '';
  for (let i = 0; i < git.length; i++) {
    const cr = contrast(over(c[git[i]], sb), sb);
    if (cr < gitCr) { gitCr = cr; gitCrK = git[i]; }
    for (let j = i + 1; j < git.length; j++) {
      const label = `${git[i].slice(14, -18)}/${git[j].slice(14, -18)}`;
      const twin = GIT_TWINS.includes(label) || GIT_TWINS.includes(label.split('/').reverse().join('/'));
      const d = deltaE(c[git[i]], c[git[j]]);
      if (!twin && d < gitMin) { gitMin = d; gitPair = label; }
    }
  }
  out.git = { count: git.length, minDeltaE: gitMin, pair: gitPair, worstContrast: gitCr, worstKey: gitCrK };
  if (gitMin < 6) bad('git', `${gitPair} la ${gitMin.toFixed(1)} dE`);
  if (gitCr < 3.5 && !DIM_OK.test(gitCrK)) bad('git', `${gitCrK} la ${gitCr.toFixed(2)} pe bara laterala`);

  const br = [1, 2, 3].map((i) => c[`editorBracketHighlight.foreground${i}`]);
  let brMin = 999, brPair = '', brCr = 99;
  for (let i = 0; i < 3; i++) {
    brCr = Math.min(brCr, contrast(br[i], eb));
    for (let j = i + 1; j < 3; j++) {
      const d = deltaE(br[i], br[j]);
      if (d < brMin) { brMin = d; brPair = `${i + 1}/${j + 1}`; }
    }
  }
  out.brackets = { minDeltaE: brMin, pair: brPair, worstContrast: brCr };
  if (brCr < 3.0) bad('paranteze', `nivelul cel mai slab la ${brCr.toFixed(2)}`);
  if (brMin < 5) bad('paranteze', `nivelurile ${brPair} la ${brMin.toFixed(1)} dE`);

  const mmBg = over(c['minimap.background'] || eb, eb);
  const MM = ['minimap.findMatchHighlight', 'minimap.selectionHighlight', 'minimap.errorHighlight',
    'minimap.warningHighlight', 'minimap.infoHighlight', 'minimapGutter.addedBackground',
    'minimapGutter.modifiedBackground', 'minimapGutter.deletedBackground'];
  let mmWorst = 99, mmKey = '';
  for (const k of MM) {
    if (!c[k]) continue;
    const cr = contrast(over(c[k], mmBg), mmBg);
    if (cr < mmWorst) { mmWorst = cr; mmKey = k; }
    if (cr < 1.5) bad('minimap', `${k} la ${cr.toFixed(2)}, invizibil`);
  }
  out.minimap = { worst: mmWorst, worstKey: mmKey };

  const insLine = over(c['diffEditor.insertedLineBackground'], eb);
  const delLine = over(c['diffEditor.removedLineBackground'], eb);
  const ins = over(c['diffEditor.insertedTextBackground'], insLine);
  const del = over(c['diffEditor.removedTextBackground'], delLine);
  const diffGrounds = [insLine, delLine, ins, del];
  const diffSyntax = ['keyword', 'func', 'string', 'type', 'number', 'tag'];
  const diffText = Math.min(...diffGrounds.flatMap((g) => diffSyntax.map((r) => contrast(p[r], g))));
  const diffComment = p.comment ? Math.min(...diffGrounds.map((g) => contrast(p.comment, g))) : 99;
  const diffMark = Math.min(deltaE(ins, insLine), deltaE(del, delLine));
  out.diff = { deltaE: deltaE(insLine, delLine), text: diffText, comment: diffComment, mark: diffMark };
  if (out.diff.deltaE < 2.5) bad('diff', `inserat si sters la ${out.diff.deltaE.toFixed(1)} dE`);
  if (diffText < 3.4) bad('diff', `sintaxa pe fundal de diff la ${diffText.toFixed(2)}`);
  if (diffComment < 3.19) bad('diff', `comentarii pe fundal de diff la ${diffComment.toFixed(2)}`);
  if (diffMark < 2) bad('diff', `cuvantul schimbat la ${diffMark.toFixed(1)} dE fata de linie`);

  const R = ['keyword', 'func', 'string', 'type', 'number', 'tag'];
  const sim = (fn) => {
    let m = 999, pair = '';
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
      const d = deltaE(fn(p[R[i]]), fn(p[R[j]]));
      if (d < m) { m = d; pair = `${R[i]}/${R[j]}`; }
    }
    return { min: m, pair };
  };
  out.cvd = { deuter: sim(deuter), protan: sim(protan) };

  let ovWorst = 99, ovKey = '';
  for (const o of OVERLAYS) {
    const g = over(c[o], eb);
    for (const r of R.concat(['comment'])) {
      const cr = contrast(p[r], g);
      if (cr < ovWorst) { ovWorst = cr; ovKey = `${r}/${o.split('.').pop()}`; }
    }
  }
  out.overlay = { worst: ovWorst, at: ovKey };

  const rules = t.tokenColors.filter((r) => r.settings.foreground);
  let tmWorst = 99, tmKey = '';
  for (const r of rules) {
    const cr = contrast(over(r.settings.foreground, eb), eb);
    if (cr < tmWorst) { tmWorst = cr; tmKey = r.name; }
  }
  out.textmate = { rules: rules.length, worst: tmWorst, worstKey: tmKey };

  const syntaxCr = R.map((r) => contrast(p[r], p.bg));
  out.syntax = { min: Math.min(...syntaxCr), mean: syntaxCr.reduce((a, b) => a + b) / 6 };
  let sMin = 999;
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) sMin = Math.min(sMin, deltaE(p[R[i]], p[R[j]]));
  out.syntax.separation = sMin;

  const opaque = Object.entries(c).filter(([, val]) => !isAlpha(val));
  const seen = new Map();
  for (const [k, val] of opaque) { const key = val.toLowerCase(); seen.set(key, (seen.get(key) || 0) + 1); }
  out.distinctOpaque = seen.size;

  return out;
}

const rows = [];
for (const fam of FAMILIES) for (const v of VARIANT_KEYS(fam)) rows.push(analyse(fam, v));

const detail = process.argv.includes('--detail');
console.log('AUDIT ADANC, fiecare tema in parte\n');
console.log('tema                        sintaxa   sep   TextMate  semantic  suprapus  stivuit  ANSI  ANSI/sel  git dE  paranteze  diff dE  minimap  daltonism  probleme');
console.log('-'.repeat(160));
let issues = 0;
for (const r of rows) {
  issues += r.findings.length;
  console.log(
    r.label.padEnd(28) +
    `${r.syntax.min.toFixed(2)}`.padStart(5) + `${r.syntax.separation.toFixed(1)}`.padStart(7) +
    `${r.textmate.worst.toFixed(2)}`.padStart(10) + `${r.semantic.worst.toFixed(2)}`.padStart(10) +
    `${r.overlay.worst.toFixed(2)}`.padStart(10) + `${r.stacked.worst.toFixed(2)}`.padStart(9) +
    `${r.terminal.worst.toFixed(2)}`.padStart(6) + `${r.terminal.onSelection.toFixed(2)}`.padStart(10) +
    `${r.git.minDeltaE.toFixed(1)}`.padStart(8) + `${r.brackets.minDeltaE.toFixed(1)}`.padStart(11) +
    `${r.diff.deltaE.toFixed(1)}`.padStart(9) + `${r.minimap.worst.toFixed(2)}`.padStart(9) +
    `${Math.min(r.cvd.deuter.min, r.cvd.protan.min).toFixed(1)}`.padStart(11) +
    `${r.findings.length || ''}`.padStart(10));
}
console.log('-'.repeat(160));
const agg = (fn) => Math.min(...rows.map(fn));
console.log(`minime pe tot pachetul: sintaxa ${agg((r) => r.syntax.min).toFixed(2)}, separare ${agg((r) => r.syntax.separation).toFixed(1)}, TextMate ${agg((r) => r.textmate.worst).toFixed(2)}, semantic ${agg((r) => r.semantic.worst).toFixed(2)}, suprapus ${agg((r) => r.overlay.worst).toFixed(2)}, stivuit ${agg((r) => r.stacked.worst).toFixed(2)}, ANSI ${agg((r) => r.terminal.worst).toFixed(2)}, git ${agg((r) => r.git.minDeltaE).toFixed(1)}, paranteze ${agg((r) => r.brackets.minDeltaE).toFixed(1)}, diff ${agg((r) => r.diff.deltaE).toFixed(1)}`);
console.log(`perechi frate verificate per tema: ${rows[0].siblings.checked}, reguli TextMate ${rows[0].textmate.rules}, selectori semantici ${rows[0].semantic.count}`);
if (issues || detail) {
  for (const r of rows) {
    if (!r.findings.length) continue;
    console.log(`\n${r.label}  ${r.findings.length} probleme`);
    for (const f of r.findings) console.log(`   [${f.sev}] ${f.msg}`);
  }
}
console.log(issues ? `\nTOTAL ${issues} probleme` : '\nNICIO PROBLEMA IN AUDITUL ADANC');
process.exit(issues ? 1 : 0);

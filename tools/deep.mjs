import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, parse, deuter, protan, relLum, hex2lch } from './color.mjs';
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

const NOT_TEXT = /^(welcomePage\.progress|agentsVoice|chart|scmGraph|minimap|progressBar|editorError|editorWarning|editorInfo|editorHint|inlineEdit|editorMultiCursor\.primary)/;
const DIM_OK = /placeholder|inactive|disabled|dimmed|ghost|unnecessary|deemphasized|retired|ignored|deprecated/i;

const STATUS_HUE = { error: 25, warn: 75, ok: 140, info: 265 };
const ANSI_HUE = { Red: 25, Yellow: 85, Green: 140, Cyan: 200, Blue: 265, Magenta: 335 };
const ANSI_EXEMPT = [
  { family: 'safelight', slot: 'Magenta', why: 'the darkroom has no magenta; the slot takes the salmon of the filter, as placed in the palette' },
];
const FOCUS_SURFACES = ['editor.background', 'sideBar.background', 'editorWidget.background', 'panel.background',
  'statusBar.background', 'titleBar.activeBackground'];
const PRESENCE = [
  ['editor.lineHighlightBackground', 'editor.background', 3.0],
  ['editor.inactiveLineHighlightBackground', 'editor.background', 2.0],
  ['tab.hoverBackground', 'editorGroupHeader.tabsBackground', 3.0],
  ['editorStickyScrollHover.background', 'editorStickyScroll.background', 3.0],
  ['terminalStickyScrollHover.background', 'terminalStickyScroll.background', 3.0],
  ...['editor.selectionBackground', 'editor.inactiveSelectionBackground', 'editor.selectionHighlightBackground',
    'editor.wordHighlightBackground', 'editor.wordHighlightStrongBackground', 'editor.wordHighlightTextBackground',
    'editor.findMatchBackground', 'editor.findMatchHighlightBackground', 'editor.findRangeHighlightBackground',
    'editor.hoverHighlightBackground', 'editor.rangeHighlightBackground', 'editor.symbolHighlightBackground',
    'editor.foldBackground', 'editorBracketMatch.background', 'editor.linkedEditingBackground',
    'editor.snippetTabstopHighlightBackground', 'editor.stackFrameHighlightBackground',
    'editor.focusedStackFrameHighlightBackground', 'toolbar.hoverBackground'].map((k) => [k, 'editor.background', 2.0]),
  ...['list.hoverBackground', 'list.activeSelectionBackground', 'list.inactiveSelectionBackground', 'list.focusBackground']
    .map((k) => [k, 'sideBar.background', 2.0]),
  ['statusBarItem.hoverBackground', 'statusBar.background', 2.0],
  ['menu.selectionBackground', 'menu.background', 2.0],
  ['editorSuggestWidget.selectedBackground', 'editorSuggestWidget.background', 2.0],
  ['quickInputList.focusBackground', 'quickInput.background', 2.0],
  ['terminal.selectionBackground', 'terminal.background', 2.0],
  ['terminal.inactiveSelectionBackground', 'terminal.background', 2.0],
  ['peekViewResult.selectionBackground', 'peekViewResult.background', 2.0],
];
const COMMENT_GLYPHS = ['editorGutter.commentGlyphForeground', 'editorGutter.commentUnresolvedGlyphForeground',
  'editorGutter.commentDraftGlyphForeground'];
const FORK_PAIRS = [
  ['descriptionForeground', 'editor.inactiveSelectionBackground', 4.0],
  ['editor.selectionForeground', 'editor.inactiveSelectionBackground', 4.5],
  ['list.focusHighlightForeground', 'list.filterMatchBackground', 4.5],
  ['editor.findMatchForeground', 'editor.findMatchBackground', 4.5],
];
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function analyse(fam, v) {
  const t = load(fam.id, v);
  const c = t.colors;
  const eb = c['editor.background'];
  const p = fam[v];
  const out = { label: t.name, findings: [] };
  const bad = (sev, msg) => out.findings.push({ sev, msg });
  const hc = t.type === 'hcDark' || t.type === 'hcLight';

  const sem = Object.entries(t.semanticTokenColors || {})
    .map(([k, val]) => [k, typeof val === 'string' ? val : val && val.foreground])
    .filter(([, val]) => val);
  let semWorst = 99, semKey = '';
  for (const [k, val] of sem) {
    const cr = contrast(over(val, eb), eb);
    if (cr < semWorst) { semWorst = cr; semKey = k; }
    const floor = /comment|deprecated|unnecessary|documentation/i.test(k) ? 4.0 : 4.5;
    if (cr < floor) bad('semantic', `${k} at ${cr.toFixed(2)}, under ${floor}`);
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
  for (const f of sibFails) bad('pair', `${f.fg} on ${f.bg} at ${f.cr.toFixed(2)}`);

  let stackWorst = 99, stackAt = '';
  const sel = c['editor.selectionBackground'];
  const selFg = c['editor.selectionForeground'];
  for (const o of ['editor.wordHighlightStrongBackground', 'editor.findMatchHighlightBackground', 'editor.lineHighlightBackground']) {
    const ground = over(c[o], over(sel, eb));
    for (const r of ['keyword', 'func', 'string', 'type', 'number', 'tag']) {
      const cr = contrast(hc && selFg && parse(selFg).a === 1 ? selFg : p[r], ground);
      if (cr < stackWorst) { stackWorst = cr; stackAt = `${r} over the selection plus ${o.split('.').pop()}`; }
    }
  }
  out.stacked = { worst: stackWorst, at: stackAt };
  if (stackWorst < 1.5) bad('layers', `${stackAt} at ${stackWorst.toFixed(2)}`);

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
      if (cr < 3.0) bad('terminal', `${k} at ${cr.toFixed(2)} on the terminal background`);
    }
    const crs = contrast(val, tsel);
    if (!skip && crs < ansiSelWorst) { ansiSelWorst = crs; ansiSelK = k; }
    if (!skip && crs < 2.2) bad('terminal', `${k} at ${crs.toFixed(2)} over the terminal selection`);
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
  if (gitMin < 6) bad('git', `${gitPair} at ${gitMin.toFixed(1)} dE`);
  if (gitCr < 3.5 && !DIM_OK.test(gitCrK)) bad('git', `${gitCrK} at ${gitCr.toFixed(2)} on the side bar`);

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
  if (brCr < 3.0) bad('brackets', `weakest level at ${brCr.toFixed(2)}`);
  if (brMin < 5) bad('brackets', `levels ${brPair} at ${brMin.toFixed(1)} dE`);

  const mmBg = over(c['minimap.background'] || eb, eb);
  const MM = ['minimap.findMatchHighlight', 'minimap.selectionHighlight', 'minimap.errorHighlight',
    'minimap.warningHighlight', 'minimap.infoHighlight', 'minimapGutter.addedBackground',
    'minimapGutter.modifiedBackground', 'minimapGutter.deletedBackground'];
  let mmWorst = 99, mmKey = '';
  for (const k of MM) {
    if (!c[k]) continue;
    const cr = contrast(over(c[k], mmBg), mmBg);
    if (cr < mmWorst) { mmWorst = cr; mmKey = k; }
    if (cr < 1.5) bad('minimap', `${k} at ${cr.toFixed(2)}, invisible`);
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
  const curContent = over(c['merge.currentContentBackground'], eb);
  const incContent = over(c['merge.incomingContentBackground'], eb);
  const curHeader = over(c['merge.currentHeaderBackground'], eb);
  const incHeader = over(c['merge.incomingHeaderBackground'], eb);
  const mergeGrounds = [curContent, incContent, curHeader, incHeader];
  const mergeText = Math.min(...mergeGrounds.flatMap((g) => diffSyntax.concat('comment').map((r) => contrast(p[r], g))));
  const mergeSplit = deltaE(curContent, incContent);
  const mergePresence = Math.min(deltaE(curContent, eb), deltaE(incContent, eb));
  out.merge = { split: mergeSplit, presence: mergePresence, text: mergeText };
  if (mergeText < 2.95) bad('conflict', `text at ${mergeText.toFixed(2)} over the conflict blocks`);
  if (mergePresence < 3) bad('conflict', `the blocks do not show on the background, ${mergePresence.toFixed(1)} dE`);
  if (mergeSplit < 3) bad('conflict', `current and incoming at ${mergeSplit.toFixed(1)} dE`);

  out.diff = { deltaE: deltaE(insLine, delLine), text: diffText, comment: diffComment, mark: diffMark };
  if (out.diff.deltaE < 2.5) bad('diff', `inserted and removed at ${out.diff.deltaE.toFixed(1)} dE`);
  if (diffText < 3.4) bad('diff', `syntax on a diff background at ${diffText.toFixed(2)}`);
  if (diffComment < 3.19) bad('diff', `comments on a diff background at ${diffComment.toFixed(2)}`);
  if (diffMark < 2) bad('diff', `the changed word at ${diffMark.toFixed(1)} dE from the line`);

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

  if (!p.status) {
    const status = { error: c['editorError.foreground'], warn: c['editorWarning.foreground'],
      ok: c['gitDecoration.addedResourceForeground'], info: c['editorInfo.foreground'] };
    for (const [role, target] of Object.entries(STATUS_HUE)) {
      const [, chroma, hue] = hex2lch(status[role]);
      if (chroma < 12) bad('status', `${role} (${status[role]}) is nearly grey, chroma ${chroma.toFixed(0)}`);
      else if (hueDist(hue, target) > 45) bad('status', `${role} (${status[role]}) is ${hueDist(hue, target).toFixed(0)} degrees from the expected hue`);
    }
  }
  for (const [name, target] of Object.entries(ANSI_HUE)) {
    if (ANSI_EXEMPT.some((e) => e.family === fam.id && e.slot === name)) continue;
    const val = c['terminal.ansi' + name];
    const [, chroma, hue] = hex2lch(val);
    if (chroma < 10) bad('terminal', `ansi${name} (${val}) is nearly grey, chroma ${chroma.toFixed(0)}`);
    else if (hueDist(hue, target) > 50) bad('terminal', `ansi${name} (${val}) is ${hueDist(hue, target).toFixed(0)} degrees from ${name.toLowerCase()}`);
  }
  for (const k of ['focusBorder', 'list.focusOutline']) for (const s of FOCUS_SURFACES) {
    const ground = isAlpha(c[s]) ? over(c[s], eb) : c[s];
    const cr = contrast(over(c[k], ground), ground);
    if (cr < 3) bad('focus', `${k} on ${s} at ${cr.toFixed(2)}, under 3:1`);
  }
  if (!hc) for (const [k, groundKey, min] of PRESENCE) {
    const ground = isAlpha(c[groundKey]) ? over(c[groundKey], eb) : c[groundKey];
    const d = deltaE(over(c[k], ground), ground);
    if (d < min) bad('presence', `${k} at ${d.toFixed(2)} dE from ${groundKey}, under ${min}`);
  }
  for (const [fgKey, washKey, floor] of FORK_PAIRS) for (const s of FOCUS_SURFACES) {
    const surface = isAlpha(c[s]) ? over(c[s], eb) : c[s];
    const ground = over(c[washKey], surface);
    const cr = contrast(over(c[fgKey], ground), ground);
    if (cr < floor) bad('pair', `${fgKey} on ${washKey} over ${s} at ${cr.toFixed(2)}, under ${floor}`);
  }
  for (const k of COMMENT_GLYPHS) {
    const strip = c['editorGutter.commentRangeForeground'];
    const cr = contrast(over(c[k], strip), strip);
    if (cr < 4.5) bad('pair', `${k} on editorGutter.commentRangeForeground at ${cr.toFixed(2)}`);
  }
  const palette = [...R.map((r) => p[r]), p.accent, ...(p.status ? Object.values(p.status) : []), ...Object.values(p.ansi), ...(p.depth || [])]
    .filter(Boolean);
  const hues = palette.filter((x) => hex2lch(x)[1] > 12).map((x) => hex2lch(x)[2]);
  for (const [k, val] of Object.entries(c)) {
    if (isAlpha(val) || hex2lch(val)[1] <= 18) continue;
    const near = Math.min(...hues.map((h) => hueDist(h, hex2lch(val)[2])));
    if (near > 30) bad('foreign', `${k} = ${val} is ${near.toFixed(0)} degrees from every hue in the palette`);
  }

  const opaque = Object.entries(c).filter(([, val]) => !isAlpha(val));
  const seen = new Map();
  for (const [k, val] of opaque) { const key = val.toLowerCase(); seen.set(key, (seen.get(key) || 0) + 1); }
  out.distinctOpaque = seen.size;

  return out;
}

const rows = [];
for (const fam of FAMILIES) for (const v of VARIANT_KEYS(fam)) rows.push(analyse(fam, v));

const detail = process.argv.includes('--detail');
console.log('DEEP AUDIT, every theme on its own\n');
console.log('theme'.padEnd(27) + 'syntax'.padStart(6) + 'sep'.padStart(7) + 'TextMate'.padStart(10) + 'semantic'.padStart(10) + 'overlay'.padStart(10) + 'stacked'.padStart(9) + 'ANSI'.padStart(6) + 'ANSI/sel'.padStart(10) + 'git dE'.padStart(8) + 'brackets'.padStart(11) + 'diff dE'.padStart(9) + 'minimap'.padStart(9) + 'cvd'.padStart(11) + 'issues'.padStart(10));
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
console.log(`minimums across the package: syntax ${agg((r) => r.syntax.min).toFixed(2)}, separation ${agg((r) => r.syntax.separation).toFixed(1)}, TextMate ${agg((r) => r.textmate.worst).toFixed(2)}, semantic ${agg((r) => r.semantic.worst).toFixed(2)}, overlay ${agg((r) => r.overlay.worst).toFixed(2)}, stacked ${agg((r) => r.stacked.worst).toFixed(2)}, ANSI ${agg((r) => r.terminal.worst).toFixed(2)}, git ${agg((r) => r.git.minDeltaE).toFixed(1)}, brackets ${agg((r) => r.brackets.minDeltaE).toFixed(1)}, diff ${agg((r) => r.diff.deltaE).toFixed(1)}`);
console.log(`sibling pairs checked per theme: ${rows[0].siblings.checked}, TextMate rules ${rows[0].textmate.rules}, semantic selectors ${rows[0].semantic.count}`);
if (issues || detail) {
  for (const r of rows) {
    if (!r.findings.length) continue;
    console.log(`\n${r.label}  ${r.findings.length} problems`);
    for (const f of r.findings) console.log(`   [${f.sev}] ${f.msg}`);
  }
}
console.log(issues ? `\nTOTAL ${issues} problems` : '\nNO PROBLEM IN THE DEEP AUDIT');
process.exit(issues ? 1 : 0);

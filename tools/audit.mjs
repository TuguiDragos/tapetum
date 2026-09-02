import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, parse } from './color.mjs';
import { FAMILIES } from './palettes.mjs';
import { KEPT_DEPRECATED } from './deprecated.mjs';
import { FORK_KEYS } from './forks.mjs';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const REG = JSON.parse(fs.readFileSync(path.join(HERE, 'vscode-color-keys-full.json'), 'utf8'));
const DEPRECATED = new Set(REG.deprecated);
const KEPT = new Map(KEPT_DEPRECATED.map((k) => [k.key, k]));
const ALL_KEYS = REG.confirmedReal.filter((k) => !DEPRECATED.has(k));
const REAL = new Set(REG.confirmedReal);
const FORK = new Set(FORK_KEYS.map((k) => k.key));

const fail = [];
const note = (ok, msg) => { if (!ok) fail.push(msg); };
const R = ['keyword', 'func', 'string', 'type', 'number', 'tag'];

const declared = pkg.contributes.themes;
const onDisk = fs.readdirSync(path.join(ROOT, 'themes')).filter((f) => f.endsWith('.json'));

const expectedThemes = FAMILIES.reduce((n, f) => n + ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k]).length, 0);
note(declared.length === expectedThemes, `the manifest has ${declared.length} themes, the palettes give ${expectedThemes}`);
const hc = declared.filter((t) => t.uiTheme.startsWith('hc'));
note(hc.length > 0, 'no high contrast variant');
note(onDisk.length === declared.length, `${onDisk.length} files on disk, ${declared.length} declared`);

const paths = new Set(declared.map((t) => t.path.replace('./themes/', '')));
for (const f of onDisk) note(paths.has(f), `orphan file on disk: ${f}`);
for (const t of declared) note(onDisk.includes(t.path.replace('./themes/', '')), `declared but missing: ${t.path}`);

const labels = new Set();
for (const t of declared) {
  note(!labels.has(t.label), `duplicate label: ${t.label}`);
  labels.add(t.label);
}

const bodies = new Map();
const stats = [];
for (const t of declared) {
  const raw = fs.readFileSync(path.join(ROOT, t.path.slice(2)), 'utf8');
  const th = JSON.parse(raw);
  note(th.name === t.label, `${t.label}: name is "${th.name}"`);
  const EXPECT = { 'vs-dark': 'dark', vs: 'light', 'hc-black': 'hcDark', 'hc-light': 'hcLight' };
  note(th.type === EXPECT[t.uiTheme], `${t.label}: type ${th.type} does not match uiTheme ${t.uiTheme}`);
  note(th.semanticHighlighting === true, `${t.label}: semanticHighlighting is not on`);
  note(th.$schema === 'vscode://schemas/color-theme', `${t.label}: $schema is missing`);
  const missing = ALL_KEYS.filter((k) => !(k in th.colors));
  note(missing.length === 0, `${t.label}: ${missing.length} missing keys`);
  const dead = Object.keys(th.colors).filter((k) => !REAL.has(k) && !FORK.has(k));
  for (const k of FORK) note(k in th.colors, `${t.label}: ${k} is missing`);
  note(dead.length === 0, `${t.label}: ${dead.length} dead keys: ${dead.slice(0, 3).join(', ')}`);
  const stale = Object.keys(th.colors).filter((k) => DEPRECATED.has(k) && !KEPT.has(k));
  note(stale.length === 0, `${t.label}: ${stale.length} deprecated keys set: ${stale.slice(0, 3).join(', ')}`);
  for (const [key, k] of KEPT) note(th.colors[key] !== undefined && th.colors[key] === th.colors[k.replacement],
    `${t.label}: ${key} must be set and equal to ${k.replacement} while it is kept`);
  for (const [k, v] of Object.entries(th.colors)) {
    note(typeof v === 'string' && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v), `${t.label}: invalid colour ${k}=${v}`);
  }
  const key = JSON.stringify(th.colors) + JSON.stringify(th.tokenColors);
  if (bodies.has(key)) fail.push(`${t.label} is identical to ${bodies.get(key)}`);
  bodies.set(key, t.label);
  note(th.tokenColors.length >= 20, `${t.label}: only ${th.tokenColors.length} TextMate rules`);
  note(Object.keys(th.semanticTokenColors).length >= 25, `${t.label}: only ${Object.keys(th.semanticTokenColors).length} semantic selectors`);
  stats.push({ label: t.label, keys: Object.keys(th.colors).length, rules: th.tokenColors.length,
    sem: Object.keys(th.semanticTokenColors).length });
}

const schemes = {};
for (const f of FAMILIES) (schemes[f.scheme || 'grammar'] ||= []).push(f.label);
const ruleCounts = {};
for (const f of FAMILIES) {
  const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-dark.json`), 'utf8'));
  const s = f.scheme || 'grammar';
  if (ruleCounts[s] === undefined) ruleCounts[s] = th.tokenColors.length;
  else note(ruleCounts[s] === th.tokenColors.length, `${f.label}: scheme ${s} gives ${th.tokenColors.length} rules, another family gives ${ruleCounts[s]}`);
}
const shape = {};
for (const f of FAMILIES) {
  const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-dark.json`), 'utf8'));
  const s = f.scheme || 'grammar';
  const sig = th.tokenColors.map((r) => `${r.name}|${r.settings.fontStyle || ''}`).join(';');
  if (shape[s] === undefined) shape[s] = { sig, from: f.label };
  else note(shape[s].sig === sig, `${f.label}: scheme ${s} does not match ${shape[s].from}`);
}
const sigs = Object.entries(shape).map(([k, v]) => [k, v.sig]);
for (let i = 0; i < sigs.length; i++) for (let j = i + 1; j < sigs.length; j++)
  note(sigs[i][1] !== sigs[j][1], `schemes ${sigs[i][0]} and ${sigs[j][0]} produce identical rules`);

for (const f of FAMILIES) {
  for (const v of ['dark', 'light']) {
    const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-${v}.json`), 'utf8'));
    const p = f[v];
    const wantAccent = (p.accent || p.keyword).toLowerCase();
    note(th.colors['editorCursor.foreground'].toLowerCase() === wantAccent,
      `${f.label} ${v}: the accent was not applied`);
    const d = [1, 2, 3, 4, 5, 6].map((i) => th.colors['editorBracketHighlight.foreground' + i].toLowerCase());
    if (p.depth) note(JSON.stringify(d.slice(0, 3)) === JSON.stringify(p.depth.slice(0, 3).map((c) => c.toLowerCase())),
      `${f.label} ${v}: the declared depth ramp was not applied`);
    note(new Set(d).size === 3, `${f.label} ${v}: brackets do not have exactly 3 distinct colours`);
    note(d[0] === d[3] && d[1] === d[4] && d[2] === d[5], `${f.label} ${v}: brackets do not cycle after 3`);
    if (p.status) {
      note(th.colors['gitDecoration.deletedResourceForeground'].toLowerCase() === p.status.error.toLowerCase(),
        `${f.label} ${v}: the explicit status was not applied`);
    }
  }
}

const { deltaE: dE, hex2lch } = await import('./color.mjs');
for (const f of FAMILIES) for (const v of ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k])) {
  const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-${v}.json`), 'utf8'));
  const c = th.colors;
  const seam = dE(c['panel.background'], c['terminal.background']);
  note(seam < 1, `${f.label} ${v}: the terminal has a different background from the panel, ${seam.toFixed(1)} dE. `
    + 'VS Code registers terminal.background with a null default, that is the panel background, '
    + 'and the Microsoft themes set the two equal. Different, a step shows under the row of tabs.');
}

for (const f of FAMILIES) for (const v of ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k])) {
  const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-${v}.json`), 'utf8'));
  const c = th.colors;
  const label = c['scmGraph.historyItemHoverLabelForeground'];
  const refs = ['historyItemRefColor', 'historyItemRemoteRefColor', 'historyItemBaseRefColor'].map((k) => c['scmGraph.' + k]);
  refs.forEach((r, i) => {
    const cr = contrast(label, r);
    note(cr >= 4.5, `${f.label} ${v}: branch pill ${i + 1} has text at ${cr.toFixed(2)}. `
      + 'VS Code draws refColor as the background and writes historyItemHoverLabelForeground over it.');
  });
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const d = dE(refs[i], refs[j]);
    note(d >= 12, `${f.label} ${v}: two branch pills at ${d.toFixed(1)} dE, indistinguishable`);
  }
  const rb = c['statusBarItem.remoteBackground'];
  const [, chroma, hue] = hex2lch(rb);
  const green = chroma > 18 && hue > 95 && hue < 175;
  const red = chroma > 18 && (hue < 35 || hue > 345);
  note(!green && !red, `${f.label} ${v}: the remote indicator is ${green ? 'green' : 'red'}, ${rb}. `
    + 'The label also says Disconnected, so the colour may not claim success or error.');
}

const FILLED = ['button.background', 'button.hoverBackground', 'badge.background', 'activityBarBadge.background',
  'profileBadge.background', 'extensionButton.background', 'extensionButton.prominentBackground',
  'extensionBadge.remoteBackground', 'agentsNewSessionButton.background', 'agentsBadge.background',
  'panelTitleBadge.background', 'testing.coverCountBadgeBackground'];
const FILL_CEILING = 45;
for (const f of FAMILIES) for (const v of ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k])) {
  const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-${v}.json`), 'utf8'));
  const c = th.colors;
  for (const k of FILLED) {
    const [, chroma] = hex2lch(c[k]);
    note(chroma <= FILL_CEILING + 1, `${f.label} ${v}: ${k} has chroma ${chroma.toFixed(0)}, over the ceiling of ${FILL_CEILING}. `
      + 'On a filled surface noise grows with area, and the raw accent turns from identity into an alarm.');
  }
}

const OVER = ['editor.selectionBackground', 'editor.findMatchBackground', 'editor.wordHighlightStrongBackground',
  'editorBracketMatch.background', 'editor.snippetTabstopHighlightBackground'];
let worstOverlay = { c: 99 };
for (const f of FAMILIES) for (const v of ['dark', 'light']) {
  const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-${v}.json`), 'utf8'));
  const eb = th.colors['editor.background'];
  for (const o of OVER) {
    const g = over(th.colors[o], eb);
    for (const r of R) {
      const c = contrast(f[v][r], g);
      if (c < worstOverlay.c) worstOverlay = { c, n: `${f.label} ${v} ${r} over ${o}` };
    }
  }
}

let worstPair = { d: 99 };
for (const v of ['dark', 'light']) for (let i = 0; i < FAMILIES.length; i++) for (let j = i + 1; j < FAMILIES.length; j++) {
  const d = R.reduce((s, r) => s + deltaE(FAMILIES[i][v][r], FAMILIES[j][v][r]), 0) / 6;
  if (d < worstPair.d) worstPair = { d, n: `${FAMILIES[i].label}/${FAMILIES[j].label} ${v}` };
}
let worstCr = { c: 99 };
for (const f of FAMILIES) for (const v of ['dark', 'light']) for (const r of R) {
  const c = contrast(f[v][r], f[v].bg);
  if (c < worstCr.c) worstCr = { c, n: `${f.label} ${v} ${r}` };
}


const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
note(changelog.includes(`## [${pkg.version}]`), `CHANGELOG has no entry for version ${pkg.version}`);
const versions = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1]);
note(versions[0] === pkg.version, `the first CHANGELOG entry is ${versions[0]}, the manifest says ${pkg.version}`);
for (const f of FAMILIES) note(changelog.includes(`**${f.label}**`), `CHANGELOG does not mention the ${f.label} family`);

const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
note(readme.includes(`&nbsp;${pkg.displayName}\n</h1>`), `the README title is not ${pkg.displayName}`);
const { SHOTS } = await import('./stories.mjs');
for (const f of FAMILIES) {
  note(readme.includes(`### ${f.label}\n`), `README has no section for ${f.label}`);
  note(readme.includes(`\`Tapetum ${f.label}\``), `README has no colour table for ${f.label}`);
  for (const v of SHOTS[f.id] || []) {
    const img = `tapetum-${f.id}-${v}.png`;
    note(readme.includes(img), `README does not show the screenshot ${img}`);
    note(fs.existsSync(path.join(ROOT, 'readme-assets', img)), `screenshot ${img} is missing`);
  }
}
for (const g of ['tapetum-all-themes-dark.gif', 'tapetum-all-themes-light.gif']) {
  note(readme.includes(g), `README does not include ${g}`);
  note(fs.existsSync(path.join(ROOT, 'readme-assets', g)), `${g} is missing`);
}
const gifPos = Math.min(readme.indexOf('tapetum-all-themes-dark.gif'), readme.indexOf('tapetum-all-themes-light.gif'));
const lastShot = readme.lastIndexOf('.png');
note(gifPos > lastShot, 'the gifs must come after every screenshot, so the page reads before they load');
note(!/-palette\.png/.test(readme), 'README still refers to the palette strips');
note(!fs.readdirSync(path.join(ROOT, 'readme-assets')).some((f) => f.includes('-palette.')), 'palette strips are still on disk');
note(readme.includes(`${declared.length} themes`), `README does not say ${declared.length} themes`);
note(readme.includes(`${FAMILIES.length} families`) || readme.includes(`All ${FAMILIES.length} families`),
  `README does not say ${FAMILIES.length} families`);
note(readme.includes(`all ${ALL_KEYS.length} colour keys`), `README does not say all ${ALL_KEYS.length} colour keys`);
const lowestAnywhere = Math.min(...FAMILIES.flatMap((f) => ['dark', 'light', 'hcDark', 'hcLight']
  .filter((v) => f[v]).flatMap((v) => [...R, 'comment'].map((r) => contrast(f[v][r], f[v].bg))))).toFixed(2);
note(readme.includes(`the lowest value anywhere is ${lowestAnywhere}`),
  `README does not say the lowest value anywhere is ${lowestAnywhere}`);
note(!readme.includes('\u2014'), 'README contains an em dash');
note(!/^##?\s*License/m.test(readme), 'README has a licence section');
const imgs = [...readme.matchAll(/readme-assets\/([\w.-]+)/g)].map((m) => m[1]);
for (const i of new Set(imgs)) note(fs.existsSync(path.join(ROOT, 'readme-assets', i)), `README links to a missing image: ${i}`);
note(pkg.description.includes(`${declared.length} themes`), 'the manifest description does not say the right number of themes');
note(pkg.description.includes(`${FAMILIES.length} families`), 'the manifest description does not say the right number of families');


const { apcaLc } = await import('./color.mjs');
const { FLOOR: APCA_FLOOR, EXEMPT: APCA_EXEMPT } = await import('./apca-lift.mjs');
let apcaWorst = 99, apcaWorstAt = '', apcaBelow = 0;
for (const f of FAMILIES) for (const v of ['dark', 'light']) {
  const p = f[v];
  for (const [role, floor] of Object.entries(APCA_FLOOR)) {
    const lc = apcaLc(p[role], p.bg);
    if (lc < apcaWorst) { apcaWorst = lc; apcaWorstAt = `${f.label} ${v} ${role}`; }
    if (lc >= floor) continue;
    const ok = APCA_EXEMPT.some((e) => e.family === f.id && e.role === role);
    if (ok) continue;
    apcaBelow++;
    note(false, `${f.label} ${v}: ${role} at Lc ${lc.toFixed(1)}, under the APCA floor of ${floor}`);
  }
}

let semantic = 'skipped, VS Code is not installed here';
try {
  const { legend, coverage: semCoverage, DELIBERATE_MODIFIERS } = await import('./semantic-legend.mjs');
  const lg = legend();
  const perScheme = new Map();
  for (const f of FAMILIES) {
    const scheme = f.scheme || 'grammar';
    if (perScheme.has(scheme)) continue;
    const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-dark.json`), 'utf8'));
    const tm = new Set();
    for (const r of th.tokenColors) for (const x of [].concat(r.scope)) tm.add(x.trim());
    perScheme.set(scheme, semCoverage(th.semanticTokenColors, lg, tm));
  }
  const gaps = [];
  for (const [scheme, c] of perScheme) {
    if (c.types.none.length) gaps.push(`${scheme}: semantic types not covered ${c.types.none.join(', ')}`);
    for (const m of c.modifiers.standard.missing) {
      const ok = DELIBERATE_MODIFIERS.some((d) => d.modifier === m && d.schemes.includes(scheme));
      if (!ok) gaps.push(`${scheme}: standard modifier ${m} is not handled`);
    }
  }
  for (const g of gaps) note(false, g);
  semantic = `${perScheme.size} schemes checked, ${lg.std.types.length + lg.custom.types.size} types, ${lg.std.modifiers.length} standard modifiers`;
} catch { /* without VS Code the legend cannot be read */ }

let coverage = 'skipped, VS Code is not installed here';
try {
  const cov = execFileSync(process.execPath, [path.join(HERE, 'grammar-coverage.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const m = cov.match(/covered: \d+ \((\d+\.\d)%\)/);
  if (m) {
    coverage = `${m[1]}%`;
    note(parseFloat(m[1]) >= 98, `TextMate scope coverage dropped to ${m[1]}%`);
  }
} catch { /* without a local VS Code this check cannot run, which is not an error */ }

console.log(`families ${FAMILIES.length}, themes ${declared.length}, files ${onDisk.length}`);
console.log(`TextMate scope coverage: ${coverage}`);
console.log(`semantic legend: ${semantic}`);
console.log(`APCA: lowest Lc ${apcaWorst.toFixed(1)} at ${apcaWorstAt}, ${apcaBelow} roles under their floor outside the exemptions`);
console.log(`keys per theme ${[...new Set(stats.map((s) => s.keys))].join(', ')}`);
console.log(`schemes: ${Object.entries(schemes).map(([k, v]) => `${k} ${v.length}`).join(', ')}`);
console.log(`TextMate rules per scheme: ${Object.entries(ruleCounts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`lowest contrast on code              ${worstCr.c.toFixed(2)}  ${worstCr.n}`);
console.log(`weakest text over a selection        ${worstOverlay.c.toFixed(2)}  ${worstOverlay.n}`);
console.log(`closest pair of families             ${worstPair.d.toFixed(1)}  ${worstPair.n}`);
console.log(fail.length ? `\n${fail.length} PROBLEMS:\n` + fail.map((f) => '   ' + f).join('\n') : '\nSTRUCTURE CLEAN');
process.exit(fail.length ? 1 : 0);

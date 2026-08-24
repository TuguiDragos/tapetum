import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, parse } from './color.mjs';
import { FAMILIES } from './palettes.mjs';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const REG = JSON.parse(fs.readFileSync(path.join(HERE, 'vscode-color-keys-full.json'), 'utf8'));
const ALL_KEYS = REG.confirmedReal;
const SEEN = new Set(REG.seenAnywhere);

const fail = [];
const note = (ok, msg) => { if (!ok) fail.push(msg); };
const R = ['keyword', 'func', 'string', 'type', 'number', 'tag'];

const declared = pkg.contributes.themes;
const onDisk = fs.readdirSync(path.join(ROOT, 'themes')).filter((f) => f.endsWith('.json'));

const expectedThemes = FAMILIES.reduce((n, f) => n + ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k]).length, 0);
note(declared.length === expectedThemes, `manifest are ${declared.length} teme, paletele dau ${expectedThemes}`);
const hc = declared.filter((t) => t.uiTheme.startsWith('hc'));
note(hc.length > 0, 'nicio varianta high contrast');
note(onDisk.length === declared.length, `${onDisk.length} fisiere pe disc, ${declared.length} declarate`);

const paths = new Set(declared.map((t) => t.path.replace('./themes/', '')));
for (const f of onDisk) note(paths.has(f), `fisier orfan pe disc: ${f}`);
for (const t of declared) note(onDisk.includes(t.path.replace('./themes/', '')), `declarat dar lipsa: ${t.path}`);

const labels = new Set();
for (const t of declared) {
  note(!labels.has(t.label), `eticheta duplicata: ${t.label}`);
  labels.add(t.label);
}

const bodies = new Map();
const stats = [];
for (const t of declared) {
  const raw = fs.readFileSync(path.join(ROOT, t.path.slice(2)), 'utf8');
  const th = JSON.parse(raw);
  note(th.name === t.label, `${t.label}: name este "${th.name}"`);
  const EXPECT = { 'vs-dark': 'dark', vs: 'light', 'hc-black': 'hcDark', 'hc-light': 'hcLight' };
  note(th.type === EXPECT[t.uiTheme], `${t.label}: type ${th.type} nu se potriveste cu uiTheme ${t.uiTheme}`);
  note(th.semanticHighlighting === true, `${t.label}: semanticHighlighting nu e pornit`);
  note(th.$schema === 'vscode://schemas/color-theme', `${t.label}: lipseste $schema`);
  const missing = ALL_KEYS.filter((k) => !(k in th.colors));
  note(missing.length === 0, `${t.label}: ${missing.length} chei lipsa`);
  const dead = Object.keys(th.colors).filter((k) => !SEEN.has(k));
  note(dead.length === 0, `${t.label}: ${dead.length} chei moarte: ${dead.slice(0, 3).join(', ')}`);
  for (const [k, v] of Object.entries(th.colors)) {
    note(typeof v === 'string' && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v), `${t.label}: culoare invalida ${k}=${v}`);
  }
  const key = JSON.stringify(th.colors) + JSON.stringify(th.tokenColors);
  if (bodies.has(key)) fail.push(`${t.label} este identica cu ${bodies.get(key)}`);
  bodies.set(key, t.label);
  note(th.tokenColors.length >= 20, `${t.label}: doar ${th.tokenColors.length} reguli TextMate`);
  note(Object.keys(th.semanticTokenColors).length >= 25, `${t.label}: doar ${Object.keys(th.semanticTokenColors).length} selectori semantici`);
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
  else note(ruleCounts[s] === th.tokenColors.length, `${f.label}: schema ${s} da ${th.tokenColors.length} reguli, alta familie da ${ruleCounts[s]}`);
}
const shape = {};
for (const f of FAMILIES) {
  const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-dark.json`), 'utf8'));
  const s = f.scheme || 'grammar';
  const sig = th.tokenColors.map((r) => `${r.name}|${r.settings.fontStyle || ''}`).join(';');
  if (shape[s] === undefined) shape[s] = { sig, from: f.label };
  else note(shape[s].sig === sig, `${f.label}: schema ${s} nu se potriveste cu ${shape[s].from}`);
}
const sigs = Object.entries(shape).map(([k, v]) => [k, v.sig]);
for (let i = 0; i < sigs.length; i++) for (let j = i + 1; j < sigs.length; j++)
  note(sigs[i][1] !== sigs[j][1], `schemele ${sigs[i][0]} si ${sigs[j][0]} produc reguli identice`);

for (const f of FAMILIES) {
  for (const v of ['dark', 'light']) {
    const th = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${f.id}-${v}.json`), 'utf8'));
    const p = f[v];
    const wantAccent = (p.accent || p.keyword).toLowerCase();
    note(th.colors['editorCursor.foreground'].toLowerCase() === wantAccent,
      `${f.label} ${v}: accentul nu s-a aplicat`);
    const d = [1, 2, 3, 4, 5, 6].map((i) => th.colors['editorBracketHighlight.foreground' + i].toLowerCase());
    if (p.depth) note(JSON.stringify(d) === JSON.stringify(p.depth.map((c) => c.toLowerCase())),
      `${f.label} ${v}: rampa de adancime declarata nu s-a aplicat`);
    note(new Set(d).size === 6, `${f.label} ${v}: rampa de adancime are niveluri identice`);
    if (p.status) {
      note(th.colors['editorError.foreground'].toLowerCase() === p.status.error.toLowerCase(),
        `${f.label} ${v}: statusul explicit nu s-a aplicat`);
    }
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
      if (c < worstOverlay.c) worstOverlay = { c, n: `${f.label} ${v} ${r} peste ${o}` };
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
note(changelog.includes(`## [${pkg.version}]`), `CHANGELOG nu are intrare pentru versiunea ${pkg.version}`);
const versions = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1]);
note(versions[0] === pkg.version, `prima intrare din CHANGELOG este ${versions[0]}, manifestul spune ${pkg.version}`);
for (const f of FAMILIES) note(changelog.includes(`**${f.label}**`), `CHANGELOG nu mentioneaza familia ${f.label}`);

const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
note(readme.includes(`&nbsp;${pkg.displayName}\n</h1>`), `titlul din README nu e ${pkg.displayName}`);
const { SHOTS } = await import('./stories.mjs');
for (const f of FAMILIES) {
  note(readme.includes(`### ${f.label}\n`), `README nu are sectiune pentru ${f.label}`);
  note(readme.includes(`\`Tapetum ${f.label}\``), `README nu are tabelul de culori pentru ${f.label}`);
  for (const v of SHOTS[f.id] || []) {
    const img = `tapetum-${f.id}-${v}.png`;
    note(readme.includes(img), `README nu arata captura ${img}`);
    note(fs.existsSync(path.join(ROOT, 'readme-assets', img)), `lipseste captura ${img}`);
  }
}
for (const g of ['tapetum-all-themes-dark.gif', 'tapetum-all-themes-light.gif']) {
  note(readme.includes(g), `README nu include ${g}`);
  note(fs.existsSync(path.join(ROOT, 'readme-assets', g)), `lipseste ${g}`);
}
const gifPos = Math.min(readme.indexOf('tapetum-all-themes-dark.gif'), readme.indexOf('tapetum-all-themes-light.gif'));
const lastShot = readme.lastIndexOf('.png');
note(gifPos > lastShot, 'gif-urile trebuie sa fie dupa toate capturile, ca pagina sa se citeasca inainte sa se incarce');
note(!/-palette\.png/.test(readme), 'README mai are referinte la benzile de paleta');
note(!fs.readdirSync(path.join(ROOT, 'readme-assets')).some((f) => f.includes('-palette.')), 'au ramas benzi de paleta pe disc');
note(readme.includes(`${declared.length} themes`), `README nu spune ${declared.length} themes`);
note(readme.includes(`${FAMILIES.length} families`) || readme.includes(`All ${FAMILIES.length} families`),
  `README nu spune ${FAMILIES.length} families`);
note(!readme.includes('\u2014'), 'README contine linie lunga de dialog');
note(!/^##?\s*License/m.test(readme), 'README are sectiune de licenta');
const imgs = [...readme.matchAll(/readme-assets\/([\w.-]+)/g)].map((m) => m[1]);
for (const i of new Set(imgs)) note(fs.existsSync(path.join(ROOT, 'readme-assets', i)), `README trimite la poza lipsa: ${i}`);
note(pkg.description.includes(`${declared.length} themes`), 'descrierea din manifest nu spune numarul corect de teme');
note(pkg.description.includes(`${FAMILIES.length} families`), 'descrierea din manifest nu spune numarul corect de familii');


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
    note(false, `${f.label} ${v}: ${role} la Lc ${lc.toFixed(1)}, sub pragul APCA de ${floor}`);
  }
}

let semantic = 'sarita, VS Code nu e instalat aici';
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
    if (c.types.none.length) gaps.push(`${scheme}: tipuri semantice neacoperite ${c.types.none.join(', ')}`);
    for (const m of c.modifiers.standard.missing) {
      const ok = DELIBERATE_MODIFIERS.some((d) => d.modifier === m && d.schemes.includes(scheme));
      if (!ok) gaps.push(`${scheme}: modificatorul standard ${m} nu e tratat`);
    }
  }
  for (const g of gaps) note(false, g);
  semantic = `${perScheme.size} scheme verificate, ${lg.std.types.length + lg.custom.types.size} tipuri, ${lg.std.modifiers.length} modificatori standard`;
} catch { /* fara VS Code nu se poate citi legenda */ }

let coverage = 'sarita, VS Code nu e instalat aici';
try {
  const cov = execFileSync(process.execPath, [path.join(HERE, 'grammar-coverage.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const m = cov.match(/acoperite: \d+ \((\d+\.\d)%\)/);
  if (m) {
    coverage = `${m[1]}%`;
    note(parseFloat(m[1]) >= 98, `acoperirea de domenii TextMate a scazut la ${m[1]}%`);
  }
} catch { /* fara VS Code local verificarea nu se poate face, nu e o eroare */ }

console.log(`familii ${FAMILIES.length}, teme ${declared.length}, fisiere ${onDisk.length}`);
console.log(`acoperire de domenii TextMate: ${coverage}`);
console.log(`legenda semantica: ${semantic}`);
console.log(`APCA: cel mai mic Lc ${apcaWorst.toFixed(1)} la ${apcaWorstAt}, ${apcaBelow} roluri sub prag in afara scutirilor`);
console.log(`chei per tema ${[...new Set(stats.map((s) => s.keys))].join(', ')}`);
console.log(`scheme: ${Object.entries(schemes).map(([k, v]) => `${k} ${v.length}`).join(', ')}`);
console.log(`reguli TextMate per schema: ${Object.entries(ruleCounts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`cel mai mic contrast pe cod          ${worstCr.c.toFixed(2)}  ${worstCr.n}`);
console.log(`cel mai slab text peste selectie     ${worstOverlay.c.toFixed(2)}  ${worstOverlay.n}`);
console.log(`cea mai apropiata pereche de familii ${worstPair.d.toFixed(1)}  ${worstPair.n}`);
console.log(fail.length ? `\n${fail.length} PROBLEME:\n` + fail.map((f) => '   ' + f).join('\n') : '\nSTRUCTURA CURATA');
process.exit(fail.length ? 1 : 0);

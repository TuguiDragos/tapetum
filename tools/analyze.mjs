import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, toLab, parse } from './color.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
const REG = R('vscode-color-keys-full.json');
const PAIRS = R('render-pairs.json');
const DERIV = R('derivations.json');

const SEAM_PRONE = /[Bb]ackground$/;
const DELIBERATE = [
  { re: /^terminalSymbolIcon/, why: 'iconitele din sugestiile de terminal iau culoarea rolului de sintaxa echivalent, ca sa se potriveasca cu editorul' },
  { re: /^symbolIcon/, why: 'iconitele de simbol urmeaza aceleasi roluri ca sintaxa, nu culoarea implicita de prim plan' },
  { re: /^settings\.numberInput/, why: 'campul numeric primeste aceeasi suprafata ca restul campurilor, VS Code il lasa transparent' },
  { re: /^terminal\.tab/, why: 'taburile de terminal urmeaza culorile de stare ale temei' },
  { re: /^sideBarTitle/, why: 'titlul barei laterale e stins intentionat fata de continut' },
  { re: /^sideBarSectionHeader/, why: 'antetele de sectiune stau la nivelul barei, nu la cel al editorului' },
  { re: /^agentsPanel/, why: 'panoul de agenti primeste suprafata elevata, nu fundalul editorului' },
  { re: /^agentsNewSessionButton/, why: 'butonul de sesiune noua urmeaza stilul butoanelor, nu suprafata din spate' },
  { re: /^surface/, why: 'scara de suprafete e definita de tema, nu derivata din fundal' },
  { re: /^scmGraph/, why: 'graficul de istoric are nevoie de culori distincte intre ele, nu de derivarea implicita' },
  { re: /^statusBarItem\.(error|warning|offline|remote)/, why: 'elementele de stare folosesc culorile de stare ale temei' },
  { re: /^agentsUnreadBadge/, why: 'insigna de necitit foloseste accentul temei' },
  { re: /^editorUnicodeHighlight/, why: 'evidentierea unicode foloseste culoarea de avertisment a temei' },
  { re: /^inlineEdit\.gutterIndicator\.successfulBackground$/, why: 'in variantele high contrast bordura devine culoarea de contrast a temei, iar fundalul ramane culoarea de succes, altfel indicatorul nu s-ar mai vedea' },
  { re: /^editor\.inactiveLineHighlightBackground$/, why: 'VS Code o deriva identic cu linia activa. O tin mai slaba, altfel un grup de editor nefocalizat arata la fel de aprins ca cel focalizat' },
];
const isDeliberate = (k) => DELIBERATE.some((d) => d.re.test(k));
const ALL_KEYS = REG.confirmedReal;

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const SEL = /^(\*|[a-zA-Z][a-zA-Z0-9]*)(\.[a-zA-Z][a-zA-Z0-9]*)*(:[a-zA-Z][a-zA-Z0-9_-]*)?$/;
const STYLE = /^(|italic|bold|underline|strikethrough)( (italic|bold|underline|strikethrough))*$/;

const ACCEPTED = [
  {
    fg: 'descriptionForeground', bg: 'badge.background',
    why: 'apare doar in .chat-debug-wirelog-badge. Text gri pe un badge colorat este un conflict inerent: temele livrate cu VS Code masoara 1.35 la 2026-dark si 1.17 la 2026-light, deci nu se poate rezolva fara a schimba culoarea badge-ului in toata interfata.',
  },
];

const SURFACES = ['editor.background', 'sideBar.background', 'panel.background',
  'editorWidget.background', 'titleBar.activeBackground', 'activityBar.background',
  'editorGroupHeader.tabsBackground', 'menu.background', 'quickInput.background'];

const RIDES_ANYWHERE = {
  'keybindingLabel.background': ['button.background', 'badge.background', 'list.activeSelectionBackground', 'notifications.background'],
};

const isTranslucent = (c) => parse(c).a < 1;

function worstSurface(t, bgKey) {
  const bg = t.colors[bgKey];
  if (!bg) return null;
  if (!isTranslucent(bg)) return [{ under: null, resolved: bg }];
  const extra = RIDES_ANYWHERE[bgKey] || [];
  return [...SURFACES, ...extra].filter((s) => t.colors[s] && !isTranslucent(t.colors[s]))
    .map((s) => ({ under: s, resolved: over(bg, t.colors[s]) }));
}

const FLOOR = (fgKey) => {
  if (/placeholder|inactive|ghost|disabled|dimmed|unnecessary/i.test(fgKey)) return 3.0;
  if (/description|comment|lineNumber(?!\.active)/i.test(fgKey)) return 4.0;
  return 4.5;
};

function analyze(entry) {
  const file = path.join(HERE, '..', entry.path.slice(2));
  const found = [];
  let t;
  try { t = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return [{ sev: 'blocant', msg: `JSON invalid: ${e.message}` }]; }

  if (t.name !== entry.label) found.push({ sev: 'blocant', msg: `name "${t.name}" difera de eticheta "${entry.label}"` });
  const EXPECTED = { 'vs-dark': 'dark', vs: 'light', 'hc-black': 'hcDark', 'hc-light': 'hcLight' };
  if (t.type !== EXPECTED[entry.uiTheme])
    found.push({ sev: 'blocant', msg: `type "${t.type}" nu se potriveste cu uiTheme "${entry.uiTheme}"` });

  for (const [k, v] of Object.entries(t.colors))
    if (!HEX.test(v)) found.push({ sev: 'blocant', msg: `culoare invalida ${k} = ${v}` });

  const missing = ALL_KEYS.filter((k) => !(k in t.colors));
  if (missing.length) found.push({ sev: 'acoperire', msg: `${missing.length} chei lipsa: ${missing.slice(0, 4).join(', ')}` });

  for (const s of Object.keys(t.semanticTokenColors || {}))
    if (!SEL.test(s)) found.push({ sev: 'blocant', msg: `selector semantic malformat: ${s}` });
  for (const r of t.tokenColors || []) {
    if (!r.scope?.length) found.push({ sev: 'blocant', msg: `regula fara scope: ${r.name}` });
    if (r.settings?.fontStyle !== undefined && !STYLE.test(r.settings.fontStyle))
      found.push({ sev: 'blocant', msg: `fontStyle invalid la ${r.name}` });
  }

  const eb = t.colors['editor.background'];
  for (const r of t.tokenColors || []) {
    const fg = r.settings?.foreground;
    if (!fg) continue;
    const c = contrast(over(fg, eb), eb);
    const floor = /Comment|strikethrough|quote/i.test(r.name) ? 4.0 : 4.5;
    if (c < floor) found.push({ sev: 'contrast', msg: `sintaxa ${c.toFixed(2)} sub ${floor} la "${r.name}"` });
  }

  for (const p of PAIRS) {
    const fg = t.colors[p.fg];
    if (!fg || !t.colors[p.bg]) continue;
    if (ACCEPTED.some((a) => a.fg === p.fg && a.bg === p.bg)) continue;
    const floor = FLOOR(p.fg);
    for (const { under, resolved } of worstSurface(t, p.bg) || []) {
      const c = contrast(over(fg, resolved), resolved);
      if (c < floor)
        found.push({ sev: 'contrast', msg: `${c.toFixed(2)} sub ${floor}: ${p.fg} pe ${p.bg}${under ? ` (peste ${under})` : ''}` });
    }
  }

  for (const [key, src] of Object.entries(DERIV)) {
    if (!SEAM_PRONE.test(key) || isDeliberate(key)) continue;
    const a = t.colors[key], b = t.colors[src];
    if (!a || !b) continue;
    if (a.toLowerCase() !== b.toLowerCase())
      found.push({ sev: 'cusatura', msg: `${key} = ${a} dar VS Code il deriva din ${src} = ${b}` });
  }

  const STATUS = ['editorError.foreground', 'editorWarning.foreground', 'editorInfo.foreground'];
  for (let i = 0; i < STATUS.length; i++) for (let j = i + 1; j < STATUS.length; j++) {
    const a = t.colors[STATUS[i]], b = t.colors[STATUS[j]];
    if (!a || !b) continue;
    const d = deltaE(a, b);
    if (d < 12) found.push({ sev: 'stare', msg: `${STATUS[i]} si ${STATUS[j]} la ${d.toFixed(1)} dE` });
  }

  const tb = t.colors['terminal.background'];
  const N = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'];
  const seen = [];
  for (const n of N) {
    const base = t.colors['terminal.ansi' + n], br = t.colors['terminal.ansiBright' + n];
    if (toLab(br)[0] <= toLab(base)[0])
      found.push({ sev: 'terminal', msg: `bright${n} nu e mai deschis decat ${n}` });
    const skip = n === 'Black' || (n === 'White' && t.type === 'light');
    if (!skip && contrast(base, tb) < 3.0)
      found.push({ sev: 'terminal', msg: `ansi${n} la ${contrast(base, tb).toFixed(2)}` });
    for (const [on, oh] of seen) {
      const d = deltaE(base, oh);
      if (d < 8) found.push({ sev: 'terminal', msg: `ansi${n} si ansi${on} la ${d.toFixed(1)} dE` });
    }
    seen.push([n, base]);
  }

  return found;
}

const pkg = R('../package.json');
let total = 0;
const bySeverity = {};
for (const entry of pkg.contributes.themes) {
  const found = analyze(entry);
  total += found.length;
  for (const f of found) bySeverity[f.sev] = (bySeverity[f.sev] || 0) + 1;
  const n = Object.keys(R('../' + entry.path.slice(2)).colors).length;
  if (!found.length) { console.log(`${entry.label.padEnd(26)} ${n} chei   curat`); continue; }
  console.log(`\n${entry.label}   ${found.length} probleme`);
  for (const f of found) console.log(`   [${f.sev}] ${f.msg}`);
}
console.log(`\nperechi verificate per tema: ${PAIRS.length - ACCEPTED.length} din ${PAIRS.length} extrase din CSS`);
for (const a of ACCEPTED) console.log(`exceptie acceptata: ${a.fg} pe ${a.bg}\n   ${a.why}`);
console.log(`cusaturi divergente documentate: ${DELIBERATE.length}`);
console.log(total ? `TOTAL ${total} probleme  ${JSON.stringify(bySeverity)}` : `TOATE CELE ${pkg.contributes.themes.length} TREC`);
process.exit(total ? 1 : 0);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, toLab, parse } from './color.mjs';
import { KEPT_DEPRECATED } from './deprecated.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
const REG = R('vscode-color-keys-full.json');
const PAIRS = R('render-pairs.json');
const DERIV = R('derivations.json');

const SEAM_PRONE = /[Bb]ackground$/;
const DELIBERATE = [
  { re: /^terminalSymbolIcon/, why: 'terminal suggestion icons take the colour of the matching syntax role, so they agree with the editor' },
  { re: /^symbolIcon/, why: 'symbol icons follow the same roles as the syntax, not the default foreground' },
  { re: /^settings\.numberInput/, why: 'the number field gets the same surface as every other field; VS Code leaves it transparent' },
  { re: /^terminal\.tab/, why: 'terminal tabs follow the theme status colours' },
  { re: /^sideBarTitle/, why: 'the side bar title is dimmed on purpose against its content' },
  { re: /^sideBarSectionHeader/, why: 'section headers sit at the level of the bar, not of the editor' },
  { re: /^agentsPanel/, why: 'the agents panel takes the elevated surface, not the editor background' },
  { re: /^agentsNewSessionButton/, why: 'the new session button follows the button style, not the surface behind it' },
  { re: /^surface/, why: 'the surface scale is defined by the theme, not derived from the background' },
  { re: /^scmGraph/, why: 'the history graph needs colours distinct from each other, not the default derivation' },
  { re: /^statusBarItem\.(error|warning|offline|remote)/, why: 'status bar items use the theme status colours' },
  { re: /^agentsUnreadBadge/, why: 'the unread badge uses the theme accent' },
  { re: /^editorUnicodeHighlight/, why: 'the unicode highlight uses the theme warning colour' },
  { re: /^inlineEdit\.gutterIndicator\.successfulBackground$/, why: 'in the high contrast variants the border becomes the theme contrast colour while the background keeps the success colour, otherwise the indicator would disappear' },
  { re: /^editor\.inactiveLineHighlightBackground$/, why: 'VS Code derives it equal to the active line. It is kept weaker, otherwise an unfocused editor group looks as lit as the focused one' },
  { re: /^editorInlayHint\.(parameter|type)Background$/, why: 'parameter and type hints take the hue of their own role, the same as the text drawn in them, not the accent' },
  { re: /^modernTab\.activeBackground$/, why: 'the active modern tab takes the editor surface, like the classic active tab, so the open file and its tab read as one surface' },
  { re: /^modernTab\.hoverBackground$/, why: 'hover on a modern tab takes the same surface as hover on a classic tab, not the list hover' },
  { re: /^statusBarItem\.prominentHoverBackground$/, why: 'prominent items already sit on a 14% wash, so their hover has to rise above it rather than take the ordinary hover' },
  { re: /^terminal\.selectionBackground$/, why: 'the terminal selection is weaker than the editor selection, otherwise it drowns the ANSI colours' },
  { re: /^menu\.background$/, why: 'menus are elevated surfaces, not input fields' },
  { re: /^editorMarkerNavigation\.background$/, why: 'the marker navigation widget is a widget and takes the elevated surface, like the hovers' },
  { re: /^editorStickyScroll(Gutter)?\.background$/, why: 'sticky scroll sits half a step above the editor, so the pinned lines read as a header' },
  { re: /^inactiveSessionView\.background$/, why: 'inactive session views recede to the chrome surface, like the inactive tab and title bar' },
  { re: /^panel\.background$/, why: 'the panel is an elevated surface and the terminal follows it' },
  { re: /^editorGutter\.deletedBackground$/, why: 'the git gutter marks take the status colour at full strength; the error foreground is the softened variant for squiggles' },
];
const isDeliberate = (k) => DELIBERATE.some((d) => d.re.test(k));
const DEPRECATED = new Set(REG.deprecated);
const KEPT = new Set(KEPT_DEPRECATED.map((k) => k.key));
const ALL_KEYS = REG.confirmedReal.filter((k) => !DEPRECATED.has(k));

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const SEL = /^(\*|[a-zA-Z][a-zA-Z0-9]*)(\.[a-zA-Z][a-zA-Z0-9]*)*(:[a-zA-Z][a-zA-Z0-9_-]*)?$/;
const STYLE = /^(|italic|bold|underline|strikethrough)( (italic|bold|underline|strikethrough))*$/;

const ACCEPTED = [
  {
    fg: 'descriptionForeground', bg: 'badge.background',
    why: 'appears only in .chat-debug-wirelog-badge. Grey text on a coloured badge is an inherent conflict: the themes shipped with VS Code measure 1.35 in 2026-dark and 1.17 in 2026-light, so it cannot be fixed without changing the badge colour across the whole interface.',
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
  catch (e) { return [{ sev: 'blocking', msg: `invalid JSON: ${e.message}` }]; }

  if (t.name !== entry.label) found.push({ sev: 'blocking', msg: `name "${t.name}" differs from the label "${entry.label}"` });
  const EXPECTED = { 'vs-dark': 'dark', vs: 'light', 'hc-black': 'hcDark', 'hc-light': 'hcLight' };
  if (t.type !== EXPECTED[entry.uiTheme])
    found.push({ sev: 'blocking', msg: `type "${t.type}" does not match uiTheme "${entry.uiTheme}"` });

  for (const [k, v] of Object.entries(t.colors))
    if (!HEX.test(v)) found.push({ sev: 'blocking', msg: `invalid colour ${k} = ${v}` });

  const missing = ALL_KEYS.filter((k) => !(k in t.colors));
  if (missing.length) found.push({ sev: 'coverage', msg: `${missing.length} missing keys: ${missing.slice(0, 4).join(', ')}` });
  const stale = Object.keys(t.colors).filter((k) => DEPRECATED.has(k) && !KEPT.has(k));
  if (stale.length) found.push({ sev: 'deprecated', msg: `${stale.length} deprecated keys set: ${stale.slice(0, 4).join(', ')}` });

  for (const s of Object.keys(t.semanticTokenColors || {}))
    if (!SEL.test(s)) found.push({ sev: 'blocking', msg: `malformed semantic selector: ${s}` });
  for (const r of t.tokenColors || []) {
    if (!r.scope?.length) found.push({ sev: 'blocking', msg: `rule without scope: ${r.name}` });
    if (r.settings?.fontStyle !== undefined && !STYLE.test(r.settings.fontStyle))
      found.push({ sev: 'blocking', msg: `invalid fontStyle in ${r.name}` });
  }

  const eb = t.colors['editor.background'];
  for (const r of t.tokenColors || []) {
    const fg = r.settings?.foreground;
    if (!fg) continue;
    const c = contrast(over(fg, eb), eb);
    const floor = /Comment|strikethrough|quote/i.test(r.name) ? 4.0 : 4.5;
    if (c < floor) found.push({ sev: 'contrast', msg: `syntax ${c.toFixed(2)} under ${floor} in "${r.name}"` });
  }

  for (const p of PAIRS) {
    const fg = t.colors[p.fg];
    if (!fg || !t.colors[p.bg]) continue;
    if (ACCEPTED.some((a) => a.fg === p.fg && a.bg === p.bg)) continue;
    const floor = FLOOR(p.fg);
    for (const { under, resolved } of worstSurface(t, p.bg) || []) {
      const c = contrast(over(fg, resolved), resolved);
      if (c < floor)
        found.push({ sev: 'contrast', msg: `${c.toFixed(2)} under ${floor}: ${p.fg} on ${p.bg}${under ? ` (over ${under})` : ''}` });
    }
  }

  for (const [key, src] of Object.entries(DERIV)) {
    if (!SEAM_PRONE.test(key) || DEPRECATED.has(key) || isDeliberate(key)) continue;
    const a = t.colors[key], b = t.colors[src];
    if (!a || !b) continue;
    if (a.toLowerCase() !== b.toLowerCase())
      found.push({ sev: 'seam', msg: `${key} = ${a} but VS Code derives it from ${src} = ${b}` });
  }

  const STATUS = ['editorError.foreground', 'editorWarning.foreground', 'editorInfo.foreground'];
  for (let i = 0; i < STATUS.length; i++) for (let j = i + 1; j < STATUS.length; j++) {
    const a = t.colors[STATUS[i]], b = t.colors[STATUS[j]];
    if (!a || !b) continue;
    const d = deltaE(a, b);
    if (d < 12) found.push({ sev: 'status', msg: `${STATUS[i]} and ${STATUS[j]} at ${d.toFixed(1)} dE` });
  }

  const tb = t.colors['terminal.background'];
  const N = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'];
  const seen = [];
  for (const n of N) {
    const base = t.colors['terminal.ansi' + n], br = t.colors['terminal.ansiBright' + n];
    if (toLab(br)[0] <= toLab(base)[0])
      found.push({ sev: 'terminal', msg: `bright${n} is not lighter than ${n}` });
    const skip = n === 'Black' || (n === 'White' && t.type === 'light');
    if (!skip && contrast(base, tb) < 3.0)
      found.push({ sev: 'terminal', msg: `ansi${n} at ${contrast(base, tb).toFixed(2)}` });
    for (const [on, oh] of seen) {
      const d = deltaE(base, oh);
      if (d < 8) found.push({ sev: 'terminal', msg: `ansi${n} and ansi${on} at ${d.toFixed(1)} dE` });
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
  if (!found.length) { console.log(`${entry.label.padEnd(26)} ${n} keys   clean`); continue; }
  console.log(`\n${entry.label}   ${found.length} problems`);
  for (const f of found) console.log(`   [${f.sev}] ${f.msg}`);
}
console.log(`\npairs checked per theme: ${PAIRS.length - ACCEPTED.length} of ${PAIRS.length} extracted from the CSS`);
for (const a of ACCEPTED) console.log(`accepted exception: ${a.fg} on ${a.bg}\n   ${a.why}`);
console.log(`documented divergent seams: ${DELIBERATE.length}`);
console.log(total ? `TOTAL ${total} problems  ${JSON.stringify(bySeverity)}` : `ALL ${pkg.contributes.themes.length} PASS`);
process.exit(total ? 1 : 0);

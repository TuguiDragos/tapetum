import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, toLab } from './color.mjs';
import { KEPT_DEPRECATED } from './deprecated.mjs';
import { leftUnset } from './unset.mjs';
import { syntaxFloor } from './scheme-kit.mjs';
import { ACCEPTED, accepted, describe, FLOOR, surfacesFor, textOn } from './pairs.mjs';

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
  { re: /^modernTab\.activeBackground$/, why: 'modern tabs sit on the editor or on a menu, so the active one takes the active wash of toolbars, the text at 10%, a step above the list hover it would otherwise equal' },
  { re: /^modernEditorTab\.activeHoverBackground$/, why: 'hovering the active tab keeps it at the active wash instead of dropping to the lighter hover' },
  { re: /^statusBarItem\.prominentHoverBackground$/, why: 'prominent items already sit on a 14% wash, so their hover has to rise above it rather than take the ordinary hover' },
  { re: /^terminal\.selectionBackground$/, why: 'the terminal selection is weaker than the editor selection, otherwise it drowns the ANSI colours' },
  { re: /^menu\.background$/, why: 'menus are elevated surfaces, not input fields' },
  { re: /^editorMarkerNavigation\.background$/, why: 'the marker navigation widget is a widget and takes the elevated surface, like the hovers' },
  { re: /^inactiveSessionView\.background$/, why: 'inactive session views recede to the chrome surface, like the inactive tab and title bar' },
  { re: /^panel\.background$/, why: 'the panel is an elevated surface and the terminal follows it' },
  { re: /^editorGutter\.deletedBackground$/, why: 'the git gutter marks take the status colour at full strength; the error foreground is the softened variant for squiggles' },
  { re: /^testing\.(un)?coveredBackground$/, why: 'coverage takes the ok and error status at 14%; the diff text washes VS Code reuses are tuned for syntax on changed lines' },
  { re: /^notebook\.selectedCellBackground$/, why: 'a selected cell is marked by notebook.selectedCellBorder and the focused one by notebook.focusedCellBorder; its background stays clear' },
  { re: /^notebook\.cellEditorBackground$/, why: 'the code cell takes a fill computed from the editor background, so it stands out in the notebook rather than taking the side bar colour' },
  { re: /^menubar\.selectionBackground$/, why: 'an open menubar entry takes the 10% wash of an active control; the toolbar hover takes 6%' },
  { re: /^list\.filterMatchBackground$/, why: 'filter matches in lists take the number colour at 30% and are measured with their highlight text; the editor find highlight uses the string colour' },
  { re: /^list\.dropBetweenBackground$/, why: 'the line between rows while dragging takes the accent, like the other drop indicators' },
  { re: /^extensionButton\.(hover)?[Bb]ackground$/, why: 'the extension install button takes the primary button fill, as extensionButton.prominentBackground does' },
  { re: /^editor\.symbolHighlightBackground$/, why: 'the symbol highlight takes the type colour at 20%, apart from find matches' },
  { re: /^button\.secondaryBackground$/, why: 'secondary buttons take the raised surface as a solid fill rather than the list hover wash' },
  { re: /^terminal\.findMatch(Highlight)?Background$/, why: 'the terminal sits on the panel surface, so its find washes start from the editor colours and ease until the terminal text reads 4.5 on its own ground' },
  { re: /^chat\.findMatchHighlightBackground$/, why: 'chat find matches keep the string colour at 22%; the editor eases its own from 24% until the search text reads 4.5' },
];
const isDeliberate = (k) => DELIBERATE.some((d) => d.re.test(k));
const DEPRECATED = new Set(REG.deprecated);
const REGISTERED = new Set(REG.confirmedReal);
const KEPT = new Set(KEPT_DEPRECATED.map((k) => k.key));
const ALL_KEYS = REG.confirmedReal.filter((k) => !DEPRECATED.has(k));

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const SEL = /^(\*|[a-zA-Z][a-zA-Z0-9]*)(\.[a-zA-Z][a-zA-Z0-9]*)*(:[a-zA-Z][a-zA-Z0-9_-]*)?$/;
const STYLE = /^(|italic|bold|underline|strikethrough)( (italic|bold|underline|strikethrough))*$/;

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

  const unset = leftUnset(entry.uiTheme);
  const missing = ALL_KEYS.filter((k) => !(k in t.colors) && !unset.has(k));
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
    const floor = syntaxFloor(r);
    if (c < floor) found.push({ sev: 'contrast', msg: `syntax ${c.toFixed(2)} under ${floor} in "${r.name}"` });
  }

  for (const p of PAIRS) {
    if (accepted(p)) continue;
    const absent = [p.fg, p.bg].filter((k) => !t.colors[k]);
    if (absent.length) {
      const why = absent.map((k) => `${k} ${REGISTERED.has(k) ? 'left unset' : 'is not a registered key'}`).join(', ');
      (skipped[`${describe(p)}: ${why}`] ||= []).push(entry.label);
      continue;
    }
    measured++;
    const floor = FLOOR(p.fg);
    for (const { under, resolved } of surfacesFor(t, p) || []) {
      const c = contrast(textOn(t, p, resolved), resolved);
      if (c < floor)
        found.push({ sev: 'contrast', msg: `${c.toFixed(2)} under ${floor}: ${describe(p)}${under ? ` (over ${under})` : ''}` });
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
const skipped = {};
let measured = 0;
let total = 0;
const bySeverity = {};
for (const entry of pkg.contributes.themes) {
  const found = analyze(entry);
  total += found.length;
  for (const f of found) bySeverity[f.sev] = (bySeverity[f.sev] || 0) + 1;
  if (!found.length) { console.log(`${entry.label.padEnd(26)} ${Object.keys(R('../' + entry.path.slice(2)).colors).length} keys   clean`); continue; }
  console.log(`\n${entry.label}   ${found.length} problems`);
  for (const f of found) console.log(`   [${f.sev}] ${f.msg}`);
}
console.log(`\npairs extracted from the CSS: ${PAIRS.length}; accepted exceptions: ${ACCEPTED.length}; pairs measured: ${measured} of ${(PAIRS.length - ACCEPTED.length) * pkg.contributes.themes.length} across ${pkg.contributes.themes.length} themes`);
for (const [p, themes] of Object.entries(skipped))
  console.log(`not measured in ${themes.length === pkg.contributes.themes.length ? 'any theme' : themes.join(', ')}: ${p}`);
for (const a of ACCEPTED) console.log(`accepted exception: ${a.fg} on ${a.bg}${a.bgAlpha !== undefined ? ` at ${Math.round(a.bgAlpha * 100)}%` : ''}\n   ${a.why}`);
console.log(`documented divergent seams: ${DELIBERATE.length}`);
console.log(total ? `TOTAL ${total} problems  ${JSON.stringify(bySeverity)}` : `ALL ${pkg.contributes.themes.length} PASS`);
process.exit(total ? 1 : 0);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over } from './color.mjs';
import { bundledExtensions } from './vscode-path.mjs';
import { grammarScopes } from './grammar-scopes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

let byLang, REAL, extDir;
try {
  ({ byLang, real: REAL } = grammarScopes());
  extDir = bundledExtensions();
} catch (err) {
  console.log('verificarea domeniilor cere gramaticile TextMate din VS Code, care nu este instalat aici');
  console.log('seteaza VSCODE_APP catre resources/app daca vrei sa ruleze');
  process.exit(0);
}
const VARIANT_KEYS = (f) => ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k]);

const selectorsOf = (rule) => [].concat(rule.scope).map((s) => s.trim()).filter(Boolean);
const leaf = (sel) => (sel.includes(' ') ? sel.split(/\s+/).pop() : sel);
const matches = (sel, scope) => { const l = leaf(sel); return scope === l || scope.startsWith(l + '.'); };
const specificity = (sel) => leaf(sel).split('.').length;

function winnerFor(rules, scope) {
  let best = null;
  rules.forEach((r, i) => {
    for (const sel of selectorsOf(r)) {
      if (!matches(sel, scope)) continue;
      const sp = specificity(sel);
      if (!best || sp > best.sp || (sp === best.sp && i >= best.i)) best = { sp, i, rule: r, sel };
    }
  });
  return best;
}

function auditTheme(name, rules, editorBg) {
  const wins = new Map();
  const covered = [];
  for (const s of REAL) {
    const w = winnerFor(rules, s);
    if (!w) continue;
    covered.push(s);
    wins.set(w.i, (wins.get(w.i) || 0) + 1);
  }
  const dead = [];
  const shadowed = [];
  rules.forEach((r, i) => {
    if (!wins.has(i)) {
      const anyMatch = REAL.some((s) => selectorsOf(r).some((sel) => matches(sel, s)));
      (anyMatch ? shadowed : dead).push(r.name || selectorsOf(r)[0]);
    }
  });
  const deadScopes = [];
  for (const r of rules) for (const sel of selectorsOf(r)) {
    if (!REAL.some((s) => matches(sel, s))) deadScopes.push(sel);
  }
  const noColor = rules.filter((r) => !r.settings || (!r.settings.foreground && !r.settings.fontStyle)).map((r) => r.name);
  const badStyle = rules.filter((r) => r.settings?.fontStyle !== undefined
    && !/^(|italic|bold|underline|strikethrough)( (italic|bold|underline|strikethrough))*$/.test(r.settings.fontStyle));
  let worst = 99, worstName = '';
  for (const r of rules) {
    if (!r.settings?.foreground) continue;
    const cr = contrast(over(r.settings.foreground, editorBg), editorBg);
    if (cr < worst) { worst = cr; worstName = r.name; }
  }
  return { name, rules: rules.length, scopes: rules.reduce((n, r) => n + selectorsOf(r).length, 0),
    covered: covered.length, pct: (covered.length / REAL.length) * 100,
    dead, shadowed, deadScopes: [...new Set(deadScopes)], noColor, badStyle: badStyle.length,
    worst, worstName };
}

const mine = [];
const { FAMILIES } = await import('./palettes.mjs');
for (const fam of FAMILIES) for (const v of VARIANT_KEYS(fam)) {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${fam.id}-${v}.json`), 'utf8'));
  mine.push({ ...auditTheme(t.name, t.tokenColors, t.colors['editor.background']), scheme: fam.scheme || 'grammar' });
}

function resolve(file) {
  const seen = new Set();
  let cur = file, colors = {}, tokens = [];
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const j = JSON.parse(fs.readFileSync(cur, 'utf8'));
    colors = { ...(j.colors || {}), ...colors };
    tokens = [...(j.tokenColors || []), ...tokens];
    cur = j.include ? path.join(path.dirname(cur), j.include) : null;
  }
  return { colors, tokens };
}
const official = [];
for (const name of fs.readdirSync(extDir)) {
  const pj = path.join(extDir, name, 'package.json');
  if (!fs.existsSync(pj)) continue;
  let man; try { man = JSON.parse(fs.readFileSync(pj, 'utf8')); } catch { continue; }
  for (const t of man.contributes?.themes || []) {
    const file = path.join(extDir, name, t.path);
    if (!fs.existsSync(file)) continue;
    try {
      const { colors, tokens } = resolve(file);
      if (!colors['editor.background'] || !tokens.length) continue;
      let label = t.label || path.basename(file);
      if (/^%.*%$/.test(label)) {
        const nls = path.join(extDir, name, 'package.nls.json');
        if (fs.existsSync(nls)) label = JSON.parse(fs.readFileSync(nls, 'utf8'))[label.slice(1, -1)] || label;
      }
      official.push(auditTheme(label, tokens, colors['editor.background']));
    } catch { /* tema nu se rezolva */ }
  }
}

console.log(`domenii reale in cele ${byLang.size} gramatici livrate: ${REAL.length}\n`);
console.log('TEMELE OFICIALE');
console.log('tema                          reguli  domenii  acoperite     %   moarte  umbrite  domenii moarte  contrast min');
console.log('-'.repeat(116));
for (const o of official.sort((a, b) => b.pct - a.pct)) {
  console.log(o.name.padEnd(30) + String(o.rules).padStart(6) + String(o.scopes).padStart(9)
    + String(o.covered).padStart(11) + o.pct.toFixed(1).padStart(7) + String(o.dead.length).padStart(8)
    + String(o.shadowed.length).padStart(9) + String(o.deadScopes.length).padStart(15) + o.worst.toFixed(2).padStart(14));
}
console.log('\nALE MELE, pe schema');
console.log('schema        teme  reguli  domenii  acoperite     %   moarte  umbrite  domenii moarte  contrast min');
console.log('-'.repeat(116));
const bySch = {};
for (const m of mine) (bySch[m.scheme] ||= []).push(m);
for (const [s, list] of Object.entries(bySch)) {
  const r = list[0];
  console.log(s.padEnd(14) + String(list.length).padStart(4) + String(r.rules).padStart(8) + String(r.scopes).padStart(9)
    + String(r.covered).padStart(11) + r.pct.toFixed(1).padStart(7) + String(r.dead.length).padStart(8)
    + String(r.shadowed.length).padStart(9) + String(r.deadScopes.length).padStart(15)
    + Math.min(...list.map((x) => x.worst)).toFixed(2).padStart(14));
}
const problems = [];
for (const m of mine) {
  if (m.noColor.length) problems.push(`${m.name}: ${m.noColor.length} reguli fara culoare si fara stil`);
  if (m.badStyle) problems.push(`${m.name}: ${m.badStyle} fontStyle invalid`);
}
for (const [s, list] of Object.entries(bySch)) {
  const set = new Set(list.map((x) => x.rules + '|' + x.covered));
  if (set.size !== 1) problems.push(`schema ${s} nu e stabila intre teme: ${[...set].join(', ')}`);
}
console.log(problems.length ? '\nPROBLEME:\n  ' + problems.join('\n  ') : '\nfiecare tema, aceleasi reguli, aceeasi acoperire, nicio regula fara culoare, niciun fontStyle invalid');

if (process.argv.includes('--gaps')) {
  const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/quantum-dark.json'), 'utf8')).tokenColors;
  const uncovered = REAL.filter((s) => !winnerFor(rules, s));
  const byPrefix = {};
  for (const s of uncovered) { const p = s.split('.')[0]; (byPrefix[p] ||= []).push(s); }
  console.log(`\nDOMENII NEACOPERITE: ${uncovered.length} din ${REAL.length}`);
  for (const [p, v] of Object.entries(byPrefix).sort((a, b) => b[1].length - a[1].length))
    console.log(`  ${String(v.length).padStart(3)}  ${p}.*   ${v.slice(0, 4).join(', ')}${v.length > 4 ? ' ...' : ''}`);
  const perLang = [...byLang.entries()].map(([lang, set]) => {
    const real = [...set].filter((s) => !s.startsWith('source.') && !s.startsWith('text.'));
    const miss = real.filter((s) => !winnerFor(rules, s));
    return { lang, total: real.length, miss: miss.length };
  }).filter((x) => x.miss).sort((a, b) => b.miss / b.total - a.miss / a.total);
  console.log('\nlimbaje cu domenii neacoperite:');
  for (const l of perLang) console.log(`  ${l.lang.padEnd(24)} ${l.miss} din ${l.total}`);
}

if (process.argv.includes('--dead')) {
  for (const [s, list] of Object.entries(bySch)) {
    const r = list[0];
    console.log(`\nschema ${s}`);
    if (r.dead.length) console.log('  reguli care nu castiga niciodata: ' + r.dead.join(', '));
    if (r.shadowed.length) console.log('  reguli umbrite mereu: ' + r.shadowed.join(', '));
    if (r.deadScopes.length) console.log('  domenii pe care nicio gramatica livrata nu le emite:\n    ' + r.deadScopes.join('\n    '));
  }
}

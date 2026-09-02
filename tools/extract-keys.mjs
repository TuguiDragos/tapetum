import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appRoot, outDir } from './vscode-path.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = appRoot();
const ID = '[a-zA-Z][A-Za-z0-9]*(?:\\.[A-Za-z0-9]+)*';
const LOCALIZE = '[A-Za-z_$][\\w$]*\\(\\d+,\\s*null\\)';
const LOCALIZED = new RegExp(`^${LOCALIZE}`);

export function bundles() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js') && fs.statSync(p).size > 1_000_000) out.push(p);
    }
  })(outDir());
  return out.sort();
}

const SIGNATURE = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\("(${ID})",\\s*(?:\\{[^{}]*\\}|null|"[^"]*"|[A-Za-z_$][\\w$]*(?:\\([^()]*(?:\\([^()]*\\)[^()]*)*\\))?),\\s*${LOCALIZE}`, 'g');

export function registerFunction(src) {
  const counts = new Map();
  for (const m of src.matchAll(SIGNATURE)) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  let best = null;
  for (const [fn, n] of counts) if (!best || n > best.n) best = { fn, n };
  return best && best.n >= 100 ? best.fn : null;
}

export function callArguments(src, from) {
  const out = [];
  let depth = 0, quote = null, cur = '';
  for (let i = from; i < src.length; i++) {
    const ch = src[i];
    if (quote) { cur += ch; if (ch === quote && src[i - 1] !== '\\') quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; cur += ch; continue; }
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    if (ch === ')' || ch === '}' || ch === ']') {
      if (depth === 0) { out.push(cur.trim()); return out; }
      depth--;
    }
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  return out;
}

export function registrations(src, fn) {
  const found = new Map();
  const re = new RegExp(`(?:(?<![\\w$])([A-Za-z_$][\\w$]*)\\s*=\\s*)?\\b${fn}\\("(${ID})"\\s*,`, 'g');
  for (const m of src.matchAll(re)) {
    const open = m.index + m[0].indexOf('(');
    const a = callArguments(src, open + 1);
    if (a.length < 3) continue;
    found.set(m[2], { binding: m[1] || null, defaults: a[1], deprecated: a.length >= 5 && LOCALIZED.test(a[4]), pos: m.index });
  }
  return found;
}

export function ansiMap(src) {
  return [...src.matchAll(/"(terminal\.ansi[A-Za-z]+)":\s*\{\s*index:\s*\d+/g)].map((m) => m[1]);
}

if (process.argv[1] && process.argv[1].endsWith('extract-keys.mjs')) {
  const registered = new Set();
  const deprecated = new Set();
  const scanned = [];
  for (const file of bundles()) {
    const src = fs.readFileSync(file, 'utf8');
    const fn = registerFunction(src);
    if (!fn) continue;
    const regs = registrations(src, fn);
    for (const [id, r] of regs) { registered.add(id); if (r.deprecated) deprecated.add(id); }
    const ansi = ansiMap(src);
    for (const id of ansi) registered.add(id);
    scanned.push({ file: path.relative(ROOT, file), registerFunction: fn, registrations: regs.size, deprecated: [...regs.values()].filter((r) => r.deprecated).length, ansi: ansi.length });
  }
  if (!scanned.length) throw new Error('no bundle contains a colour registration function');

  const contributed = new Set();
  const extDir = path.join(ROOT, 'extensions');
  for (const name of fs.readdirSync(extDir)) {
    const pj = path.join(extDir, name, 'package.json');
    if (!fs.existsSync(pj)) continue;
    try { for (const c of JSON.parse(fs.readFileSync(pj, 'utf8')).contributes?.colors || []) if (c.id) contributed.add(c.id); }
    catch { /* manifest ilizibil */ }
  }

  const microsoft = new Set();
  const themeDir = path.join(extDir, 'theme-defaults', 'themes');
  if (fs.existsSync(themeDir)) for (const f of fs.readdirSync(themeDir)) {
    try { for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(themeDir, f), 'utf8')).colors || {})) microsoft.add(k); }
    catch { /* not a theme */ }
  }

  const confirmed = [...new Set([...registered, ...contributed])].sort();
  const out = {
    vscode: JSON.parse(fs.readFileSync(path.join(ROOT, 'product.json'), 'utf8')).version,
    bundles: scanned,
    counts: { registered: registered.size, contributedByExtensions: contributed.size, confirmedReal: confirmed.length,
      deprecated: deprecated.size, microsoftThemes: microsoft.size },
    confirmedReal: confirmed,
    deprecated: [...deprecated].sort(),
    contributedByExtensions: [...contributed].sort(),
    unregisteredInMicrosoftThemes: [...microsoft].filter((k) => !registered.has(k) && !contributed.has(k)).sort(),
  };
  fs.writeFileSync(path.join(HERE, 'vscode-color-keys-full.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`VS Code ${out.vscode}`);
  for (const b of scanned) console.log(`  ${b.file}: function ${b.registerFunction}, ${b.registrations} registrations, ${b.deprecated} deprecated, ${b.ansi} ANSI`);
  console.log(`  contributed by extensions   ${contributed.size}`);
  console.log(`  CONFIRMED REAL              ${confirmed.length}`);
  console.log(`  deprecated                  ${deprecated.size}: ${out.deprecated.join(', ')}`);
  console.log(`  in the Microsoft themes but unregistered: ${out.unregisteredInMicrosoftThemes.length} ${out.unregisteredInMicrosoftThemes.join(', ')}`);
}

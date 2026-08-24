import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FAMILIES } from './palettes.mjs';
const VARIANT_KEYS = (f) => ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k]);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const FILE = path.join(HERE, 'snapshots.json');

const digest = (v) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

function shoot() {
  const out = {};
  for (const fam of FAMILIES) for (const v of VARIANT_KEYS(fam)) {
    const id = `${fam.id}-${v}`;
    const t = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${id}.json`), 'utf8'));
    out[id] = {
      colors: digest(t.colors),
      tokenColors: digest(t.tokenColors),
      semanticTokenColors: digest(t.semanticTokenColors),
      counts: [Object.keys(t.colors).length, t.tokenColors.length, Object.keys(t.semanticTokenColors).length],
      values: t.colors,
      rules: t.tokenColors.map((r) => `${r.name}|${r.settings.foreground || ''}|${r.settings.fontStyle || ''}`),
      semantic: t.semanticTokenColors,
    };
  }
  return out;
}

function diffTheme(before, after) {
  const changes = [];
  const keys = new Set([...Object.keys(before.values), ...Object.keys(after.values)]);
  for (const k of keys) {
    const a = before.values[k], b = after.values[k];
    if (a === b) continue;
    changes.push({ kind: 'culoare', key: k, from: a ?? 'lipsa', to: b ?? 'stearsa' });
  }
  const ruleSet = new Set([...before.rules, ...after.rules]);
  for (const r of ruleSet) {
    const inA = before.rules.includes(r), inB = after.rules.includes(r);
    if (inA && inB) continue;
    const [name] = r.split('|');
    if (!changes.some((c) => c.kind === 'regula' && c.key === name)) {
      changes.push({ kind: 'regula', key: name, from: before.rules.find((x) => x.startsWith(name + '|')) || 'lipsa',
        to: after.rules.find((x) => x.startsWith(name + '|')) || 'stearsa' });
    }
  }
  const semKeys = new Set([...Object.keys(before.semantic), ...Object.keys(after.semantic)]);
  for (const k of semKeys) {
    const a = JSON.stringify(before.semantic[k]), b = JSON.stringify(after.semantic[k]);
    if (a === b) continue;
    changes.push({ kind: 'semantic', key: k, from: a ?? 'lipsa', to: b ?? 'sters' });
  }
  return changes;
}

const now = shoot();
const update = process.argv.includes('--update');
const verbose = process.argv.includes('--verbose');

if (update || !fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify(now, null, 1) + '\n');
  const keys = Object.values(now).reduce((n, t) => n + Object.keys(t.values).length, 0);
  console.log(`instantaneu scris: ${Object.keys(now).length} teme, ${keys} chei de culoare`);
  process.exit(0);
}

const before = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const added = Object.keys(now).filter((k) => !(k in before));
const removed = Object.keys(before).filter((k) => !(k in now));
const changed = [];
for (const id of Object.keys(now)) {
  if (!(id in before)) continue;
  const a = before[id], b = now[id];
  if (a.colors === b.colors && a.tokenColors === b.tokenColors && a.semanticTokenColors === b.semanticTokenColors) continue;
  changed.push({ id, changes: diffTheme(a, b) });
}

if (!added.length && !removed.length && !changed.length) {
  console.log(`instantaneu identic: ${Object.keys(now).length} teme neschimbate`);
  process.exit(0);
}

if (added.length) console.log(`teme noi: ${added.join(', ')}`);
if (removed.length) console.log(`teme disparute: ${removed.join(', ')}`);
if (changed.length) {
  const total = changed.reduce((n, c) => n + c.changes.length, 0);
  console.log(`${changed.length} teme modificate, ${total} diferente\n`);
  const byKey = {};
  for (const c of changed) for (const d of c.changes) {
    const k = `${d.kind}: ${d.key}`;
    (byKey[k] ||= new Set()).add(c.id);
  }
  const rows = Object.entries(byKey).sort((a, b) => b[1].size - a[1].size);
  console.log('diferenta                                              teme');
  for (const [k, set] of rows.slice(0, verbose ? rows.length : 30)) {
    console.log('  ' + k.padEnd(52) + set.size);
  }
  if (!verbose && rows.length > 30) console.log(`  ... si inca ${rows.length - 30}, ruleaza cu --verbose`);
  if (verbose) {
    for (const c of changed) {
      console.log(`\n${c.id}`);
      for (const d of c.changes.slice(0, 40)) console.log(`   ${d.kind} ${d.key}: ${d.from} -> ${d.to}`);
      if (c.changes.length > 40) console.log(`   ... si inca ${c.changes.length - 40}`);
    }
  }
}
console.log('\nDaca schimbarile sunt intentionate: node tools/snapshot.mjs --update');
process.exit(1);

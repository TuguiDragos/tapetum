import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundles, registerFunction, registrations } from './extract-keys.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NAME = /^[A-Za-z_$][\w$]*$/;

const perBundle = [];
let read = 0;
for (const file of bundles()) {
  const src = fs.readFileSync(file, 'utf8');
  const fn = registerFunction(src);
  if (!fn) continue;
  const regs = [...registrations(src, fn)];
  read += regs.length;
  const byName = new Map();
  for (const [id, r] of regs) if (r.binding) (byName.get(r.binding) || byName.set(r.binding, []).get(r.binding)).push({ key: id, pos: r.pos });
  const resolved = new Map();
  for (const [id, r] of regs) {
    if (!NAME.test(r.defaults)) continue;
    const seen = byName.get(r.defaults) || [];
    let latest = null;
    for (const b of seen) if (b.pos < r.pos) latest = b;
    if (latest) resolved.set(id, { source: latest.key, ambiguous: seen.length > 1 });
  }
  perBundle.push(resolved);
}

const keys = new Set(perBundle.flatMap((m) => [...m.keys()]));
const alias = {};
let ambiguous = 0, disagree = 0;
for (const key of [...keys].sort()) {
  const entries = perBundle.map((m) => m.get(key)).filter(Boolean);
  const sources = new Set(entries.map((e) => e.source));
  if (sources.size > 1) { disagree++; continue; }
  if (entries.length >= 2 || !entries[0].ambiguous) alias[key] = entries[0].source;
  else ambiguous++;
}

fs.writeFileSync(path.join(HERE, 'derivations.json'), JSON.stringify(alias, null, 2) + '\n');
console.log(`keys read from the bundles: ${read}`);
console.log(`keys whose default is another key: ${Object.keys(alias).length}`);
console.log(`rejected: ${ambiguous} with an ambiguous minified name in a single bundle, ${disagree} with different sources across bundles`);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundledExtensions } from './vscode-path.mjs';
import { grammarScopes } from './grammar-scopes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

const theme = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/quantum-dark.json'), 'utf8'));
const mine = new Set();
for (const r of theme.tokenColors) for (const s of [].concat(r.scope)) mine.add(s.trim());

const covers = (tokenScope) => {
  for (const m of mine) {
    if (tokenScope === m) return true;
    if (tokenScope.startsWith(m + '.')) return true;
    if (m.includes(' ')) {
      const parts = m.split(/\s+/);
      const last = parts[parts.length - 1];
      if (tokenScope === last || tokenScope.startsWith(last + '.')) return true;
    }
  }
  return false;
};

const { byLang } = grammarScopes();
const langs = [];
for (const [lang, set] of byLang) {
  const scopes = [...set].filter((x) => !x.startsWith('meta.') && !x.startsWith('source.') && !x.startsWith('text.'));
  if (!scopes.length) continue;
  const hit = scopes.filter(covers);
  langs.push({ lang, total: scopes.length, hit: hit.length, pct: (hit.length / scopes.length) * 100,
    missed: scopes.filter((s2) => !covers(s2)) });
}
langs.sort((a, b) => a.pct - b.pct);

const total = langs.reduce((s, l) => s + l.total, 0);
const hit = langs.reduce((s, l) => s + l.hit, 0);
console.log(`rules in the theme: ${theme.tokenColors.length}, distinct scopes they name: ${mine.size}`);
console.log(`grammars shipped with VS Code: ${langs.length}`);
console.log(`distinct scopes in them: ${total}, covered: ${hit} (${((hit / total) * 100).toFixed(1)}%)\n`);
console.log('language'.padEnd(26) + 'scopes'.padStart(7) + 'covered'.padStart(11) + '%'.padStart(5));
console.log('-'.repeat(56));
for (const l of langs) console.log(l.lang.padEnd(26) + String(l.total).padStart(7) + String(l.hit).padStart(11) + l.pct.toFixed(0).padStart(5));

if (process.argv.includes('--missed')) {
  const freq = {};
  for (const l of langs) for (const s of l.missed) freq[s] = (freq[s] || 0) + 1;
  console.log('\nmost frequent uncovered scopes:');
  for (const [s, n] of Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${String(n).padStart(3)}  ${s}`);
}

if (process.argv.includes('--worst')) {
  console.log('\nmissing scopes, on the weakest languages:');
  for (const l of langs.slice(0, 10)) {
    console.log(`\n${l.lang} (${l.pct.toFixed(0)}%)`);
    console.log('  ' + l.missed.slice(0, 14).join('\n  '));
  }
}

import fs from 'node:fs';
import path from 'node:path';
import { extensionRoots } from './vscode-path.mjs';

const SCOPE = /^[a-z][a-zA-Z0-9]*(?:[.-][a-zA-Z0-9$_]+)+$/;
const SKIP = new Set(['patterns', 'repository', 'injections', 'match', 'begin', 'end', 'while',
  'include', 'firstLineMatch', 'foldingStartMarker', 'foldingStopMarker', 'injectionSelector', 'scopeName']);

function walk(node, out, key) {
  if (typeof node === 'string') {
    if (key && SKIP.has(key)) return;
    for (const s of node.split(/\s+/)) if (SCOPE.test(s)) out.add(s);
    return;
  }
  if (Array.isArray(node)) { for (const n of node) walk(n, out, key); return; }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) walk(v, out, k);
}

export function grammarScopes() {
  const byLang = new Map();
  const source = new Map();
  for (const extDir of extensionRoots()) {
    const bundled = !extDir.includes('.vscode');
    for (const name of fs.readdirSync(extDir)) {
      const pj = path.join(extDir, name, 'package.json');
      if (!fs.existsSync(pj)) continue;
      let man; try { man = JSON.parse(fs.readFileSync(pj, 'utf8')); } catch { continue; }
      for (const g of man.contributes?.grammars || []) {
        if (!g.path) continue;
        const file = path.join(extDir, name, g.path);
        if (!fs.existsSync(file)) continue;
        let gr; try { gr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
        const set = new Set();
        walk(gr, set, null);
        const lang = g.language || g.scopeName || name;
        byLang.set(lang, new Set([...(byLang.get(lang) || []), ...set]));
        if (!source.has(lang)) source.set(lang, bundled ? 'bundled' : name.replace(/-\d+\.\d+\.\d+$/, ''));
      }
    }
  }
  const all = new Set();
  for (const s of byLang.values()) for (const x of s) all.add(x);
  const real = [...all].filter((s) => !s.startsWith('source.') && !s.startsWith('text.'));
  return { byLang, source, all: [...all], real };
}

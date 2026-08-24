import fs from 'node:fs';
import path from 'node:path';
import { extensionRoots, workbenchJs } from './vscode-path.mjs';

function standardLegend() {
  const js = fs.readFileSync(workbenchJs(), 'utf8');
  const types = new Set();
  const modifiers = new Set();
  for (const m of js.matchAll(/\b(\w+)\("(namespace|class|enum|interface|struct|typeParameter|type|parameter|variable|property|enumMember|decorator|event|function|method|macro|label|comment|string|keyword|number|regexp|operator)"\s*,\s*d\(/g)) {
    types.add(m[2]);
  }
  for (const m of js.matchAll(/\b(\w+)\("(declaration|definition|readonly|static|deprecated|abstract|async|modification|documentation|defaultLibrary)"\s*,\s*d\(/g)) {
    modifiers.add(m[2]);
  }
  return { types: [...types].sort(), modifiers: [...modifiers].sort() };
}

export function legend() {
  const std = standardLegend();
  const custom = { types: new Map(), modifiers: new Map(), scopes: new Map() };
  for (const root of extensionRoots()) {
    for (const name of fs.readdirSync(root)) {
      const pj = path.join(root, name, 'package.json');
      if (!fs.existsSync(pj)) continue;
      let man; try { man = JSON.parse(fs.readFileSync(pj, 'utf8')); } catch { continue; }
      const c = man.contributes || {};
      const from = name.replace(/-\d+\.\d+\.\d+.*$/, '');
      for (const t of c.semanticTokenTypes || []) if (t.id) custom.types.set(t.id, { from, superType: t.superType, description: t.description });
      for (const t of c.semanticTokenModifiers || []) if (t.id) custom.modifiers.set(t.id, { from, description: t.description });
      for (const s of c.semanticTokenScopes || []) for (const [k, v] of Object.entries(s.scopes || {})) custom.scopes.set(k, { from, scopes: v });
    }
  }
  return { std, custom };
}

const SEL = /^(\*|[a-zA-Z][a-zA-Z0-9]*)((?:\.[a-zA-Z][a-zA-Z0-9]*)*)(:[a-zA-Z][a-zA-Z0-9_-]*)?$/;

export function coverage(semanticTokenColors, lg, textmateScopes) {
  const selectors = Object.keys(semanticTokenColors);
  const parsed = selectors.map((s) => {
    const m = s.match(SEL);
    if (!m) return null;
    return { sel: s, type: m[1], mods: m[2] ? m[2].slice(1).split('.') : [], lang: m[3] ? m[3].slice(1) : null };
  }).filter(Boolean);

  const ownRule = (t) => parsed.some((p) => p.type === t);
  const modRule = (m) => parsed.some((p) => p.mods.includes(m));
  const tmCovers = (scope) => textmateScopes
    ? [...textmateScopes].some((sel) => {
      const l = sel.includes(' ') ? sel.split(/\s+/).pop() : sel;
      return scope === l || scope.startsWith(l + '.');
    })
    : false;

  const classify = (id) => {
    if (ownRule(id)) return 'direct';
    const custom = lg.custom.types.get(id);
    if (custom && custom.superType && ownRule(custom.superType)) return 'superType';
    const map = lg.custom.scopes.get(id);
    if (map && (map.scopes || []).some(tmCovers)) return 'textmate';
    return 'none';
  };

  const allTypes = [...lg.std.types, ...lg.custom.types.keys()];
  const byClass = { direct: [], superType: [], textmate: [], none: [] };
  for (const t of allTypes) byClass[classify(t)].push(t);

  const stdMods = lg.std.modifiers;
  const customMods = [...lg.custom.modifiers.keys()];
  return {
    selectors: selectors.length,
    wildcard: parsed.filter((p) => p.type === '*').map((p) => p.sel),
    types: { total: allTypes.length, ...byClass },
    modifiers: {
      standard: { total: stdMods.length, covered: stdMods.filter(modRule), missing: stdMods.filter((m) => !modRule(m)) },
      custom: { total: customMods.length, covered: customMods.filter(modRule), missing: customMods.filter((m) => !modRule(m)) },
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith('semantic-legend.mjs')) {
  const lg = legend();
  console.log(`tipuri standard ${lg.std.types.length}: ${lg.std.types.join(', ')}`);
  console.log(`\nmodificatori standard ${lg.std.modifiers.length}: ${lg.std.modifiers.join(', ')}`);
  console.log(`\ntipuri proprii declarate de extensii ${lg.custom.types.size}:`);
  for (const [id, v] of lg.custom.types) console.log(`  ${id.padEnd(22)} ${(v.superType || '').padEnd(12)} ${v.from}`);
  console.log(`\nmodificatori proprii ${lg.custom.modifiers.size}:`);
  for (const [id, v] of lg.custom.modifiers) console.log(`  ${id.padEnd(24)} ${v.from}`);
  const t = JSON.parse(fs.readFileSync(new URL('../themes/quantum-dark.json', import.meta.url), 'utf8'));
  const tm = new Set();
  for (const r of t.tokenColors) for (const x of [].concat(r.scope)) tm.add(x.trim());
  const c = coverage(t.semanticTokenColors, lg, tm);
  console.log(`\nselectorii mei: ${c.selectors}, dintre care generici: ${c.wildcard.join(', ') || 'niciunul'}`);
  console.log(`\ntipuri, ${c.types.total} in total`);
  console.log(`  regula proprie      ${c.types.direct.length}`);
  console.log(`  prin superType      ${c.types.superType.length}  ${c.types.superType.join(', ')}`);
  console.log(`  prin mapare TextMate ${c.types.textmate.length}  ${c.types.textmate.join(', ')}`);
  console.log(`  DELOC               ${c.types.none.length}  ${c.types.none.join(', ')}`);
  console.log(`\nmodificatori standard, ${c.modifiers.standard.total}`);
  console.log(`  acoperiti ${c.modifiers.standard.covered.join(', ') || 'niciunul'}`);
  console.log(`  LIPSA     ${c.modifiers.standard.missing.join(', ') || 'niciunul'}`);
  console.log(`\nmodificatori proprii, ${c.modifiers.custom.total}`);
  console.log(`  acoperiti ${c.modifiers.custom.covered.join(', ') || 'niciunul'}`);
}

export const DELIBERATE_MODIFIERS = [
  { modifier: 'modification', schemes: ['grammar', 'provenance', 'effect'],
    why: 'accesul de scriere e ideea schemei borrow. In restul schemelor l-as marca pe fiecare atribuire, ceea ce ar face codul zgomotos fara sa adauge informatie' },
];

export const VENDOR_ONLY = {
  why: 'modificatorii proprii ai unui furnizor, ca terraform-resource sau typeHintComment, cad pe culoarea tipului de baza si niciun furnizor nu ii coloreaza. Sunt acoperiti cei folositi larg, builtin si typeHint',
};

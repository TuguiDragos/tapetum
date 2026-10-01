// Tokenizes a few lines of everyday TypeScript with the grammar VS Code ships and writes every token
// with its scope stack to tools/paint-sample.json, so that paint-check can paint real code without VS Code.
// Run it with VSCODE_APP pointing at resources/app, and with the tokenizer installed as paint-check says.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { appRoot } from './vscode-path.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const vsctm = require('vscode-textmate');
const onig = require('vscode-oniguruma');

const LINES = [
  'type Point = { x: number; label: string };',
  'interface Shape { area(): number; readonly name: string }',
  'export type Id<T> = T extends string ? `id-${T}` : never;',
  'enum Mode { On = 1, Off }',
  'class Box<T> implements Shape {',
  "  constructor(private readonly size: number, public name = 'box') {}",
  '  area(): number { return this.size ** 2; }',
  '}',
  'const box = new Box<Point>(3);',
  'function measure(p: Point): number { return p.x * 2; }',
];

const app = appRoot();
const file = path.join(app, 'extensions/typescript-basics/syntaxes/TypeScript.tmLanguage.json');
const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
const wasm = fs.readFileSync(path.join(path.dirname(require.resolve('vscode-oniguruma')), 'onig.wasm')).buffer;
const registry = new vsctm.Registry({
  onigLib: onig.loadWASM(wasm).then(() => ({
    createOnigScanner: (patterns) => new onig.OnigScanner(patterns),
    createOnigString: (s) => new onig.OnigString(s),
  })),
  loadGrammar: async (scope) => (scope === grammar.scopeName ? grammar : null),
});
const g = await registry.loadGrammar(grammar.scopeName);
const tokens = [];
let state = vsctm.INITIAL;
for (const line of LINES) {
  const r = g.tokenizeLine(line, state);
  for (const t of r.tokens) {
    const text = line.slice(t.startIndex, t.endIndex);
    if (text.trim()) tokens.push({ text, scopes: t.scopes });
  }
  state = r.ruleStack;
}
if (!tokens.length) { console.error('the grammar gave no tokens, nothing written'); process.exit(1); }
const version = JSON.parse(fs.readFileSync(path.join(app, 'product.json'), 'utf8')).version;
fs.writeFileSync(path.join(HERE, 'paint-sample.json'), JSON.stringify({ vscode: version, grammar: path.relative(app, file), lines: LINES, tokens }, null, 1) + '\n');
console.log(`${tokens.length} tokens from ${LINES.length} lines of TypeScript, VS Code ${version}`);

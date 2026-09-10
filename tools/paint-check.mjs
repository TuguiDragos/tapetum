// Every rule of every theme, painted as it says. Each plain selector of each rule is tokenized with
// vscode-textmate, the library VS Code itself uses to colour code, and the colour and style that come
// out must be the rule's own. They are not always: in VS Code's theme trie a selector inherits the style
// of the rules on the selectors above it (keyword.type.go inherits the italic of keyword.type unless it
// names a style of its own), and a later rule with the same selector takes the colour. The schemes lean
// on a few inheritances on purpose; those are listed below with their reasons, and anything else fails.
// A selector named by more than 1 rule fails as well, whatever the settings: the later rule silently wins,
// which is how C# builtin types came to be painted as keywords. A selector with a parent part
// ("markup.bold markup.italic") cannot be tokenized without its context and is left out; analyze and
// audit cover those rules.
//
// Needs the tokenizer next to the repository; it is not a dependency of the package:
//   npm install --no-save --no-package-lock vscode-textmate@9.3.2 vscode-oniguruma@2.0.1
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { FAMILIES } from './palettes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const require = createRequire(import.meta.url);
let vsctm, onig;
try {
  vsctm = require('vscode-textmate');
  onig = require('vscode-oniguruma');
} catch {
  console.error('paint-check needs the tokenizer VS Code uses, next to the repository:\n  npm install --no-save --no-package-lock vscode-textmate@9.3.2 vscode-oniguruma@2.0.1');
  process.exit(2);
}

// Inheritances the schemes ask for. Each entry allows 1 extra style on the selectors it names, in the
// schemes it names (every scheme when none is named), and says why.
const INTENDED = [
  { scope: /^support\./, style: 'italic',
    why: 'what the language hands you is italic: the rule that says so names the bare support scope, and the rules that only recolour a part of it inherit the italic on purpose' },
  { scope: /^entity\.other\.attribute-name\.[a-z-]+\.css$/, style: 'italic',
    why: 'attribute names are italic, and the CSS grammar files class, id and pseudo selectors as attribute names' },
  { scope: /^string\.other\.link\.title\.markdown$/, style: 'underline', schemes: ['grammar'],
    why: 'the visible text of a markdown link is underlined like the link itself' },
  { scope: /^entity\.name\.type\.error$/, style: 'bold', schemes: ['borrow', 'effect', 'signal', 'tone'],
    why: 'error types are types, and type names are bold in the schemes that set them apart by weight' },
  { scope: /^entity\.name\.tag\.(css|yaml)$/, style: 'bold', schemes: ['provenance'],
    why: 'tags are bold in Provenance, and the CSS tag selector and the YAML key carry the tag scope' },
  { scope: /^constant\./, style: 'bold', schemes: ['tone'],
    why: 'constants are bold in the tone families, whichever rule names the constant' },
];

const STYLES = ['italic', 'bold', 'underline', 'strikethrough'];
const styleSet = (s) => new Set((s || '').split(' ').filter((x) => STYLES.includes(x)));
const styleOf = (bits) => new Set(STYLES.filter((s, i) => bits & (1 << i)));
const show = (set) => [...set].sort().join(' ') || 'upright';

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const schemeOf = (file) => {
  const id = path.basename(file).replace(/-(dark|light|hcDark|hcLight)\.json$/, '');
  return (FAMILIES.find((f) => f.id === id) || {}).scheme || 'grammar';
};

const wasm = fs.readFileSync(path.join(path.dirname(require.resolve('vscode-oniguruma')), 'onig.wasm')).buffer;
const onigLib = onig.loadWASM(wasm).then(() => ({
  createOnigScanner: (patterns) => new onig.OnigScanner(patterns),
  createOnigString: (s) => new onig.OnigString(s),
}));

async function paint(theme) {
  // the last rule naming a selector is the one VS Code applies for it; a selector named twice is a problem
  const last = new Map();
  const twice = new Map();
  for (const rule of theme.tokenColors) for (const raw of [].concat(rule.scope)) {
    const selector = String(raw).trim();
    if (!selector || /\s/.test(selector)) continue;
    if (last.has(selector)) (twice.get(selector) || twice.set(selector, [last.get(selector).name]).get(selector)).push(rule.name);
    last.set(selector, rule);
  }
  const selectors = [...last.keys()];
  const grammar = { scopeName: 'source.paint-check', patterns: selectors.map((s, i) => ({ match: `^S${i}$`, name: s })) };
  const registry = new vsctm.Registry({
    onigLib,
    loadGrammar: async () => grammar,
    theme: {
      name: theme.name,
      settings: [
        { settings: { foreground: theme.colors['editor.foreground'], background: theme.colors['editor.background'] } },
        ...theme.tokenColors.map((r) => ({ scope: r.scope, settings: r.settings })),
      ],
    },
  });
  const g = await registry.loadGrammar('source.paint-check');
  const colors = registry.getColorMap();
  const out = [];
  selectors.forEach((selector, i) => {
    const meta = g.tokenizeLine2(`S${i}`, vsctm.INITIAL).tokens[1];
    const painted = { colour: (colors[(meta >>> 15) & 0x1ff] || '').toLowerCase(), style: styleOf((meta >>> 11) & 0xf) };
    const rule = last.get(selector);
    const wants = { colour: (rule.settings.foreground || theme.colors['editor.foreground']).toLowerCase(), style: styleSet(rule.settings.fontStyle) };
    out.push({ selector, rule: rule.name, wants, painted, twice: twice.get(selector) });
  });
  return out;
}

function judge(entry, scheme) {
  const { selector, rule, wants, painted, twice } = entry;
  const problems = [];
  if (twice) problems.push(`[named twice] ${selector}: in ${twice.map((n) => `"${n}"`).join(' and ')}, the later rule wins`);
  const extra = [...painted.style].filter((s) => !wants.style.has(s));
  const documented = [];
  for (const s of extra) {
    const hit = INTENDED.find((d) => d.style === s && d.scope.test(selector) && (!d.schemes || d.schemes.includes(scheme)));
    if (hit) documented.push(hit);
    else problems.push(`[inherited] ${selector}: the rule "${rule}" says ${show(wants.style)}, painted ${show(painted.style)}, the ${s} comes from a rule above it`);
  }
  return { problems, documented };
}

let total = 0, documentedSelectors = 0;
const used = new Set();
for (const entry of pkg.contributes.themes) {
  const file = path.join(ROOT, entry.path.slice(2));
  const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
  const scheme = schemeOf(file);
  const painted = await paint(theme);
  const problems = [];
  for (const p of painted) {
    const j = judge(p, scheme);
    problems.push(...j.problems);
    if (j.documented.length) { documentedSelectors++; for (const d of j.documented) used.add(d); }
  }
  total += problems.length;
  if (!problems.length) { console.log(`${entry.label.padEnd(40)} ${String(painted.length).padStart(4)} selectors   painted as written`); continue; }
  console.log(`\n${entry.label}   ${problems.length} problems`);
  for (const p of problems) console.log(`   ${p}`);
}
console.log(`\ndocumented inheritances: ${INTENDED.length}, ${used.size} of them in use, on ${documentedSelectors} selector paintings`);
for (const d of INTENDED) console.log(`   ${d.style} on ${d.scope.source}${d.schemes ? ` in ${d.schemes.join(', ')}` : ''}: ${d.why}`);
console.log(total ? `TOTAL ${total} problems` : `ALL ${pkg.contributes.themes.length} PASS`);
process.exit(total ? 1 : 0);

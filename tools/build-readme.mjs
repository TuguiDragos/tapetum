import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES } from './palettes.mjs';
import { contrast, deltaE } from './color.mjs';
import { STORIES, SOURCES, SHOTS, README_ORDER } from './stories.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const RAW = 'https://raw.githubusercontent.com/TuguiDragos/tapetum/main/readme-assets';
const badges = fs.readFileSync(path.join(HERE, 'readme-badges.html'), 'utf8').trimEnd();
const downloads = fs.readFileSync(path.join(HERE, 'readme-downloads.html'), 'utf8').trimEnd();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VARIANTS = ['dark', 'light', 'hcDark', 'hcLight'];
const THEME_COUNT = FAMILIES.reduce((n, f) => n + VARIANTS.filter((k) => f[k]).length, 0);
const HC = FAMILIES.filter((f) => f.hcDark || f.hcLight);
const SHOWN = README_ORDER.map((id) => FAMILIES.find((f) => f.id === id)).filter(Boolean);
const REST = FAMILIES.filter((f) => !README_ORDER.includes(f.id)).sort((a, b) => a.label.localeCompare(b.label));
const ORDERED = [...SHOWN, ...REST];
const DARK_COUNT = FAMILIES.filter((f) => f.dark).length;
const HUE_ROLES = ['keyword', 'func', 'string', 'type', 'number', 'tag'];
let closest = 99;
for (const v of ['dark', 'light']) {
  for (let i = 0; i < FAMILIES.length; i += 1) {
    for (let j = i + 1; j < FAMILIES.length; j += 1) {
      const d = HUE_ROLES.reduce((sum, r) => sum + deltaE(FAMILIES[i][v][r], FAMILIES[j][v][r]), 0) / HUE_ROLES.length;
      if (d < closest) closest = d;
    }
  }
}
const FAMILY_GAP = Math.floor(closest);
const REGISTRY = JSON.parse(fs.readFileSync(path.join(HERE, 'vscode-color-keys-full.json'), 'utf8'));
const KEY_COUNT = REGISTRY.confirmedReal.filter((k) => !REGISTRY.deprecated.includes(k)).length;
const LOWEST = Math.min(...FAMILIES.flatMap((f) => VARIANTS.filter((v) => f[v])
  .flatMap((v) => [...HUE_ROLES, 'comment'].map((r) => contrast(f[v][r], f[v].bg))))).toFixed(2);
if (ORDERED.length !== FAMILIES.length) throw new Error('the README order does not cover every family');

const SCHEME = {
  grammar: 'grammar', provenance: 'provenance', borrow: 'borrow',
  effect: 'effect', signal: 'signal', tone: 'tone',
};

const ROWS = [
  ['background', 'bg'], ['foreground', 'fg'], ['keyword', 'keyword'], ['function', 'func'],
  ['string', 'string'], ['type', 'type'], ['number', 'number'], ['tag', 'tag'], ['comment', 'comment'],
];

function family(fam) {
  const shots = (SHOTS[fam.id] || [])
    .map((v) => `<p align="center"><img src="${RAW}/tapetum-${fam.id}-${v}.png" alt="${fam.label}${v === 'light' ? ' Light' : ''}" width="900" /></p>`)
    .join('\n');
  const cols = VARIANTS.filter((v) => fam[v]);
  const head = `| | ${cols.map((v) => `\`Tapetum ${fam.label}${{ dark: '', light: ' Light', hcDark: ' High Contrast', hcLight: ' High Contrast Light' }[v]}\``).join(' | ')} |`;
  const sep = `| --- | ${cols.map(() => '---').join(' | ')} |`;
  const rows = ROWS.map(([label, key]) => `| ${label} | ${cols.map((v) => `\`${fam[v][key]}\``).join(' | ')} |`).join('\n');
  const depth = fam.dark.depth
    ? `\n| nesting depth | ${cols.map((v) => (fam[v].depth || []).map((d) => `\`${d}\``).join(' ') || '-').join(' | ')} |`
    : '';
  const scheme = fam.scheme && fam.scheme !== 'grammar' ? ' &nbsp;`' + SCHEME[fam.scheme] + '` scheme' : '';
  return `### ${fam.label}

${shots ? shots + '\n\n' : ''}${STORIES[fam.id].trim()}

<details>
<summary>${SOURCES[fam.id]}${scheme}</summary>

${head}
${sep}
${rows}${depth}

</details>`;
}

const counts = {};
for (const f of FAMILIES) counts[f.scheme || 'grammar'] = (counts[f.scheme || 'grammar'] || 0) + 1;
const named = (s) => FAMILIES.filter((f) => (f.scheme || 'grammar') === s).map((f) => f.label).join(', ');

// Every scope and semantic selector that carries italic, read from the generated themes, so the
// switch in the README stays complete when the rules change. The 6 schemes style a scope differently
// (italic here, bold there, plain elsewhere), so the TextMate side has 1 entry per scheme, scoped to
// that scheme's families, and the entry states what stays once italic is gone: nothing, bold or
// underline. The semantic side is 1 entry for all, because turning italic off where it is not on
// changes nothing.
const ITALIC = (() => {
  const schemeOf = (id) => (FAMILIES.find((x) => x.id === id) || {}).scheme || 'grammar';
  const schemes = [...new Set(FAMILIES.map((x) => x.scheme || 'grammar'))];
  const blocks = [];
  const semantic = new Set();
  let scopes = 0;
  for (const scheme of schemes) {
    const families = FAMILIES.filter((x) => (x.scheme || 'grammar') === scheme);
    const groups = new Map();
    for (const e of pkg.contributes.themes) {
      const id = e.path.replace('./themes/', '').replace(/-(dark|light|hcDark|hcLight)\.json$/, '');
      if (schemeOf(id) !== scheme) continue;
      const t = JSON.parse(fs.readFileSync(path.join(ROOT, e.path.slice(2)), 'utf8'));
      const last = new Map();
      for (const r of t.tokenColors) for (const scope of [].concat(r.scope)) last.set(scope.trim(), r.settings.fontStyle || '');
      for (const [scope, style] of last) {
        const parts = style.split(' ').filter(Boolean);
        if (!parts.includes('italic')) continue;
        const rest = parts.filter((x) => x !== 'italic').join(' ');
        if (!groups.has(rest)) groups.set(rest, new Set());
        groups.get(rest).add(scope);
      }
      for (const [selector, v] of Object.entries(t.semanticTokenColors || {})) {
        if (v && typeof v === 'object' && (v.italic === true || /italic/.test(v.fontStyle || ''))) semantic.add(selector);
      }
    }
    const seen = new Map();
    for (const [rest, set] of groups) for (const scope of set) {
      if (seen.has(scope) && seen.get(scope) !== rest) throw new Error(`${scope} keeps 2 styles inside the ${scheme} scheme`);
      seen.set(scope, rest);
    }
    scopes += seen.size;
    blocks.push({ key: families.map((x) => `[Tapetum ${x.label}*]`).join(''), groups });
  }
  const wrap = (items, indent) => {
    const lines = [];
    let line = '';
    for (const item of items) {
      const piece = JSON.stringify(item);
      if (line && (line + ', ' + piece).length > 78 - indent) { lines.push(line + ','); line = piece; }
      else line = line ? line + ', ' + piece : piece;
    }
    if (line) lines.push(line);
    return lines.map((l) => ' '.repeat(indent) + l).join('\n');
  };
  const entry = (block) => {
    const order = [...block.groups.keys()].sort((a, b) => a.length - b.length || a.localeCompare(b));
    const rules = order.map((rest) => `        {
          "scope": [
${wrap([...block.groups.get(rest)].sort(), 12)}
          ],
          "settings": { "fontStyle": ${JSON.stringify(rest)} }
        }`).join(',\n');
    return `    ${JSON.stringify(block.key)}: {
      "textMateRules": [
${rules}
      ]
    }`;
  };
  const sem = [...semantic].sort().map((x) => `        ${JSON.stringify(x)}: { "italic": false }`).join(',\n');
  const snippet = `{
  "editor.tokenColorCustomizations": {
${blocks.map(entry).join(',\n')}
  },
  "editor.semanticTokenColorCustomizations": {
    "[Tapetum*]": {
      "rules": {
${sem}
      }
    }
  }
}`;
  return { scopes, selectors: semantic.size, schemes: blocks.length, snippet };
})();

const md = `${badges}

<h1 align="center">
  <img src="${RAW}/tapetum-fan-512.png" alt="" width="56" align="center" />
  &nbsp;${pkg.displayName}
</h1>

${downloads}

<p align="center">
  <b>${THEME_COUNT} themes for VS Code and Open VSX, drawn from things that actually make colour.</b>
</p>

---

Almost every animal that hunts at night carries a mirror behind its retina.
Light that would have passed straight through is thrown back for a second pass,
so almost none of it is wasted. It is why a cat sees where we see nothing, and
why its eyes flare when a torch finds them.

The mirror is called the *tapetum lucidum*, and every animal throws back its own
colour: green in cats, blue in horses, red in alligators, white in spiders. 1
structure, and no 2 of them look alike.

You also spend your nights looking at light. This is a collection of ways to
throw it back: ${FAMILIES.length} families, each in a dark and a light variant, plus ${HC.length === 1 ? 'a high contrast pair' : HC.length + ' high contrast pairs'} for ${HC.map((f) => f.label).join(' and ')}.

## Families

${SHOWN.map(family).join('\n\n')}

### A quick tour of all ${THEME_COUNT}

Every theme in the collection, applied live while scrolling the picker.

<p align="center"><img src="${RAW}/tapetum-all-themes-dark.gif" alt="All Tapetum dark themes" width="900" /></p>

**The dark half.** ${DARK_COUNT} of them, each drawn from something in the physical
world that emits or bends light: emission lines, phosphor, anodised metal, deep
sea bioluminescence, the blue glow of a reactor pool. No 2 of them share a
palette: across the 6 roles that carry a hue, the closest pair still averages
${FAMILY_GAP} dE apart, so switching family is a real change and not a shade of one.

<p align="center"><img src="${RAW}/tapetum-all-themes-light.gif" alt="All Tapetum light themes" width="900" /></p>

**The light half.** Not inversions of the dark ones. A colour that reads clearly
on black is often unreadable on white, and the reverse holds just as firmly, so
every light palette was placed by hand and measured on its own ground. Same
families, same sources, different physics.

${REST.map(family).join('\n\n')}

## ${Object.keys(counts).length} ways of colouring code

Almost every theme in existence answers a single question: what kind of symbol
is this. Keyword, string, number, type. Tapetum ships that one and
${Object.keys(counts).length - 1} others, and the answer is a property of the theme, so changing
theme changes the question.

**grammar** &nbsp;·&nbsp; *${counts.grammar} families*<br>
What kind of symbol it is. The classic, and what nearly every theme does.

**provenance** &nbsp;·&nbsp; *${named('provenance')}*<br>
Where the symbol came from. Gold and bold for what you wrote here, cyan and
italic for what the language handed you, violet for what cannot change.
Keywords are dimmed, because you already know \`function\` is a function.

**borrow** &nbsp;·&nbsp; *${named('borrow')}*<br>
Whether a value can change. Cold for frozen, warm for mutable, green and italic
for borrowed parameters, and a name lights up at the exact point you write to it.

**effect** &nbsp;·&nbsp; *${named('effect')}*<br>
Whether a line touches the outside world. \`await\`, \`async\`, \`throw\` and every
mutation burn. Pure computation stays cold.

**signal** &nbsp;·&nbsp; *${named('signal')}*<br>
Signal against boilerplate. Keywords, imports, punctuation and type annotations
are scraped back toward the background. Only the names you chose and the data
you care about stay lit.

**tone** &nbsp;·&nbsp; *${named('tone')}*<br>
Nothing at all. No hue in the code, only 6 tones plus weight and italic.

<br>

3 of these read your language server rather than the grammar. \`provenance\`,
\`borrow\` and \`effect\` use the semantic tokens it emits, including the
\`declaration\`, \`defaultLibrary\`, \`readonly\`, \`static\`, \`modification\` and
\`async\` modifiers that most themes never touch. They fall back to grammar rules
when no server is running, so open a real file rather than a scratch buffer the
first time you try one.

In \`grammar\`, 6 roles carry their own hue: keywords, strings, functions, types,
numbers and tags. Parameters and properties take the foreground colour and are
told apart by italic instead, because a 7th saturated hue cannot be held away
from the other 6 without washing all of them out.

## How they are checked

Colour is a judgement call, so every value here was placed by hand. An earlier
version let an optimiser choose them and it converged on something worse: 2 of
the families came out under 2 dE apart, and it had bleached the keywords to near
grey chasing its own objective.

What a machine is good for is catching what a person misses. On all
${THEME_COUNT} variants:

| | |
| --- | --- |
| **Contrast** | every syntax colour against its own background, and every piece of interface text against the surface it actually sits on. Syntax clears 4.5 to 1, comments clear 4.0, and the lowest value anywhere is ${LOWEST} |
| **Separation** | CIEDE2000 between every pair of coloured roles, and between every pair of families, so no 2 look like each other |
| **Coverage** | all ${KEY_COUNT} colour keys VS Code ${REGISTRY.vscode} registers and has not deprecated, including the chat, agents, sessions window, inline edit and modern tab surfaces most themes leave to the defaults |
| **Editors** | verified one by one on the current VSCodium, Cursor, Windsurf, code-server, Positron, Kiro, Trae, Antigravity and Void, and on the macOS, Linux and Windows builds of VS Code ${REGISTRY.vscode} |

None of that comes from a hand written list. \`tools/extract-keys.mjs\` reads the
colour registry out of every window bundle of the installed editor, including the
sessions window that 1.136 moved into a bundle of its own, and records which keys
are deprecated. \`tools/extract-pairs.mjs\` reads every stylesheet and collects
each foreground and background used in the same rule, weighing a \`color-mix()\`
by the share of each colour, so what gets checked is what the editor actually
paints together. \`tools/extract-derivations.mjs\` reads
the keys whose default is another key, which catches the class of bug where a
value quietly contradicts the surface beneath it. \`tools/paint-check.mjs\`
tokenizes every selector of every rule with \`vscode-textmate\`, the library VS
Code itself uses to colour code, so a rule that inherits a style from a rule
above it, or loses its colour to a rule below it, is caught before it ships.
The 3 files the extractors write are committed, checked in CI against every
theme, and refreshed by a weekly workflow
that downloads the current VS Code build, so a new surface is noticed by a
machine rather than by a person.

The same measurements run against the editors that install from Open VSX, and
against the other platforms. The current VSCodium, Cursor, Windsurf, code-server,
Positron, Kiro, Trae, Antigravity and Void builds were each read the same way,
registry, stylesheets and derivations, and every theme checked on every one of
them; the keys their older cores do not know yet are ignored by them, and the 35
surfaces those editors paint in colours of their own, listed with their reasons
in \`tools/forks.mjs\`, take the family's colour instead; \`tools/fork-check.mjs\`
repeats those measurements on any editor from 1 command. The registry, pairs and
derivations extracted from the Linux and Windows builds of VS Code ${REGISTRY.vscode}
are identical to the macOS ones, byte for byte, so what holds on one holds on all
3.

\`\`\`bash
node tools/analyze.mjs    # all ${THEME_COUNT}, against the real pairs
node tools/audit.mjs      # structure, schemes, manifest, files and this README
node tools/paint-check.mjs   # every rule painted as written, with VS Code's own tokenizer
node tools/compare.mjs    # against every theme Microsoft ships
node tools/fork-check.mjs kiro <resources/app>   # the same checks, on another editor
\`\`\`

## Install

\`\`\`bash
code --install-extension tuguidragos.tapetum
\`\`\`

Or from [the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=tuguidragos.tapetum),
or [Open VSX](https://open-vsx.org/extension/tuguidragos/tapetum), which is where
VSCodium, Cursor, Windsurf, Positron, Kiro, Trae, Antigravity, Void, Gitpod,
code-server and Theia install from.

Press \`Cmd K\` then \`Cmd T\`, or \`Ctrl K\` then \`Ctrl T\` on Windows and Linux, and
type a family name to filter. Every family is \`Tapetum <Family>\` for the dark
variant and \`Tapetum <Family> Light\` for the light one.

## Making one your own

Any colour can be overridden per theme, without forking anything:

\`\`\`jsonc
{
  "workbench.colorCustomizations": {
    "[Tapetum Quantum]": {
      "editor.background": "#080B14"
    }
  },
  "editor.tokenColorCustomizations": {
    "[Tapetum Quantum]": {
      "comments": "#7580AD"
    }
  }
}
\`\`\`

Italic carries meaning in 2 families, Borrow, where it marks a borrowed value,
and Effect, which has no hue to spare, and everywhere else it marks comments,
parameters, imports, decorators and a few more. To switch it off in all
${THEME_COUNT} themes at once, paste this into your settings. VS Code matches a
theme scope that ends in \`*\` against every theme whose name starts that way, so
each of the ${ITALIC.schemes} schemes gets 1 entry for its own families, stating what
stays once italic is gone: nothing, bold or underline. The ${ITALIC.scopes} scopes and
${ITALIC.selectors} semantic selectors are read from the rules themselves, so the
list stays complete when the rules change:

\`\`\`jsonc
${ITALIC.snippet}
\`\`\`

`;

fs.writeFileSync(path.join(ROOT, 'README.md'), md);
console.log(`README written, ${md.split('\n').length} lines, ${FAMILIES.length} families, ${Object.keys(SHOTS).length} with screenshots`);

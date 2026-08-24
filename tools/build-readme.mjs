import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES } from './palettes.mjs';
import { STORIES, SOURCES, SHOTS, README_ORDER } from './stories.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const RAW = 'https://raw.githubusercontent.com/TuguiDragos/tapetum/main/readme-assets';
const badges = fs.readFileSync(path.join(HERE, 'readme-badges.html'), 'utf8').trimEnd();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VARIANTS = ['dark', 'light', 'hcDark', 'hcLight'];
const THEME_COUNT = FAMILIES.reduce((n, f) => n + VARIANTS.filter((k) => f[k]).length, 0);
const HC = FAMILIES.filter((f) => f.hcDark || f.hcLight);
const ORDERED = [
  ...README_ORDER.map((id) => FAMILIES.find((f) => f.id === id)).filter(Boolean),
  ...FAMILIES.filter((f) => !README_ORDER.includes(f.id)),
];
if (ORDERED.length !== FAMILIES.length) throw new Error('ordinea din README nu acopera toate familiile');

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

const md = `${badges}

<h1 align="center">
  <img src="${RAW}/tapetum-fan-512.png" alt="" width="56" align="center" />
  &nbsp;${pkg.displayName}
</h1>

<p align="center">
  <b>${THEME_COUNT} themes for VS Code and Open VSX, drawn from things that actually make colour.</b>
</p>

---

The *tapetum lucidum* is the mirror behind the retina that makes a cat's eyes
flare in the dark. The same structure sits in almost every nocturnal animal, and
each one throws back a different colour: green in cats, blue in horses, red in
alligators, white in spiders. One mechanism, a whole collection of colours.

${FAMILIES.length} families, each in a dark and a light variant, plus ${HC.length === 1 ? 'a high contrast pair' : HC.length + ' high contrast pairs'} for ${HC.map((f) => f.label).join(' and ')}.
${Object.keys(SHOTS).length} of them have screenshots below. Every family has its full colour table under
the name, and there are two recordings at the end that run through all ${THEME_COUNT}.

## Families

${ORDERED.map(family).join('\n\n')}

## All ${THEME_COUNT}, in one pass

Every theme in the collection, applied live while scrolling the picker.

<p align="center"><img src="${RAW}/tapetum-all-themes-dark.gif" alt="All Tapetum dark themes" width="900" /></p>

That was the dark half. The light variants are not inversions of it. A colour
that reads clearly at Lc 80 on black is often unreadable on white, and the
reverse holds just as firmly, so every light palette was placed by hand and
measured on its own ground. Same families, same sources, different physics.

<p align="center"><img src="${RAW}/tapetum-all-themes-light.gif" alt="All Tapetum light themes" width="900" /></p>

## ${Object.keys(counts).length} ways of colouring code

Almost every theme in existence answers one question: what kind of symbol is
this. Keyword, string, number, type. Tapetum ships that scheme and ${Object.keys(counts).length - 1} others.
The scheme is a property of the theme, so switching theme switches the rule.

| Scheme | What colour means | Families |
| --- | --- | --- |
| **grammar** | What kind of symbol it is. The classic. | ${counts.grammar} |
| **provenance** | Where the symbol came from. Gold and bold for what you defined here, cyan and italic for what the language gave you, violet for what cannot change. Keywords are dimmed, because you already know \`function\` is a function. | ${named('provenance')} |
| **borrow** | Whether it can change. Cold for frozen, warm for mutable, green and italic for borrowed parameters, and the name lights up at the exact point you write to it. | ${named('borrow')} |
| **effect** | Whether it touches the outside world. \`await\`, \`async\`, \`throw\` and every mutation burn. Pure computation stays cold. | ${named('effect')} |
| **signal** | Signal against boilerplate. Keywords, imports, punctuation and type annotations are scraped back toward the background. Only the names you chose and the data stay lit. | ${named('signal')} |
| **tone** | Nothing. There is no hue in the code at all, only 6 tones plus weight and italic. | ${named('tone')} |

\`provenance\`, \`borrow\` and \`effect\` read the semantic tokens your language
server emits, including the \`declaration\`, \`defaultLibrary\`, \`readonly\`,
\`static\`, \`modification\` and \`async\` modifiers that most themes ignore. They
fall back to grammar rules where no language server is running, so open a real
file rather than a scratch buffer when you try them.

## How they are checked

Colour is a judgement call, so every value here is placed by hand. An earlier
version let an optimiser choose them and it converged: 2 of the families came
out under 2 dE apart, and it had bleached the keywords to near grey chasing its
own objective.

What is measured, on all ${THEME_COUNT} variants:

- **Contrast.** Every syntax colour against its own background, and every piece
  of interface text against the surface it actually sits on. Syntax clears
  4.5 to 1, comments clear 4.0. The lowest value anywhere is 4.53.
- **Separation.** CIEDE2000 between every pair of coloured roles, and between
  every pair of families so no two look like each other.
- **Coverage.** All 964 colour keys registered in the running VS Code build,
  including the chat, agents, inline edit and modern tab surfaces that most
  themes leave to the defaults.

The checks are not a hand-written list. \`tools/extract-pairs.mjs\` reads the
workbench stylesheet out of the installed editor and collects every foreground
and background used in the same rule, so what gets checked is what VS Code
actually paints together. \`tools/extract-derivations.mjs\` reads the binary for
the keys whose default is another key, which catches the class of bug where a
value contradicts the surface beneath it.

\`\`\`bash
node tools/analyze.mjs    # all ${THEME_COUNT}, against the real pairs
node tools/audit.mjs      # structure, schemes, manifest, files and this README
node tools/compare.mjs    # against every theme Microsoft ships
\`\`\`

In the \`grammar\` scheme, 6 roles carry their own hue: keywords, strings,
functions, types, numbers and tags. Parameters and properties take the
foreground colour and are told apart by italic, because a 7th saturated hue
cannot be held away from the other 6 without washing all of them out.

## Customizing

Override anything per theme in your \`settings.json\`:

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

## Install

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=tuguidragos.tapetum)
- [Open VSX](https://open-vsx.org/extension/tuguidragos/tapetum), which is what VSCodium, Cursor, Windsurf, Gitpod, code-server and Theia install from

\`\`\`bash
code --install-extension tuguidragos.tapetum
\`\`\`

Every family ships as \`Tapetum <Family>\` for the dark variant and
\`Tapetum <Family> Light\` for the light one. Switch with \`Cmd+K Cmd+T\`, or
\`Ctrl+K Ctrl+T\` on Windows and Linux, and type the family name to filter.

`;

fs.writeFileSync(path.join(ROOT, 'README.md'), md);
console.log(`README scris, ${md.split('\n').length} linii, ${FAMILIES.length} familii, ${Object.keys(SHOTS).length} cu capturi`);

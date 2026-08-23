import fs from 'node:fs';

const CSS = '/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css';
const css = fs.readFileSync(CSS, 'utf8');

const varToKey = (v) => v.replace(/^--vscode-/, '').replace(/-/g, '.');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];

const FG_PROP = /(^|;)\s*color\s*:\s*([^;]+)/g;
const BG_PROP = /(^|;)\s*background(-color)?\s*:\s*([^;]+)/g;
const BORDER = /(^|;)\s*(border[a-z-]*|outline)\s*:\s*([^;]+)/g;
const VAR = /var\(\s*(--vscode-[A-Za-z0-9-]+)/g;

const pairs = new Map();
const selectorFor = new Map();

for (const [, sel, body] of rules) {
  const fgs = new Set(), bgs = new Set();
  for (const m of body.matchAll(FG_PROP)) for (const v of m[2].matchAll(VAR)) fgs.add(varToKey(v[1]));
  for (const m of body.matchAll(BG_PROP)) for (const v of m[3].matchAll(VAR)) bgs.add(varToKey(v[1]));
  if (!fgs.size || !bgs.size) continue;
  for (const f of fgs) for (const b of bgs) {
    if (f === b) continue;
    const k = f + '|' + b;
    pairs.set(k, (pairs.get(k) || 0) + 1);
    if (!selectorFor.has(k)) selectorFor.set(k, sel.trim().split(',')[0].slice(0, 90));
  }
}

const GENERIC_FG = new Set(['foreground', 'descriptionForeground', 'disabledForeground', 'errorForeground', 'icon.foreground']);
const NOT_A_SURFACE = /Border$|border|[Oo]utline|^contrast|^focusBorder$|^charts\.|Stroke$|shadow|Shadow|^sash\.|Separator$|indicator/;
const NOT_TEXT = /Border$|border|[Oo]utline|^contrast|shadow|Shadow|Background$|background/;
const root = (k) => k.split('.')[0];

const out = [...pairs.entries()]
  .map(([k, n]) => { const [fg, bg] = k.split('|'); return { fg, bg, n, sel: selectorFor.get(k) }; })
  .filter(({ fg, bg }) => {
    if (NOT_A_SURFACE.test(bg)) return false;
    if (NOT_TEXT.test(fg)) return false;
    if (!/[Ff]oreground$|^foreground$/.test(fg)) return false;
    if (root(fg) === root(bg)) return true;
    return GENERIC_FG.has(fg) && /[Bb]ackground$/.test(bg);
  })
  .sort((a, b) => b.n - a.n);

fs.writeFileSync('tools/render-pairs.json', JSON.stringify(out, null, 2));
console.log(`reguli CSS analizate: ${rules.length}`);
console.log(`perechi text/fundal care apar in aceeasi regula: ${out.length}`);
console.log('\nprimele 12:');
for (const p of out.slice(0, 12)) console.log(`  ${p.fg}  pe  ${p.bg}`);

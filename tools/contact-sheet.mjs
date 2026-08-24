import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canvas, encodePng } from './png-write.mjs';
import { parse, contrast } from './color.mjs';
import { FAMILIES } from './palettes.mjs';
const VARIANT_KEYS = (f) => ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k]);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const rgb = (hex) => { const { r, g, b } = parse(hex); return [r, g, b]; };

const S = 2;
const ROW = 34;
const W = 1180;
const PAD = 10;
const ROLES = ['keyword', 'func', 'string', 'type', 'number', 'tag', 'comment'];
const ANSI = ['Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan'];

const rows = [];
for (const fam of FAMILIES) for (const v of VARIANT_KEYS(fam)) {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${fam.id}-${v}.json`), 'utf8'));
  rows.push({ fam, v, t, p: fam[v] });
}

const H = PAD * 2 + rows.length * ROW;
const c = canvas(W * S, H * S);
c.fill([12, 12, 14]);

rows.forEach((row, i) => {
  const y = (PAD + i * ROW) * S;
  const h = (ROW - 4) * S;
  const p = row.p;
  const col = row.t.colors;
  c.rect(0, y, 150 * S, h, rgb(col['titleBar.activeBackground']));
  c.rect(150 * S, y, 60 * S, h, rgb(col['sideBar.background']));
  c.rect(210 * S, y, 420 * S, h, rgb(p.bg));
  const dot = 9 * S;
  ROLES.forEach((r, k) => c.circle((236 + k * 56) * S, y + h / 2, dot, rgb(p[r])));
  c.rect(630 * S, y, 20 * S, h, rgb(col['statusBar.background']));
  const depth = [1, 2, 3, 4, 5, 6].map((n) => col['editorBracketHighlight.foreground' + n]);
  depth.forEach((d, k) => c.rect((656 + k * 16) * S, y + 6 * S, 14 * S, h - 12 * S, rgb(d)));
  c.rect(760 * S, y, 8 * S, h, rgb(col['terminal.background']));
  ANSI.forEach((a, k) => {
    c.rect((776 + k * 26) * S, y + 4 * S, 11 * S, (h - 8 * S) / 2, rgb(col['terminal.ansi' + a]));
    c.rect((776 + k * 26) * S, y + h / 2, 11 * S, (h - 8 * S) / 2, rgb(col['terminal.ansiBright' + a]));
  });
  const st = [col['editorError.foreground'], col['editorWarning.foreground'], col['editorInfo.foreground']];
  st.forEach((sv, k) => c.circle((950 + k * 26) * S, y + h / 2, 8 * S, rgb(sv)));
  const worst = Math.min(...ROLES.slice(0, 6).map((r) => contrast(p[r], p.bg)));
  const bars = Math.max(1, Math.min(10, Math.round((worst - 4) * 2)));
  for (let b = 0; b < 10; b++) {
    const on = b < bars;
    c.rect((1040 + b * 12) * S, y + 10 * S, 8 * S, h - 20 * S,
      on ? rgb(worst < 5 ? '#c9a227' : '#4caf7d') : [34, 34, 38]);
  }
});

const out = c.downsample(S);
const file = path.join(ROOT, 'readme-assets', 'tapetum-contact-sheet.png');
fs.writeFileSync(file, encodePng(out.width, out.height, out.buf));
console.log(`plansa scrisa: ${rows.length} teme, ${out.width}x${out.height}, ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
console.log('coloane: bara de titlu, bara laterala, editor cu 7 roluri, bara de stare, 6 niveluri de paranteze, terminal cu 6 ANSI si variantele lor, 3 culori de stare, contrastul minim');

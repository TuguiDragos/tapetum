// Measures and crops the screenshots of the lab. Boxes are in device pixels: CSS pixels times the scale run.mjs records.
// Usage: node tools/lab/pixels.mjs box <png> <x> <y> <w> <h> [<ink colour>]
//        node tools/lab/pixels.mjs crop <dir> <x> <y> <w> <h>        crops each <name>_before.png and <name>_after.png into <dir>/crops
//        node tools/lab/pixels.mjs sheet <out.png> <pair prefix>...   stacks before over after for each pair
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from '../png-read.mjs';
import { encodePng } from '../png-write.mjs';
import { contrast, deltaE } from '../color.mjs';

const hex = (img, x, y) => { const i = (y * img.width + x) * img.channels; return '#' + [0, 1, 2].map((k) => img.data[i + k].toString(16).padStart(2, '0')).join(''); };
const rgb = (img, [x0, y0, w, h]) => {
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) out[(y * w + x) * 3 + k] = img.data[((y0 + y) * img.width + x0 + x) * img.channels + k];
  return { w, h, data: out };
};

// the ground is the commonest colour in the box; the ink is the given colour, counted exactly, or else the pixel farthest from the ground
function box(file, b, ink) {
  const img = decodePNG(file), count = new Map();
  for (let y = b[1]; y < b[1] + b[3]; y++) for (let x = b[0]; x < b[0] + b[2]; x++) { const c = hex(img, x, y); count.set(c, (count.get(c) || 0) + 1); }
  const [ground, n] = [...count].sort((p, q) => q[1] - p[1])[0];
  const far = ink ? ink.toLowerCase().slice(0, 7) : [...count.keys()].reduce((a, c) => (contrast(c, ground) > contrast(a, ground) ? c : a), ground);
  return { ground, groundShare: +(n / (b[2] * b[3])).toFixed(3), ink: far, inkPixels: count.get(far) || 0, contrast: +contrast(far, ground).toFixed(2), deltaE: +deltaE(far, ground).toFixed(2) };
}

const [mode, ...rest] = process.argv.slice(2);
const numbers = (list) => list.map(Number);
if (mode === 'box' && rest.length >= 5) {
  console.log(JSON.stringify(box(rest[0], numbers(rest.slice(1, 5)), rest[5])));
} else if (mode === 'crop' && rest.length === 5) {
  const [dir, ...b] = rest, crops = path.join(dir, 'crops');
  fs.mkdirSync(crops, { recursive: true });
  let pairs = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('_before.png'))) {
    const name = f.slice(0, -'_before.png'.length);
    if (!fs.existsSync(path.join(dir, `${name}_after.png`))) continue;
    for (const tag of ['before', 'after']) {
      const part = rgb(decodePNG(path.join(dir, `${name}_${tag}.png`)), numbers(b));
      fs.writeFileSync(path.join(crops, `${name}_${tag}.png`), encodePng(part.w, part.h, part.data));
    }
    pairs++;
  }
  console.log(`${pairs} pairs cropped into ${crops}`);
} else if (mode === 'sheet' && rest.length >= 2) {
  const [out, ...prefixes] = rest, gap = 6, space = 18;
  const pairs = prefixes.map((p) => ['before', 'after'].map((tag) => { const img = decodePNG(`${p}_${tag}.png`); return rgb(img, [0, 0, img.width, img.height]); }));
  const width = Math.max(...pairs.flat().map((i) => i.w)), height = pairs.reduce((s, [a, b]) => s + a.h + gap + b.h + space, 0);
  const sheet = Buffer.alloc(width * height * 3, 200);
  const put = (img, y0) => { for (let y = 0; y < img.h; y++) img.data.copy(sheet, (y0 + y) * width * 3, y * img.w * 3, (y + 1) * img.w * 3); };
  let top = 0;
  for (const [a, b] of pairs) {
    put(a, top);
    put(b, top + a.h + gap);
    top += a.h + gap + b.h + space;
  }
  fs.writeFileSync(out, encodePng(width, height, sheet));
  console.log(`${out} ${width}x${height}`);
} else {
  console.error('usage: node tools/lab/pixels.mjs box <png> <x> <y> <w> <h> [<ink colour>] | crop <dir> <x> <y> <w> <h> | sheet <out.png> <pair prefix>...');
  process.exit(2);
}

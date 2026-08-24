import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apcaLc, contrast } from './color.mjs';
import { FAMILIES } from './palettes.mjs';
const VARIANT_KEYS = (f) => ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k]);
import { bundledExtensions } from './vscode-path.mjs';
import { FLOOR, EXEMPT } from './apca-lift.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const ROLES = ['keyword', 'func', 'string', 'type', 'number', 'tag'];

const FLOOR_CODE = 60;
const FLOOR_COMMENT = 30;

function measure(name, bg, roles, comment) {
  const lc = ROLES.map((r) => apcaLc(roles[r], bg));
  return {
    name,
    min: Math.min(...lc),
    mean: lc.reduce((a, b) => a + b) / lc.length,
    worst: ROLES[lc.indexOf(Math.min(...lc))],
    comment: comment === undefined ? null : apcaLc(comment, bg),
    below: ROLES.filter((r) => apcaLc(roles[r], bg) < FLOOR[r]),
    lcPerRole: Object.fromEntries(ROLES.map((r) => [r, apcaLc(roles[r], bg)])),
  };
}

const mine = [];
for (const fam of FAMILIES) for (const v of VARIANT_KEYS(fam)) {
  const p = fam[v];
  const m = measure(`Tapetum ${fam.label}${v === 'light' ? ' Light' : ''}`, p.bg, p, p.comment);
  m.wcag = Math.min(...ROLES.map((r) => contrast(p[r], p.bg)));
  mine.push(m);
}

function resolve(file) {
  const seen = new Set();
  let cur = file, colors = {}, tokens = [];
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const j = JSON.parse(fs.readFileSync(cur, 'utf8'));
    colors = { ...(j.colors || {}), ...colors };
    tokens = [...(j.tokenColors || []), ...tokens];
    cur = j.include ? path.join(path.dirname(cur), j.include) : null;
  }
  return { colors, tokens };
}

const official = [];
try {
  const extDir = bundledExtensions();
  for (const name of fs.readdirSync(extDir)) {
    const pj = path.join(extDir, name, 'package.json');
    if (!fs.existsSync(pj)) continue;
    let man; try { man = JSON.parse(fs.readFileSync(pj, 'utf8')); } catch { continue; }
    for (const t of man.contributes?.themes || []) {
      const file = path.join(extDir, name, t.path);
      if (!fs.existsSync(file)) continue;
      try {
        const { colors, tokens } = resolve(file);
        const bg = colors['editor.background'];
        if (!bg || !tokens.length) continue;
        let label = t.label || path.basename(file);
        if (/^%.*%$/.test(label)) {
          const nls = path.join(extDir, name, 'package.nls.json');
          if (fs.existsSync(nls)) label = JSON.parse(fs.readFileSync(nls, 'utf8'))[label.slice(1, -1)] || label;
        }
        const fgs = tokens.flatMap((r) => (r.settings?.foreground ? [r.settings.foreground] : []));
        const lc = fgs.map((f) => apcaLc(f, bg));
        official.push({ name: label, min: Math.min(...lc), mean: lc.reduce((a, b) => a + b, 0) / lc.length,
          below: fgs.filter((f) => apcaLc(f, bg) < FLOOR_CODE).length, rules: fgs.length,
          wcag: Math.min(...fgs.map((f) => contrast(f, bg))) });
      } catch { /* tema nu se rezolva */ }
    }
  }
} catch { /* fara VS Code nu compar */ }

console.log(`APCA. Praguri pe rol: ${Object.entries(FLOOR).map(([k, v]) => `${k} ${v}`).join(', ')}, comentarii ${FLOOR_COMMENT}.`);
console.log(`Referinta: Lc 60 e pragul APCA pentru text de continut la greutate normala, Lc 45 pentru text mare sau citit in salturi.\n`);
console.log('tema                          Lc min  Lc mediu  comentariu  sub prag   WCAG min');
console.log('-'.repeat(80));
for (const m of mine.sort((a, b) => a.min - b.min)) {
  console.log(m.name.padEnd(30) + m.min.toFixed(1).padStart(6) + m.mean.toFixed(1).padStart(10)
    + (m.comment === null ? '   .' : m.comment.toFixed(1)).padStart(12)
    + (m.below.length ? m.below.join(',') : '-').padStart(11) + m.wcag.toFixed(2).padStart(11));
}
const minAll = Math.min(...mine.map((m) => m.min));
const worstComment = Math.min(...mine.map((m) => m.comment));
const failing = mine.filter((m) => m.below.length);
console.log('-'.repeat(80));
console.log(`cel mai mic Lc pe cod: ${minAll.toFixed(1)}  |  cel mai mic Lc pe comentarii: ${worstComment.toFixed(1)}`);
const exemptKey = new Set(EXEMPT.map((e) => `${e.family}.${e.role}`));
const realFail = mine.filter((m) => m.below.length);
console.log(`teme cu cel putin un rol sub pragul lui: ${realFail.length} din ${mine.length}`);
if (realFail.length) for (const m of realFail) console.log(`   ${m.name.padEnd(28)} ${m.below.join(', ')}`);
console.log(`scutite prin design: ${EXEMPT.map((e) => e.family + '.' + e.role).join(', ')}`);

if (official.length) {
  console.log('\nTEMELE LIVRATE DE MICROSOFT, aceeasi masura pe regulile lor TextMate');
  console.log('tema                          Lc min  Lc mediu  reguli sub prag  din  WCAG min');
  console.log('-'.repeat(80));
  for (const o of official.sort((a, b) => a.min - b.min)) {
    console.log(o.name.padEnd(30) + o.min.toFixed(1).padStart(6) + o.mean.toFixed(1).padStart(10)
      + String(o.below).padStart(15) + String(o.rules).padStart(6) + o.wcag.toFixed(2).padStart(10));
  }
}

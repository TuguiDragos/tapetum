import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apcaLc, deltaE, hex2lch, lch2hex, parse } from './color.mjs';
import { FAMILIES } from './palettes.mjs';
const VARIANT_KEYS = (f) => ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k]);

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const FLOOR = { keyword: 55, func: 55, string: 55, type: 45, number: 45, tag: 45 };
export const ANSI_FLOOR = 45;
const ANSI = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan'];
export const BUDGET = 10;

export const EXEMPT = [
  { family: 'effect', role: 'keyword', why: 'schema effect stinge intentionat cuvintele cheie ca sa iasa in fata ce are efect secundar' },
  { family: 'palimpsest', role: 'keyword', why: 'schema signal rade boilerplate-ul spre fundal, cuvintele cheie sunt stratul ras' },
  { family: 'provenance', role: 'keyword', why: 'schema provenance stinge cuvintele cheie pentru ca stii deja ca function e function' },
];
const exempt = (id, role) => EXEMPT.some((e) => e.family === id && e.role === role);

const inGamut = (h) => { const { r, g, b } = parse(h); return [r, g, b].every((v) => v >= 6 && v <= 250); };

export function liftToApca(hex, bg, target, budget = BUDGET) {
  if (apcaLc(hex, bg) >= target) return { hex, moved: 0, reached: true };
  const [L0, C0, H] = hex2lch(hex);
  const dark = apcaLc('#ffffff', bg) > apcaLc('#000000', bg);
  let best = hex;
  const step = dark ? 0.5 : -0.5;
  for (let L = L0 + step; dark ? L <= 99 : L >= 1; L += step) {
    let candidate = null;
    for (let C = C0; C >= 0; C -= 1) {
      const c = lch2hex(L, C, H);
      if (!inGamut(c)) continue;
      const [, rc, rh] = hex2lch(c);
      let d = Math.abs(rh - H); if (d > 180) d = 360 - d;
      if (d > 3 && rc > 4) continue;
      candidate = c.toUpperCase();
      break;
    }
    if (!candidate) continue;
    if (deltaE(hex, candidate) > budget) break;
    best = candidate;
    if (apcaLc(candidate, bg) >= target) return { hex: candidate, moved: deltaE(hex, candidate), reached: true };
  }
  return { hex: best, moved: deltaE(hex, best), reached: apcaLc(best, bg) >= target };
}

export function plan() {
  const out = [];
  for (const fam of FAMILIES) for (const variant of VARIANT_KEYS(fam)) {
    const p = fam[variant];
    for (const slot of ANSI) {
      const lc = apcaLc(p.ansi[slot], p.bg);
      if (lc >= ANSI_FLOOR) continue;
      const r = liftToApca(p.ansi[slot], p.bg, ANSI_FLOOR);
      out.push({ id: fam.id, label: fam.label, variant, role: slot, ansi: true, from: p.ansi[slot],
        to: r.hex, lc, newLc: apcaLc(r.hex, p.bg), moved: r.moved, reached: r.reached, exempt: false });
    }
    for (const role of Object.keys(FLOOR)) {
      const lc = apcaLc(p[role], p.bg);
      if (lc >= FLOOR[role]) continue;
      if (exempt(fam.id, role)) {
        out.push({ id: fam.id, label: fam.label, variant, role, from: p[role], to: p[role],
          lc, newLc: lc, moved: 0, reached: false, exempt: true });
        continue;
      }
      const r = liftToApca(p[role], p.bg, FLOOR[role]);
      out.push({ id: fam.id, label: fam.label, variant, role, from: p[role], to: r.hex,
        lc, newLc: apcaLc(r.hex, p.bg), moved: r.moved, reached: r.reached, exempt: false });
    }
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('apca-lift.mjs')) {
  const steps = plan();
  const apply = process.argv.includes('--apply');
  const real = steps.filter((s) => !s.exempt && s.to !== s.from);
  const short = steps.filter((s) => !s.exempt && !s.reached);
  const skipped = steps.filter((s) => s.exempt);
  console.log(`praguri APCA: ${Object.entries(FLOOR).map(([k, v]) => `${k} ${v}`).join(', ')}, ANSI ${ANSI_FLOOR}, buget de miscare ${BUDGET} dE\n`);
  console.log(`roluri sub prag: ${steps.length}`);
  console.log(`  ridicate:                 ${real.length}`);
  console.log(`  scutite prin design:      ${skipped.length}`);
  console.log(`  raman sub prag dupa buget: ${short.length}`);
  if (short.length) {
    console.log('\nnu ajung la prag in bugetul de 8 dE:');
    for (const s of short) console.log(`  ${(s.label + ' ' + s.variant).padEnd(24)} ${s.role.padEnd(8)} ${s.from} -> ${s.to}  Lc ${s.lc.toFixed(0)} -> ${s.newLc.toFixed(0)}, prag ${FLOOR[s.role]}`);
  }
  if (skipped.length) {
    console.log('\nscutite, cu motiv:');
    for (const s of skipped) {
      const why = EXEMPT.find((e) => e.family === s.id && e.role === s.role).why;
      console.log(`  ${(s.label + ' ' + s.variant).padEnd(24)} ${s.role.padEnd(8)} Lc ${s.lc.toFixed(0)}\n     ${why}`);
    }
  }
  if (!apply) { console.log('\nruleaza cu --apply ca sa scriu valorile in tools/palettes.mjs'); process.exit(0); }

  const file = path.join(HERE, 'palettes.mjs');
  let src = fs.readFileSync(file, 'utf8');
  let done = 0;
  for (const s of real) {
    const idAnchor = src.indexOf(`id: '${s.id}'`);
    const variantAnchor = src.indexOf(`${s.variant}: {`, idAnchor);
    const endAnchor = src.indexOf('    },', variantAnchor);
    const blockEnd = s.ansi ? src.indexOf('\n    },', variantAnchor) : endAnchor;
    const block = src.slice(variantAnchor, blockEnd);
    const re = s.ansi
      ? new RegExp(`(${s.role}: ')${s.from}(')`, 'i')
      : new RegExp(`(\\b${s.role}: ')${s.from}(')`, 'i');
    if (!re.test(block)) { console.log(`nu am gasit ${s.id} ${s.variant} ${s.role} = ${s.from}`); continue; }
    src = src.slice(0, variantAnchor) + block.replace(re, `$1${s.to}$2`) + src.slice(blockEnd);
    done++;
  }
  fs.writeFileSync(file, src);
  console.log(`\n${done} valori scrise in tools/palettes.mjs`);
}

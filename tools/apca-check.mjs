import { apca, apcaLc, contrast } from './color.mjs';

const CANON = [
  ['#000000', '#ffffff', 106.04],
  ['#ffffff', '#000000', -107.88],
  ['#888888', '#ffffff', 63.06],
];
let ok = true;
console.log('APCA 0.1.9 canonical values');
for (const [t, b, want] of CANON) {
  const got = apca(t, b);
  const good = Math.abs(got - want) < 0.02;
  if (!good) ok = false;
  console.log(`  ${t} on ${b}  expected ${want.toFixed(2).padStart(8)}  got ${got.toFixed(2).padStart(8)}  ${good ? 'exact' : 'DIFFERS'}`);
}

console.log('\nproperties that must hold');
const props = [
  ['zero when the colours are identical', apca('#3a3a3a', '#3a3a3a') === 0],
  ['negative sign for light text on a dark background', apca('#ffffff', '#111111') < 0],
  ['positive sign for dark text on a light background', apca('#111111', '#ffffff') > 0],
  ['monotonic: the lighter the text on black, the higher the Lc',
    [0x44, 0x66, 0x88, 0xaa, 0xcc, 0xee].map((v) => apcaLc(`#${v.toString(16).repeat(3)}`, '#000000'))
      .every((x, i, a) => i === 0 || x > a[i - 1])],
  ['polarity is not symmetric, as the model prescribes',
    Math.abs(apcaLc('#ffffff', '#767676') - apcaLc('#767676', '#ffffff')) > 1],
  ['black clamp: no jump below 0.022 luminance',
    apcaLc('#ffffff', '#000000') - apcaLc('#ffffff', '#050505') < 2],
];
for (const [name, pass] of props) {
  if (!pass) ok = false;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}`);
}

console.log('\ncomparison with WCAG on cases where the two models disagree');
const pairs = [['#0EF477', '#040406'], ['#16DFF4', '#040406'], ['#7C39C4', '#FDFDFE'], ['#716008', '#FDFDFE']];
for (const [t, b] of pairs) {
  console.log(`  ${t} on ${b}   WCAG ${contrast(t, b).toFixed(2).padStart(6)}   APCA Lc ${apcaLc(t, b).toFixed(1).padStart(6)}`);
}
console.log(ok ? '\nAPCA implemented correctly' : '\nAPCA has a problem');
process.exit(ok ? 0 : 1);

import { apca, apcaLc, contrast } from './color.mjs';

const CANON = [
  ['#000000', '#ffffff', 106.04],
  ['#ffffff', '#000000', -107.88],
  ['#888888', '#ffffff', 63.06],
];
let ok = true;
console.log('valori canonice APCA 0.1.9');
for (const [t, b, want] of CANON) {
  const got = apca(t, b);
  const good = Math.abs(got - want) < 0.02;
  if (!good) ok = false;
  console.log(`  ${t} pe ${b}  asteptat ${want.toFixed(2).padStart(8)}  obtinut ${got.toFixed(2).padStart(8)}  ${good ? 'exact' : 'DIFERA'}`);
}

console.log('\nproprietati care trebuie sa se tina');
const props = [
  ['zero cand culorile sunt identice', apca('#3a3a3a', '#3a3a3a') === 0],
  ['semn negativ pentru text deschis pe fundal inchis', apca('#ffffff', '#111111') < 0],
  ['semn pozitiv pentru text inchis pe fundal deschis', apca('#111111', '#ffffff') > 0],
  ['monoton: cu cat textul e mai deschis pe negru, cu atat Lc creste',
    [0x44, 0x66, 0x88, 0xaa, 0xcc, 0xee].map((v) => apcaLc(`#${v.toString(16).repeat(3)}`, '#000000'))
      .every((x, i, a) => i === 0 || x > a[i - 1])],
  ['polaritatea nu e simetrica, asa cum prevede modelul',
    Math.abs(apcaLc('#ffffff', '#767676') - apcaLc('#767676', '#ffffff')) > 1],
  ['clamp pe negru: sub 0.022 luminanta nu produce salt',
    apcaLc('#ffffff', '#000000') - apcaLc('#ffffff', '#050505') < 2],
];
for (const [name, pass] of props) {
  if (!pass) ok = false;
  console.log(`  ${pass ? 'ok  ' : 'PICA'} ${name}`);
}

console.log('\ncomparatie cu WCAG pe cazuri unde cele doua modele nu sunt de acord');
const pairs = [['#0EF477', '#040406'], ['#16DFF4', '#040406'], ['#7C39C4', '#FDFDFE'], ['#716008', '#FDFDFE']];
for (const [t, b] of pairs) {
  console.log(`  ${t} pe ${b}   WCAG ${contrast(t, b).toFixed(2).padStart(6)}   APCA Lc ${apcaLc(t, b).toFixed(1).padStart(6)}`);
}
console.log(ok ? '\nAPCA implementat corect' : '\nAPCA are o problema');
process.exit(ok ? 0 : 1);

import fs from 'node:fs';
import path from 'node:path';

const ctSize = (packed) => (packed & 0x80 ? 3 * (1 << ((packed & 7) + 1)) : 0);

function skipSubBlocks(b, i) {
  while (i < b.length && b[i] !== 0) i += b[i] + 1;
  return i + 1;
}

export function parse(buf) {
  if (buf.slice(0, 3).toString() !== 'GIF') throw new Error('not a GIF');
  const width = buf.readUInt16LE(6);
  const height = buf.readUInt16LE(8);
  const packed = buf[10];
  let i = 13 + ctSize(packed);
  const head = buf.slice(0, i);
  const frames = [];
  const extras = [];
  let pendingGce = null;
  while (i < buf.length && buf[i] !== 0x3b) {
    const start = i;
    if (buf[i] === 0x21) {
      const label = buf[i + 1];
      const end = skipSubBlocks(buf, i + 2);
      if (label === 0xf9) pendingGce = { start, end, delay: buf.readUInt16LE(i + 4), disposal: (buf[i + 3] >> 2) & 7 };
      else extras.push({ start, end, label });
      i = end;
    } else if (buf[i] === 0x2c) {
      const lp = buf[i + 9];
      let p = i + 10 + ctSize(lp);
      p += 1;
      const end = skipSubBlocks(buf, p);
      frames.push({
        gce: pendingGce, imgStart: start, imgEnd: end,
        left: buf.readUInt16LE(i + 1), top: buf.readUInt16LE(i + 3),
        w: buf.readUInt16LE(i + 5), h: buf.readUInt16LE(i + 7),
        delay: pendingGce ? pendingGce.delay : 0,
        disposal: pendingGce ? pendingGce.disposal : 0,
        bytes: end - (pendingGce ? pendingGce.start : start),
      });
      pendingGce = null;
      i = end;
    } else i += 1;
  }
  return { width, height, head, frames, extras, trailer: buf.length - 1 };
}

export function slim(buf, { keepEvery = 2, maxDelay = 400, force = false } = {}) {
  const g = parse(buf);
  const partial = g.frames.filter((f) => f.w !== g.width || f.h !== g.height).length;
  const keeps = g.frames.filter((f) => f.disposal === 1).length;
  if (keepEvery > 1 && partial > 0 && keeps > 0 && !force) {
    throw new Error(`${partial} of ${g.frames.length} frames are partial with disposal 1. `
      + 'Each one draws only what changed over the previous frame, so dropping a frame '
      + 'loses those pixels for good and the animation unravels. Reduce the size by re-encoding, not by thinning.');
  }
  const out = [g.head];
  for (const e of g.extras) out.push(buf.slice(e.start, e.end));
  let carried = 0;
  let kept = 0;
  g.frames.forEach((f, n) => {
    const isLast = n === g.frames.length - 1;
    if (n % keepEvery !== 0 && !isLast) { carried += f.delay; return; }
    const delay = Math.min(maxDelay, f.delay + carried);
    carried = 0;
    kept += 1;
    if (f.gce) {
      const gce = Buffer.from(buf.slice(f.gce.start, f.gce.end));
      gce.writeUInt16LE(delay, 4);
      out.push(gce);
    }
    out.push(buf.slice(f.imgStart, f.imgEnd));
  });
  out.push(Buffer.from([0x3b]));
  return { buffer: Buffer.concat(out), kept, total: g.frames.length };
}

const args = process.argv.slice(2);
if (args.length) {
  const apply = args.includes('--apply');
  const every = Number((args.find((a) => a.startsWith('--every=')) || '--every=2').split('=')[1]);
  const cap = Number((args.find((a) => a.startsWith('--cap=')) || '--cap=400').split('=')[1]);
  for (const file of args.filter((a) => !a.startsWith('--'))) {
    const buf = fs.readFileSync(file);
    const g = parse(buf);
    const total = g.frames.reduce((s, f) => s + f.delay, 0) / 100;
    const fullCanvas = g.frames.filter((f) => f.w === g.width && f.h === g.height).length;
    const disp = {};
    for (const f of g.frames) disp[f.disposal] = (disp[f.disposal] || 0) + 1;
    const longest = g.frames.reduce((m, f) => (f.delay > m.delay ? f : m));
    console.log(`\n${path.basename(file)}`);
    console.log(`  ${g.width}x${g.height}, ${g.frames.length} frames, ${(buf.length / 1048576).toFixed(1)} MB, ${total.toFixed(1)} s`);
    console.log(`  full canvas frames: ${fullCanvas}, partial: ${g.frames.length - fullCanvas}`);
    console.log(`  disposal methods: ${Object.entries(disp).map(([k, v]) => `${k} x${v}`).join(', ')}`);
    console.log(`  longest delay: ${(longest.delay / 100).toFixed(2)} s`);
    let r = null;
    try {
      r = slim(buf, { keepEvery: every, maxDelay: cap, force: args.includes('--force') });
      console.log(`  after keeping 1 in ${every} and capping at ${cap / 100}s: ${r.kept} frames, ${(r.buffer.length / 1048576).toFixed(1)} MB`);
    } catch (e) {
      console.log(`  THINNING IS NOT SAFE: ${e.message}`);
    }
    if (apply && r) {
      fs.copyFileSync(file, file + '.orig');
      fs.writeFileSync(file, r.buffer);
      console.log(`  written. the original is at ${path.basename(file)}.orig`);
    }
  }
  if (!apply) console.log('\nrun with --apply to write the files');
}

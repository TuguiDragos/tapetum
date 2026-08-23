import fs from 'node:fs';
import zlib from 'node:zlib';

export function decodePNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('nu este PNG');

  let pos = 8, width = 0, height = 0, depth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8) throw new Error(`adancime ${depth} nesuportata`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`colorType ${colorType} nesuportat`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);

  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      const x = line[i];
      cur[i] = filter === 0 ? x
        : filter === 1 ? (x + a) & 255
        : filter === 2 ? (x + b) & 255
        : filter === 3 ? (x + ((a + b) >> 1)) & 255
        : (x + paeth(a, b, c)) & 255;
    }
  }

  return {
    width, height, channels, data: out,
    at(x, y) {
      const i = (y * width + x) * channels;
      return '#' + [out[i], out[i + 1], out[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    },
  };
}

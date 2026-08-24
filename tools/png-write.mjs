import zlib from 'node:zlib';

const TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

export function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    const o = y * (width * 3 + 1);
    raw[o] = 0;
    rgb.copy(raw, o + 1, y * width * 3, (y + 1) * width * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function canvas(width, height) {
  const buf = Buffer.alloc(width * height * 3);
  const put = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const o = (y * width + x) * 3;
    buf[o] = r; buf[o + 1] = g; buf[o + 2] = b;
  };
  return {
    buf, width, height, put,
    fill(rgb) { for (let i = 0; i < width * height; i++) { buf[i * 3] = rgb[0]; buf[i * 3 + 1] = rgb[1]; buf[i * 3 + 2] = rgb[2]; } },
    rect(x0, y0, w, h, rgb) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, rgb);
    },
    roundRect(x0, y0, w, h, r, rgb) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const dx = Math.max(x0 + r - x, 0, x - (x0 + w - 1 - r));
        const dy = Math.max(y0 + r - y, 0, y - (y0 + h - 1 - r));
        if (dx * dx + dy * dy <= r * r) put(x, y, rgb);
      }
    },
    circle(cx, cy, r, rgb) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, rgb);
    },
    downsample(factor) {
      const w = Math.floor(width / factor), h = Math.floor(height / factor);
      const out = Buffer.alloc(w * h * 3);
      const n = factor * factor;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0;
        for (let sy = 0; sy < factor; sy++) for (let sx = 0; sx < factor; sx++) {
          const o = ((y * factor + sy) * width + x * factor + sx) * 3;
          r += buf[o]; g += buf[o + 1]; b += buf[o + 2];
        }
        const o = (y * w + x) * 3;
        out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n);
      }
      return { width: w, height: h, buf: out };
    },
  };
}

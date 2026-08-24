export const parse = (h) => {
  const s = h.replace('#', '');
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16),
    a: n.length === 8 ? parseInt(n.slice(6, 8), 16) / 255 : 1 };
};
const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
export const relLum = (hex) => { const { r, g, b } = parse(hex); const [R, G, B] = [r, g, b].map((v) => lin(v / 255));
  return 0.2126 * R + 0.7152 * G + 0.0722 * B; };
export const over = (fg, bg) => { const f = parse(fg), b = parse(bg); if (f.a === 1) return fg;
  const m = (x, y) => Math.round(x * f.a + y * (1 - f.a));
  return '#' + [m(f.r, b.r), m(f.g, b.g), m(f.b, b.b)].map((v) => v.toString(16).padStart(2, '0')).join(''); };
export const contrast = (fg, bg) => { const a = relLum(over(fg, bg)), b = relLum(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };
export const toLab = (hex) => { const { r, g, b } = parse(hex); const [R, G, B] = [r, g, b].map((v) => lin(v / 255));
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722,
    Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [X, Y, Z].map(f); return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]; };
export const deltaE = (h1, h2) => {
  const [L1, a1, b1] = toLab(h1), [L2, a2, b2] = toLab(h2);
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const A1 = (1 + G) * a1, A2 = (1 + G) * a2;
  const Cp1 = Math.hypot(A1, b1), Cp2 = Math.hypot(A2, b2);
  const hp = (b, a) => { if (b === 0 && a === 0) return 0; const h = Math.atan2(b, a) * deg; return h >= 0 ? h : h + 360; };
  const h1p = hp(b1, A1), h2p = hp(b2, A2);
  const dLp = L2 - L1, dCp = Cp2 - Cp1;
  let dhp = 0; if (Cp1 * Cp2 !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp * rad) / 2);
  const Lbp = (L1 + L2) / 2, Cbp = (Cp1 + Cp2) / 2;
  let hbp = h1p + h2p; if (Cp1 * Cp2 !== 0) { if (Math.abs(h1p - h2p) > 180) hbp = (hbp + 360) / 2; else hbp /= 2; }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad)
    + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hbp - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
};
export const deuter = (hex) => {
  const { r, g, b } = parse(hex); const [R, G, B] = [r, g, b].map((v) => lin(v / 255));
  const L = 17.8824 * R + 43.5161 * G + 4.11935 * B, M = 3.45565 * R + 27.1554 * G + 3.86714 * B,
    S = 0.0299566 * R + 0.184309 * G + 1.46709 * B;
  const L2 = L, M2 = 0.494207 * L + 1.24827 * S, S2 = S;
  const R2 = 0.080944 * L2 - 0.130504 * M2 + 0.116721 * S2,
    G2 = -0.0102485 * L2 + 0.0540194 * M2 - 0.113615 * S2,
    B2 = -0.000365294 * L2 - 0.00412163 * M2 + 0.693513 * S2;
  const enc = (v) => { const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0'); };
  return '#' + enc(R2) + enc(G2) + enc(B2);
};

export const hex2 = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');

export const mix = (a, b, t) => {
  const x = parse(a), y = parse(b);
  return '#' + hex2(x.r + (y.r - x.r) * t) + hex2(x.g + (y.g - x.g) * t) + hex2(x.b + (y.b - x.b) * t);
};

export const alpha = (c, a) => {
  const { r, g, b } = parse(c);
  return '#' + hex2(r) + hex2(g) + hex2(b) + hex2(Math.round(a * 255));
};

export const lighten = (c, t) => mix(c, '#ffffff', t);
export const darken = (c, t) => mix(c, '#000000', t);

export const isDark = (c) => relLum(c) < 0.5;

export const readable = (c, bg, target = 4.5) => {
  if (contrast(c, bg) >= target) return c;
  const up = isDark(bg);
  let best = c;
  for (let t = 0.05; t <= 0.95; t += 0.05) {
    best = up ? lighten(c, t) : darken(c, t);
    if (contrast(best, bg) >= target) return best;
  }
  return best;
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const gamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

export const xyz2rgb = ([X, Y, Z]) => {
  const r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  const g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  const b = X * 0.0557 + Y * -0.204 + Z * 1.057;
  return [r, g, b].map((v) => Math.round(clamp01(gamma(clamp01(v))) * 255));
};

export const lab2rgb = ([L, a, b]) => {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const f = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  return xyz2rgb([f(fx) * 0.95047, f(fy), f(fz) * 1.08883]);
};

export const lch2hex = (L, C, h) => {
  const r = (h * Math.PI) / 180;
  const [R, G, B] = lab2rgb([L, C * Math.cos(r), C * Math.sin(r)]);
  return '#' + [R, G, B].map((v) => v.toString(16).padStart(2, '0')).join('');
};

export const hex2lch = (hex) => {
  const [L, a, b] = toLab(hex);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, Math.hypot(a, b), h];
};

const lobe = (x, mu, s1, s2) => {
  const s = x < mu ? s1 : s2;
  return Math.exp(-0.5 * ((x - mu) / s) ** 2);
};

export const wavelengthToHex = (nm) => {
  const X = 1.056 * lobe(nm, 599.8, 37.9, 31.0) + 0.362 * lobe(nm, 442.0, 16.0, 26.7) - 0.065 * lobe(nm, 501.1, 20.4, 26.2);
  const Y = 0.821 * lobe(nm, 568.8, 46.9, 40.5) + 0.286 * lobe(nm, 530.9, 16.3, 31.1);
  const Z = 1.217 * lobe(nm, 437.0, 11.8, 36.0) + 0.681 * lobe(nm, 459.0, 26.0, 13.8);
  const m = Math.max(X, Y, Z) || 1;
  const [R, G, B] = xyz2rgb([X / m, Y / m, Z / m]);
  return '#' + [R, G, B].map((v) => v.toString(16).padStart(2, '0')).join('');
};

export const wavelengthToHue = (nm) => hex2lch(wavelengthToHex(nm))[2];

export const protan = (hex) => {
  const { r, g, b } = parse(hex);
  const [R, G, B] = [r, g, b].map((v) => lin(v / 255));
  const L = 17.8824 * R + 43.5161 * G + 4.11935 * B;
  const M = 3.45565 * R + 27.1554 * G + 3.86714 * B;
  const S = 0.0299566 * R + 0.184309 * G + 1.46709 * B;
  const L2 = 2.02344 * M - 2.52581 * S, M2 = M, S2 = S;
  const R2 = 0.080944 * L2 - 0.130504 * M2 + 0.116721 * S2;
  const G2 = -0.0102485 * L2 + 0.0540194 * M2 - 0.113615 * S2;
  const B2 = -0.000365294 * L2 - 0.00412163 * M2 + 0.693513 * S2;
  return '#' + [R2, G2, B2].map((v) => Math.round(clamp01(gamma(clamp01(v))) * 255).toString(16).padStart(2, '0')).join('');
};

const APCA = {
  normBG: 0.56, normTXT: 0.57, revTXT: 0.62, revBG: 0.65,
  blkThrs: 0.022, blkClmp: 1.414, scaleBoW: 1.14, scaleWoB: 1.14,
  loBoWoffset: 0.027, loWoBoffset: 0.027, deltaYmin: 0.0005, loClip: 0.1,
};

const apcaY = (hex) => {
  const { r, g, b } = parse(hex);
  const s = (v) => (v / 255) ** 2.4;
  const y = 0.2126729 * s(r) + 0.7151522 * s(g) + 0.0721750 * s(b);
  return y < APCA.blkThrs ? y + (APCA.blkThrs - y) ** APCA.blkClmp : y;
};

export function apca(text, background) {
  const Ytxt = apcaY(over(text, background));
  const Ybg = apcaY(background);
  if (Math.abs(Ybg - Ytxt) < APCA.deltaYmin) return 0;
  let out;
  if (Ybg > Ytxt) {
    out = (Ybg ** APCA.normBG - Ytxt ** APCA.normTXT) * APCA.scaleBoW;
    out = out < APCA.loClip ? 0 : out - APCA.loBoWoffset;
  } else {
    out = (Ybg ** APCA.revBG - Ytxt ** APCA.revTXT) * APCA.scaleWoB;
    out = out > -APCA.loClip ? 0 : out + APCA.loWoBoffset;
  }
  return out * 100;
}

export const apcaLc = (text, background) => Math.abs(apca(text, background));

export const APCA_LEVELS = [
  { lc: 90, use: 'text de corp, preferat' },
  { lc: 75, use: 'text de corp, minim' },
  { lc: 60, use: 'continut, minim la corp normal' },
  { lc: 45, use: 'text mare sau ingrosat' },
  { lc: 30, use: 'text secundar, dezactivat' },
  { lc: 15, use: 'elemente care nu sunt text' },
];

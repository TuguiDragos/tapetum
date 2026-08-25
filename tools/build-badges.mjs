import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'readme-assets');
const PUBLISHER = 'tuguidragos';
const NAME = 'tapetum';

const line = (d, width = 1.6) =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

const GLYPHS = {
  box: line('M6 1.7 10.2 4v4.6L6 10.9 1.8 8.6V4z') + line('M1.8 4 6 6.3l4.2-2.3M6 6.3v4.6', 1.3),
  arrow: line('M6 1.9V8.2') + line('M3.3 5.7 6 8.5 8.7 5.7') + line('M2.2 10.5h7.6'),
};

const logo = (glyph) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">${GLYPHS[glyph]}</svg>`).toString('base64');

const compact = (n) => {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
};

async function marketplaceOnce() {
  const res = await fetch('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
    method: 'POST',
    headers: { Accept: 'application/json;api-version=7.2-preview.1', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: [{ criteria: [{ filterType: 7, value: `${PUBLISHER}.${NAME}` }], pageSize: 1, pageNumber: 1 }],
      flags: 914,
    }),
  });
  if (!res.ok) throw new Error(`marketplace a raspuns ${res.status}`);
  const body = await res.json();
  const stats = body.results?.[0]?.extensions?.[0]?.statistics ?? [];
  const install = stats.find((s) => s.statisticName === 'install');
  if (!install) throw new Error('marketplace nu a returnat statistica de instalari');
  return Math.round(install.value);
}

async function marketplacePage() {
  const res = await fetch(`https://marketplace.visualstudio.com/items?itemName=${PUBLISHER}.${NAME}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15' },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const found = html.match(/([\d,]+)\s*installs?/i);
  if (!found) return null;
  const n = Number(found[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

async function marketplaceInstalls(attempts = 5) {
  const seen = [];
  for (let i = 0; i < attempts; i += 1) {
    seen.push(await marketplaceOnce());
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400));
  }
  let page = null;
  try { page = await marketplacePage(); } catch { page = null; }
  const best = Math.max(...seen, page ?? 0);
  if (new Set(seen).size > 1 || (page !== null && page !== seen[0])) {
    console.log(`  api a raspuns ${seen.join(', ')}, pagina ${page ?? 'indisponibila'}, iau ${best}`);
  }
  return best;
}

async function openVsxDownloads() {
  const res = await fetch(`https://open-vsx.org/api/${PUBLISHER}/${NAME}`);
  if (!res.ok) throw new Error(`open vsx a raspuns ${res.status}`);
  const body = await res.json();
  if (typeof body.downloadCount !== 'number') throw new Error('open vsx nu a returnat downloadCount');
  return body.downloadCount;
}

const [installs, downloads] = await Promise.all([marketplaceInstalls(), openVsxDownloads()]);

fs.mkdirSync(OUT, { recursive: true });
const badges = {
  'badge-vscode.json': {
    schemaVersion: 1,
    label: 'VS Code installs',
    message: compact(installs),
    color: '161826',
    labelColor: '161826',
  },
  'badge-openvsx.json': {
    schemaVersion: 1,
    label: 'Open VSX downloads',
    message: compact(downloads),
    color: '161826',
    labelColor: '161826',
  },
};

fs.mkdirSync(OUT, { recursive: true });
let changed = 0;
for (const [name, body] of Object.entries(badges)) {
  const file = path.join(OUT, name);
  const next = JSON.stringify(body, null, 2) + '\n';
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (before !== next) { fs.writeFileSync(file, next); changed += 1; }
  console.log(`${name.padEnd(20)} ${body.label}: ${body.message}`);
}
for (const [name, glyph] of Object.entries({ 'logo-installs.txt': 'box', 'logo-downloads.txt': 'arrow' })) {
  fs.writeFileSync(path.join(OUT, name), logo(glyph));
}
console.log(`instalari ${installs}, descarcari ${downloads}, fisiere schimbate ${changed}`);

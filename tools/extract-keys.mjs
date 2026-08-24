import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appRoot, workbenchJs } from './vscode-path.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = appRoot();

const probe = fs.readFileSync(workbenchJs(), 'utf8').match(/(\w+)\("editor\.background",\s*\{/);
if (!probe) throw new Error('nu am putut identifica functia de inregistrare a culorilor');
const FN = probe[1];
const KEY = /^[a-zA-Z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*$/;

const registered = new Set();
const seen = new Set();
const files = [];
(function collect(dir, d = 0) {
  if (d > 8) return;
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collect(p, d + 1);
    else if (/\.(js|json|css)$/.test(e.name)) files.push(p);
  }
})(ROOT);

for (const f of files) {
  let s; try { s = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const m of s.matchAll(new RegExp(`\\b${FN}\\("([a-zA-Z][A-Za-z0-9.]*)"\\s*,`, 'g'))) registered.add(m[1]);
  for (const m of s.matchAll(/["'`]([a-zA-Z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*)["'`]/g)) if (KEY.test(m[1])) seen.add(m[1]);
  for (const m of s.matchAll(/--vscode-([A-Za-z0-9-]+)/g)) {
    const raw = m[1], i = raw.indexOf('-');
    if (i > 0) seen.add(raw.slice(0, i) + '.' + raw.slice(i + 1).replace(/-/g, '.'));
  }
}

const themeDir = path.join(ROOT, 'extensions', 'theme-defaults', 'themes');
const microsoft = new Set();
if (fs.existsSync(themeDir)) for (const f of fs.readdirSync(themeDir)) {
  try { for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(themeDir, f), 'utf8')).colors || {})) microsoft.add(k); }
  catch { /* nu e o tema */ }
}
const manifests = new Set();
const extDir = path.join(ROOT, 'extensions');
for (const name of fs.readdirSync(extDir)) {
  const pj = path.join(extDir, name, 'package.json');
  if (!fs.existsSync(pj)) continue;
  try { for (const c of JSON.parse(fs.readFileSync(pj, 'utf8')).contributes?.colors || []) if (c.id) manifests.add(c.id); }
  catch { /* manifest ilizibil */ }
}

const confirmed = [...new Set([...registered, ...microsoft, ...manifests])].sort();
const out = {
  vscode: JSON.parse(fs.readFileSync(path.join(ROOT, 'product.json'), 'utf8')).version,
  registerFunction: FN,
  filesScanned: files.length,
  counts: { registeredCalls: registered.size, microsoftThemes: microsoft.size, extensionManifests: manifests.size,
    confirmedReal: confirmed.length, everySeenString: seen.size },
  confirmedReal: confirmed,
  seenAnywhere: [...seen].sort(),
};
fs.writeFileSync(path.join(HERE, 'vscode-color-keys-full.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`VS Code ${out.vscode}, functia ${FN}, ${files.length} fisiere scanate`);
console.log(`  apeluri de inregistrare  ${registered.size}`);
console.log(`  temele Microsoft         ${microsoft.size}`);
console.log(`  manifeste de extensii    ${manifests.size}`);
console.log(`  CONFIRMATE REALE         ${confirmed.length}`);
console.log(`  siruri vazute oriunde    ${seen.size}`);

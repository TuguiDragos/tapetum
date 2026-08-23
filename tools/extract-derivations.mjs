import fs from 'node:fs';

const JS = '/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js';
const js = fs.readFileSync(JS, 'utf8');

const pat = /(\w+)\s*=\s*\w+\("([a-zA-Z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)",\s*([^,]{1,80}?),\s*d\(/g;
const binding = new Map();
const dflt = new Map();
for (const m of js.matchAll(pat)) {
  binding.set(m[1], m[2]);
  dflt.set(m[2], m[3].trim());
}

const alias = {};
for (const [key, d] of dflt) {
  if (/^\w+$/.test(d) && binding.has(d)) alias[key] = binding.get(d);
}

fs.writeFileSync('tools/derivations.json', JSON.stringify(alias, null, 2));
console.log(`chei citite din binar: ${dflt.size}`);
console.log(`chei al caror implicit este alta cheie: ${Object.keys(alias).length}`);

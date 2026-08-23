import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitTheme, deriveStatus } from './emit-theme.mjs';
import { FAMILIES } from './palettes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THEMES = path.join(HERE, '..', 'themes');

fs.rmSync(THEMES, { recursive: true, force: true });
fs.mkdirSync(THEMES, { recursive: true });

const contributes = [];
for (const fam of FAMILIES) {
  for (const variant of ['dark', 'light']) {
    const p = fam[variant];
    const syntax = {
      keyword: p.keyword, string: p.string, func: p.func, type: p.type,
      number: p.number, tag: p.tag, comment: p.comment, op: p.op,
      variable: p.fg, param: p.fg, prop: p.fg, regexp: p.type,
    };
    const label = `Tapetum ${fam.label}${variant === 'light' ? ' Light' : ''}`;
    const theme = emitTheme({
      name: label, variant,
      bg: p.bg, fg: p.fg, bgElev: p.bgElev, bgChrome: p.bgChrome,
      accent: p.keyword, syntax, ansi: p.ansi,
      status: deriveStatus(syntax, p.bg, variant === 'dark'),
    });
    const file = `${fam.id}-${variant}.json`;
    fs.writeFileSync(path.join(THEMES, file), JSON.stringify(theme, null, 2) + '\n');
    contributes.push({ label, uiTheme: variant === 'dark' ? 'vs-dark' : 'vs', path: `./themes/${file}` });
  }
}

const pkgPath = path.join(HERE, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.contributes.themes = contributes;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`${contributes.length} teme scrise din palete alese manual`);

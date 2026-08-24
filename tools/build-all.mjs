import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitTheme, deriveStatus } from './emit-theme.mjs';
import { FAMILIES } from './palettes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THEMES = path.join(HERE, '..', 'themes');

fs.rmSync(THEMES, { recursive: true, force: true });
fs.mkdirSync(THEMES, { recursive: true });

const VARIANTS = {
  dark: { ui: 'vs-dark', type: 'dark', suffix: '' },
  light: { ui: 'vs', type: 'light', suffix: ' Light' },
  hcDark: { ui: 'hc-black', type: 'hcDark', suffix: ' High Contrast', hc: 'dark' },
  hcLight: { ui: 'hc-light', type: 'hcLight', suffix: ' High Contrast Light', hc: 'light' },
};

const contributes = [];
for (const fam of FAMILIES) {
  for (const variant of Object.keys(VARIANTS)) {
    const p = fam[variant];
    if (!p) continue;
    const spec = VARIANTS[variant];
    const syntax = {
      keyword: p.keyword, string: p.string, func: p.func, type: p.type,
      number: p.number, tag: p.tag, comment: p.comment, op: p.op,
      variable: p.fg, param: p.fg, prop: p.fg, regexp: p.type,
    };
    const label = `Tapetum ${fam.label}${spec.suffix}`;
    const status = p.status
      ? { ...p.status, added: p.status.ok, modified: p.status.info, deleted: p.status.error, conflict: p.status.warn }
      : deriveStatus(syntax, p.bg, variant === 'dark' || variant === 'hcDark');
    const theme = emitTheme({
      name: label, variant: spec.type, hc: spec.hc, scheme: fam.scheme, palette: p,
      bg: p.bg, fg: p.fg, bgElev: p.bgElev, bgChrome: p.bgChrome,
      fgDim: p.fgDim, fgFaint: p.fgFaint, depth: p.depth,
      accent: p.accent || p.keyword, syntax, ansi: p.ansi, status,
    });
    const file = `${fam.id}-${variant}.json`;
    fs.writeFileSync(path.join(THEMES, file), JSON.stringify(theme, null, 2) + '\n');
    contributes.push({ label, uiTheme: spec.ui, path: `./themes/${file}` });
  }
}

const pkgPath = path.join(HERE, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.contributes.themes = contributes;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`${contributes.length} teme scrise din palete alese manual`);

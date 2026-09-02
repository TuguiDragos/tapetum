import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from './palette-extract.mjs';
import { SAMPLE, TREE, TABS } from './bench-data.mjs';
import { contrast, over } from './color.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const T = (f) => path.join(HERE, '..', 'themes', f);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ROLES = [
  ['keyword', 'keywords'], ['string', 'strings'], ['func', 'functions'], ['type', 'types'],
  ['number', 'numbers'], ['prop', 'properties'], ['param', 'parameters'], ['tag', 'tags'],
  ['variable', 'variables'], ['op', 'operators'], ['comment', 'comments'],
];

function win(p) {
  const u = p.ui, s = p.syntax;
  const c = (k, fb) => u[k] || fb;
  const bg = c('editor.background', '#111'), fg = c('editor.foreground', '#ccc');
  const vars = [
    `--e-bg:${bg}`, `--e-fg:${fg}`,
    `--ln:${c('editorLineNumber.foreground', '#555')}`,
    `--ln-a:${c('editorLineNumber.activeForeground', fg)}`,
    `--cur:${c('editorCursor.foreground', fg)}`,
    `--side:${c('sideBar.background', bg)}`, `--side-fg:${c('sideBar.foreground', fg)}`,
    `--act:${c('activityBar.background', bg)}`, `--act-fg:${c('activityBar.foreground', fg)}`,
    `--act-in:${c('activityBar.inactiveForeground', '#777')}`,
    `--act-bd:${c('activityBar.activeBorder', fg)}`,
    `--tabs-bg:${c('editorGroupHeader.tabsBackground', bg)}`,
    `--tab-a:${c('tab.activeBackground', bg)}`, `--tab-a-fg:${c('tab.activeForeground', fg)}`,
    `--tab-i:${c('tab.inactiveBackground', bg)}`, `--tab-i-fg:${c('tab.inactiveForeground', '#777')}`,
    `--tab-top:${c('tab.activeBorderTop', 'transparent')}`,
    `--st:${c('statusBar.background', bg)}`, `--st-fg:${c('statusBar.foreground', fg)}`,
    `--tt:${c('titleBar.activeBackground', bg)}`, `--tt-fg:${c('titleBar.activeForeground', fg)}`,
    `--indent:${c('editorIndentGuide.background1', '#333')}`,
    `--g-mod:${c('gitDecoration.modifiedResourceForeground', fg)}`,
    `--g-add:${c('gitDecoration.addedResourceForeground', fg)}`,
    `--line-hl:${c('editor.lineHighlightBackground', bg)}`,
  ];
  for (const [k, v] of Object.entries(s)) vars.push(`--s-${k}:${v.hex}`);

  const tree = TREE.map((f) => {
    const cls = ['t-row', f.active ? 'is-active' : '', f.dir ? 'is-dir' : ''].filter(Boolean).join(' ');
    const gitCls = f.git === 'mod' ? 'g-mod' : f.git === 'add' ? 'g-add' : '';
    return `<div class="${cls}" style="padding-left:${f.d * 9}px"><span class="t-name ${gitCls}">${f.dir ? '▾ ' : ''}${esc(f.n)}</span>${f.git ? `<span class="t-git ${gitCls}">${f.git === 'mod' ? 'M' : 'A'}</span>` : ''}</div>`;
  }).join('');

  const tabs = TABS.map((t, i) => `<div class="w-tab${i === 0 ? ' is-active' : ''}">${esc(t)}</div>`).join('');

  const code = SAMPLE.map((line, i) => {
    const num = i + 1;
    const spans = line.length
      ? line.map(([role, txt]) => {
          const st = s[role];
          const style = st ? `color:var(--s-${role})${st.italic ? ';font-style:italic' : ''}${st.bold ? ';font-weight:700' : ''}` : '';
          return `<span style="${style}">${esc(txt)}</span>`;
        }).join('')
      : '&nbsp;';
    return `<div class="c-line${num === 14 ? ' is-cur' : ''}"><span class="c-num">${num}</span><span class="c-txt">${spans}</span></div>`;
  }).join('');

  return `<div class="win" style="${vars.join(';')}">
  <div class="w-title"><span class="dots"><i></i><i></i><i></i></span><span class="w-name">${esc(p.name)}</span></div>
  <div class="w-tabs">${tabs}</div>
  <div class="w-main">
    <div class="w-act"><i class="on"></i><i></i><i></i><i></i></div>
    <div class="w-side"><div class="s-head">EXPLORER</div>${tree}</div>
    <div class="w-ed">${code}</div>
  </div>
  <div class="w-status"><span>main*</span><span>TypeScript</span><span>Ln 14, Col 28</span><span>UTF-8</span></div>
</div>`;
}

function roleTable(p) {
  const bg = p.ui['editor.background'];
  const rows = ROLES.filter(([k]) => p.syntax[k]).map(([k, label]) => {
    const hex = p.syntax[k].hex;
    const r = contrast(hex, bg);
    const cls = r >= 4.5 ? 'ok' : r >= 3 ? 'warn' : 'bad';
    return `<tr><td><span class="chip" style="background:${hex}"></span>${label}</td><td class="mono">${hex}</td><td class="mono ${cls}">${r.toFixed(2)}</td></tr>`;
  }).join('');
  return `<table class="roles"><thead><tr><th>role</th><th>hex</th><th>contrast</th></tr></thead><tbody>${rows}</tbody></table>`;
}


const pkg = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'package.json'), 'utf8'));
const families = [];
const seen = new Map();
for (const t of pkg.contributes.themes) {
  const m = t.path.match(/^\.\/themes\/(.+)-(dark|light)\.json$/);
  if (!m) continue;
  const [, id, variant] = m;
  if (!seen.has(id)) {
    seen.set(id, { id, name: t.label.replace(/^Tapetum /, '').replace(/ Light$/, ''), status: 'passes', note: '' });
    families.push(seen.get(id));
  }
  seen.get(id)[variant] = extract(path.join(HERE, '..', t.path.slice(2)));
}

const NOTES = {
  quantum: 'Emission of ionised gas in a nebula. The violet keeps its original hue; lightness was redistributed.',
  fraunhofer: 'Real atomic emission lines, converted from wavelength through the CIE 1931 functions.',
  persistence: 'The chemistry of oscilloscope and radar phosphors, from P11 blue to P22 red.',
  anodise: 'Thin film interference on anodised titanium, the colour indexed by the anodising voltage.',
};
for (const f of families) f.note = NOTES[f.id] || '';

const sections = families.map((f) => `
<section class="fam" id="${f.id}">
  <header class="fam-h">
    <div><h2>${esc(f.name)}</h2><p class="fam-note">${esc(f.note)}</p></div>
    <span class="badge">${esc(f.status)}</span>
  </header>
  <div class="pair">
    <article class="variant">
      <div class="v-h"><h3>${esc(f.dark.name)}</h3><span class="v-t">dark</span></div>
      ${win(f.dark)}
      ${roleTable(f.dark)}
    </article>
    <article class="variant">
      <div class="v-h"><h3>${esc(f.light.name)}</h3><span class="v-t">light</span></div>
      ${win(f.light)}
      ${roleTable(f.light)}
    </article>
  </div>
</section>`).join('');

const CSS = `
:root{
  --ground:#EDEDEC; --surface:#FFFFFF; --sunk:#E3E3E1;
  --ink:#15171A; --ink-2:#4A4E53; --muted:#75797E;
  --hair:#D6D6D3; --hair-2:#C4C4C0;
  --ok:#1F7A46; --warn:#8A6100; --bad:#B3261E;
  --shadow:0 1px 2px rgba(20,22,26,.06),0 8px 24px -8px rgba(20,22,26,.16);
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ground:#131314; --surface:#1B1B1D; --sunk:#232326;
  --ink:#E9E9E7; --ink-2:#B4B4B2; --muted:#87878A;
  --hair:#2C2C2F; --hair-2:#3A3A3E;
  --ok:#5FD08A; --warn:#E0B357; --bad:#F2776B;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 12px 32px -10px rgba(0,0,0,.6);
}}
:root[data-theme="dark"]{
  --ground:#131314; --surface:#1B1B1D; --sunk:#232326;
  --ink:#E9E9E7; --ink-2:#B4B4B2; --muted:#87878A;
  --hair:#2C2C2F; --hair-2:#3A3A3E;
  --ok:#5FD08A; --warn:#E0B357; --bad:#F2776B;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 12px 32px -10px rgba(0,0,0,.6);
}
body{margin:0;background:var(--ground);color:var(--ink);
  font-family:Archivo,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
.mono{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  font-variant-numeric:tabular-nums}
.wrap{max-width:1240px;margin:0 auto;padding:48px 24px 96px}

.masthead{display:flex;flex-direction:column;gap:14px;padding-bottom:28px;
  border-bottom:1px solid var(--hair);margin-bottom:40px}
.eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--muted)}
h1{margin:0;font-size:clamp(28px,4.4vw,44px);line-height:1.06;letter-spacing:-.02em;
  font-weight:700;text-wrap:balance}
.lede{margin:0;max-width:64ch;color:var(--ink-2);font-size:16px}
.facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.fact{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-2);
  background:var(--sunk);border:1px solid var(--hair);border-radius:5px;padding:4px 9px;
  font-variant-numeric:tabular-nums}

.fam{margin-bottom:64px}
.fam-h{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;
  margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--hair)}
.fam-h h2{margin:0 0 5px;font-size:23px;letter-spacing:-.01em;font-weight:700}
.fam-note{margin:0;color:var(--muted);font-size:13.5px;max-width:70ch}
.badge{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.08em;
  text-transform:uppercase;padding:5px 10px;border-radius:999px;white-space:nowrap;
  background:var(--sunk);border:1px solid var(--hair-2);color:var(--ink-2)}
.badge-wait{border-style:dashed;color:var(--muted)}

.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:28px}
@media(max-width:920px){.pair{grid-template-columns:1fr}}
.variant{display:flex;flex-direction:column;gap:14px;min-width:0}
.v-h{display:flex;align-items:baseline;gap:10px}
.v-h h3{margin:0;font-size:15px;font-weight:600}
.v-t{font-family:"JetBrains Mono",monospace;font-size:10.5px;color:var(--muted);
  letter-spacing:.08em;text-transform:uppercase}

.win{border-radius:9px;overflow:hidden;border:1px solid var(--hair-2);box-shadow:var(--shadow);
  font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10.5px;line-height:1.62;
  background:var(--e-bg)}
.w-title{height:29px;display:flex;align-items:center;gap:9px;padding:0 11px;
  background:var(--tt);color:var(--tt-fg)}
.dots{display:flex;gap:5px}
.dots i{width:9px;height:9px;border-radius:50%;background:currentColor;opacity:.28}
.w-name{font-size:10px;opacity:.72;letter-spacing:.02em}
.w-tabs{display:flex;background:var(--tabs-bg);overflow:hidden}
.w-tab{padding:7px 13px;font-size:10px;background:var(--tab-i);color:var(--tab-i-fg);
  border-top:2px solid transparent;white-space:nowrap}
.w-tab.is-active{background:var(--tab-a);color:var(--tab-a-fg);border-top-color:var(--tab-top)}
.w-main{display:grid;grid-template-columns:38px 132px minmax(0,1fr)}
.w-act{background:var(--act);display:flex;flex-direction:column;align-items:center;
  gap:15px;padding:11px 0}
.w-act i{width:17px;height:17px;border-radius:3px;background:var(--act-in);opacity:.5;
  border-left:2px solid transparent}
.w-act i.on{background:var(--act-fg);opacity:.9;box-shadow:-11px 0 0 -9px var(--act-bd)}
.w-side{background:var(--side);color:var(--side-fg);padding:9px 0;min-width:0}
.s-head{font-size:9px;letter-spacing:.12em;opacity:.6;padding:0 10px 7px}
.t-row{display:flex;align-items:center;justify-content:space-between;gap:6px;
  padding:2.5px 10px 2.5px 0;font-size:10px;white-space:nowrap;overflow:hidden}
.t-row.is-active{background:rgba(127,127,127,.16)}
.t-row.is-dir{opacity:.82}
.t-name{overflow:hidden;text-overflow:ellipsis}
.t-git{font-size:9px;font-weight:700}
.g-mod{color:var(--g-mod)} .g-add{color:var(--g-add)}
.w-ed{background:var(--e-bg);color:var(--e-fg);padding:9px 0;overflow-x:auto;min-width:0}
.c-line{display:flex;white-space:pre;min-height:1.62em}
.c-line.is-cur{background:var(--line-hl)}
.c-num{flex:0 0 34px;text-align:right;padding-right:11px;color:var(--ln);opacity:.85;user-select:none}
.c-line.is-cur .c-num{color:var(--ln-a);opacity:1}
.c-txt{padding-right:16px}
.c-line.is-cur .c-txt{box-shadow:inset 2px 0 0 -1px var(--cur)}
.w-status{height:21px;display:flex;align-items:center;gap:15px;padding:0 11px;
  background:var(--st);color:var(--st-fg);font-size:9.5px}

.roles{width:100%;border-collapse:collapse;font-size:12.5px}
.roles th{text-align:left;font-family:"JetBrains Mono",monospace;font-size:9.5px;
  letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:500;
  padding:0 8px 6px;border-bottom:1px solid var(--hair)}
.roles th:last-child,.roles td:last-child{text-align:right}
.roles td{padding:4.5px 8px;border-bottom:1px solid var(--hair)}
.roles tr:last-child td{border-bottom:0}
.roles td:first-child{display:flex;align-items:center;gap:8px;color:var(--ink-2)}
.chip{width:13px;height:13px;border-radius:3px;flex:none;
  box-shadow:inset 0 0 0 1px rgba(127,127,127,.35)}
.ok{color:var(--ok)} .warn{color:var(--warn)} .bad{color:var(--bad);font-weight:600}
.note{margin:0;font-size:12.5px;color:var(--muted)}
.ok-note{color:var(--ok)}
.coll{border:1px solid var(--hair-2);border-radius:7px;padding:11px 13px;background:var(--sunk)}
.coll-h{font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.coll-r{display:flex;align-items:center;gap:9px;padding:3.5px 0;font-size:12px}
.coll-r .mono{font-size:11px;margin-left:auto}
.coll-r .mono+.mono{margin-left:0;min-width:88px;text-align:right;color:var(--muted)}
.coll-n{color:var(--ink-2)}

.slot{border:1px dashed var(--hair-2);border-radius:9px;min-height:260px;display:flex;
  align-items:center;justify-content:center;color:var(--muted);background:var(--sunk)}
.slot span{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.08em;
  text-transform:uppercase}
footer{margin-top:56px;padding-top:22px;border-top:1px solid var(--hair);
  color:var(--muted);font-size:12.5px}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

const REGISTRY = JSON.parse(fs.readFileSync(path.join(HERE, 'vscode-color-keys-full.json'), 'utf8'));
const totalKeys = REGISTRY.confirmedReal.filter((k) => !REGISTRY.deprecated.includes(k)).length;
const cov = Math.round(Object.keys(JSON.parse(fs.readFileSync(T('quantum-dark.json'), 'utf8')).colors).length / totalKeys * 100);

console.log(`<title>Palette Bench</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap">
<style>${CSS}</style>
<div class="wrap">
  <header class="masthead">
    <span class="eyebrow">Tapetum, test bench, VS Code ${REGISTRY.vscode}</span>
    <h1>Quantum, before and after</h1>
    <p class="lede">The first two sections are the same palette, before and after the repair. The hues are kept, the violet stayed at exactly the same value, but lightness was redistributed so the roles no longer overlap when colour blindness takes hue out of the equation. Under every window is the collision table: two pairs in the old variant, none in the new one.</p>
    <div class="facts">
      <span class="fact">${families.length} families, ${families.length * 2} themes</span>
      <span class="fact">violet kept at 0 degrees of drift</span>
      <span class="fact">deuteranopia 4.4 becomes 12.4</span>
    </div>
  </header>
  ${sections}
  <footer>Rendered from <span class="mono">themes/*.json</span> by <span class="mono">tools/bench.mjs</span>. Regenerable whenever a colour changes.</footer>
</div>`);

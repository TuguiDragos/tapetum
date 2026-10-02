// Runs the scenes of a file in an isolated editor and saves a screenshot and the probe of each.
// Usage: node tools/lab/run.mjs <scenes.json> --out <dir> [--tag <before|after>] [--ref <git revision>] [--app <editor>] [--keep]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveEditor, themeSource, prepare, launch, command, sleep } from './lab.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const file = args.find((a, i) => !a.startsWith('--') && !['--out', '--tag', '--ref', '--app'].includes(args[i - 1]));
const out = flag('--out');
if (!file || !out) {
  console.error('usage: node tools/lab/run.mjs <scenes.json> --out <dir> [--tag <before|after>] [--ref <git revision>] [--app <editor>] [--keep]');
  process.exit(2);
}
const tag = flag('--tag') || 'after';
const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
const editor = resolveEditor(flag('--app') || '/Applications/Visual Studio Code.app');
fs.mkdirSync(out, { recursive: true });

const source = themeSource(flag('--ref'));
const run = prepare(editor, source, spec.settings);
if (flag('--ref')) fs.rmSync(source, { recursive: true, force: true });
const { app, page, cdp } = await launch(editor, run);

// view lines hold non breaking spaces, so text is matched with plain ones
const textPoint = (text, nth = 0) => page.evaluate(([t, n]) => {
  const spans = [...document.querySelectorAll('.monaco-editor .view-lines .view-line span span')]
    .filter((s) => s.offsetParent && s.textContent.replace(/\u00a0/g, ' ').includes(t));
  const span = spans[n];
  if (!span) return null;
  const i = span.textContent.replace(/\u00a0/g, ' ').indexOf(t), range = document.createRange();
  range.setStart(span.firstChild, i);
  range.setEnd(span.firstChild, i + t.length);
  const b = range.getBoundingClientRect();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}, [text, nth]);

const window0 = (fn) => app.evaluate(({ BrowserWindow }, f) => BrowserWindow.getAllWindows()[0][f](), fn);
const ACTIONS = {
  wait: (a) => sleep(a.ms),
  key: (a) => page.keyboard.press(a.key),
  type: (a) => page.keyboard.type(a.text, { delay: 20 }),
  eval: (a) => page.evaluate(a.js),
  hover: (a) => page.hover(a.selector, { force: true }),
  mouse: (a) => page.mouse.move(a.x, a.y, { steps: 6 }),
  click: (a) => page.locator(a.selector).nth(a.nth || 0).click({ modifiers: a.modifiers || [], force: true }),
  rclick: (a) => page.locator(a.selector).nth(a.nth || 0).click({ button: 'right', force: true }),
  blurWindow: () => window0('blur'),
  focusWindow: () => window0('focus'),
  focusEmulation: (a) => cdp.send('Emulation.setFocusEmulationEnabled', { enabled: a.enabled }),
  async hoverText(a) {
    const p = await textPoint(a.text, a.nth || 0);
    if (!p) throw new Error(`no editor text "${a.text}"`);
    await page.mouse.move(p.x, p.y, { steps: 8 });
  },
};
const act = (a) => (ACTIONS[a.op] ? ACTIONS[a.op](a) : command(run, a.path ? { ...a, path: path.join(run.workspace, a.path) } : a));

const results = [];
try {
  for (const a of spec.setup || []) await act(a);
  for (const scene of spec.scenes) {
    await command(run, { op: 'theme', label: scene.theme });
    for (const a of scene.actions || []) await act(a);
    await sleep(scene.settle ?? 1200);
    const shot = path.join(out, `${scene.name}_${tag}.png`);
    await page.screenshot({ path: shot });
    const probe = scene.probe ? await page.evaluate(scene.probe) : null;
    results.push({ scene: scene.name, theme: scene.theme, file: shot, scale: await page.evaluate(() => devicePixelRatio), probe });
    for (const a of scene.after || []) await act(a);
  }
} finally {
  await app.close().catch(() => {});
  spawnSync('pkill', ['-9', '-f', run.base]);
  if (args.includes('--keep')) console.log(`kept ${run.base}`); else fs.rmSync(run.base, { recursive: true, force: true });
}
fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify(results, null, 1));
console.log(`${results.length} scenes in ${out}`);

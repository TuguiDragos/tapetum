// Loads every theme in a desktop editor built on VS Code and compares the colours its workbench resolves
// with the theme files, through the Chrome DevTools Protocol of the editor itself.
// Usage: node tools/live-check.mjs <editor .app, executable or install folder> [--vsix <file>] [--shots <dir>]
//        [--json <file>] [--only <label,label>] [--keep]
//
// Without --vsix the extension loads from this repository as a development extension; with it the
// package is installed into a fresh extensions folder and its own theme files are the reference.
// A key the editor does not register in the workbench window gets no CSS variable and counts as unknown.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { parse } from './color.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIN = process.platform === 'win32';
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const target = args.find((a, i) => !a.startsWith('--') && !['--vsix', '--shots', '--json', '--only'].includes(args[i - 1]));
if (!target) {
  console.error('usage: node tools/live-check.mjs <editor .app, executable or install folder> [--vsix <file>] [--shots <dir>] [--json <file>] [--only <labels>] [--keep]');
  process.exit(2);
}
const vsix = flag('--vsix'), shots = flag('--shots'), jsonOut = flag('--json');
const only = flag('--only') ? new Set(flag('--only').split(',')) : null;
const keep = args.includes('--keep');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// first-run screens that cover the workbench in a fresh profile, skipped without signing in
const FIRST_RUN = {
  cursor: { args: ['--skip-onboarding'] },
  kiro: { args: ['--skip-onboarding'] },
  'antigravity-ide': { state: { antigravityOnboarding: 'true' } },
  'devin-desktop': { state: { windsurfOnboarding: 'true' } },
  trae: { storage: { iCubeNativeAppStartSetup: true } },
};

function resolveEditor(p) {
  p = path.resolve(p);
  if (p.endsWith('.app')) {
    const name = spawnSync('plutil', ['-extract', 'CFBundleExecutable', 'raw', path.join(p, 'Contents/Info.plist')], { encoding: 'utf8' }).stdout.trim();
    return { exe: path.join(p, 'Contents/MacOS', name), app: path.join(p, 'Contents/Resources/app') };
  }
  const dir = fs.statSync(p).isDirectory() ? p : path.dirname(p);
  const apps = [path.join(dir, 'resources/app'), path.join(dir, '../Resources/app'),
    ...(fs.existsSync(dir) ? fs.readdirSync(dir).map((d) => path.join(dir, d, 'resources/app')) : [])];
  const app = apps.find((a) => fs.existsSync(path.join(a, 'product.json')));
  if (!app) throw new Error(`no resources/app with a product.json next to ${p}`);
  if (!fs.statSync(p).isDirectory()) return { exe: p, app };
  const product = JSON.parse(fs.readFileSync(path.join(app, 'product.json'), 'utf8'));
  const exe = [path.join(dir, product.applicationName), path.join(dir, `${product.nameShort}.exe`)].find((f) => fs.existsSync(f));
  if (!exe) throw new Error(`no executable for ${product.nameShort} in ${dir}`);
  return { exe, app };
}

let exe, app;
try { ({ exe, app } = resolveEditor(target)); } catch (e) { console.error(e.message); process.exit(2); }
const product = JSON.parse(fs.readFileSync(path.join(app, 'product.json'), 'utf8'));
const firstRun = FIRST_RUN[product.applicationName] || {};
const own = product.positronVersion || product.windsurfVersion || product.ideVersion || product.appVersion || product.voidVersion || product.version;
const identity = { name: product.nameLong, version: own, core: product.vscodeVersion || product.vsCodeVersion || (own !== product.version ? product.version : null), commit: product.commit, date: product.date };

// the editor's IPC socket lives in the user data folder, and macOS caps socket paths near 104 characters
const base = fs.mkdtempSync(path.join(WIN ? os.tmpdir() : '/tmp', 'tlc-'));
const dirs = { data: path.join(base, 'd'), extensions: path.join(base, 'e'), workspace: path.join(base, 'w'), home: path.join(base, 'h') };
for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true });
fs.writeFileSync(path.join(dirs.workspace, 'sample.ts'), 'export const answer: number = 42;\n');
// a separate home keeps the editors' own folders (~/.cursor, ~/.void-editor, ...) out of the real one
const env = WIN ? { ...process.env } : { ...process.env, HOME: dirs.home };

let editor = null, stopping = false;
function stop(code, message) {
  if (stopping) return;
  stopping = true;
  if (message) console.log(message);
  if (editor?.pid) {
    if (WIN) spawnSync('taskkill', ['/pid', String(editor.pid), '/T', '/F']);
    else {
      try { process.kill(-editor.pid, 'SIGTERM'); } catch { }
      pause(1500);
      try { process.kill(-editor.pid, 'SIGKILL'); } catch { }
      // some editors relaunch themselves outside the process group they were started in
      spawnSync('pkill', ['-9', '-f', base]);
      pause(500);
    }
  }
  if (keep) console.log(`kept ${base}`); else fs.rmSync(base, { recursive: true, force: true });
  process.exit(code);
}
for (const s of WIN ? ['SIGINT', 'SIGTERM'] : ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGALRM']) process.on(s, () => stop(1, `stopped by ${s}`));
process.on('uncaughtException', (e) => stop(1, `error: ${e.message}`));
process.on('unhandledRejection', (e) => stop(1, `error: ${e?.message ?? e}`));

let extensionRoot = ROOT;
if (vsix) {
  const r = spawnSync(exe, [path.join(app, 'out/cli.js'), '--user-data-dir', dirs.data, '--extensions-dir', dirs.extensions, '--install-extension', path.resolve(vsix), '--force'],
    { encoding: 'utf8', cwd: dirs.workspace, env: { ...env, ELECTRON_RUN_AS_NODE: '1' } });
  const installed = fs.readdirSync(dirs.extensions).find((d) => d.startsWith('tuguidragos.tapetum-'));
  if (r.status !== 0 || !installed) {
    const output = `${r.error ? r.error.message : ''}\n${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').filter((l) => l.trim() && !/^\s+at /.test(l));
    stop(1, `install failed (exit ${r.status}):\n${output.slice(-8).join('\n')}`);
  }
  extensionRoot = path.join(dirs.extensions, installed);
}

const pkg = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'package.json'), 'utf8'));
const themes = pkg.contributes.themes.filter((t) => !only || only.has(t.label)).map((t) => ({
  ...t, data: JSON.parse(fs.readFileSync(path.join(extensionRoot, t.path), 'utf8')),
  className: `${pkg.publisher}.${pkg.name}-${t.path.replace(/^\.\//, '')}`.replace(/[^_a-zA-Z0-9-]/g, '-'),
}));
if (!themes.length) stop(2, `no theme matches --only ${flag('--only')}`);

const settingsFile = path.join(dirs.data, 'User/settings.json');
const BASE_SETTINGS = {
  'workbench.startupEditor': 'none', 'window.restoreWindows': 'none', 'security.workspace.trust.enabled': false,
  // "off", not false: VS Code migrates false to "off" by rewriting the whole file, which can drop a theme written meanwhile
  'update.mode': 'none', 'extensions.autoUpdate': 'off', 'extensions.autoCheckUpdates': false, 'telemetry.telemetryLevel': 'off',
};
const readSettings = () => { try { return JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch { return {}; } };
const writeSettings = (label) => {
  const settings = { ...readSettings(), ...BASE_SETTINGS };
  if (label) settings['workbench.colorTheme'] = label; else delete settings['workbench.colorTheme'];
  fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 1));
};
writeSettings(themes[0].label);
if (firstRun.state) {
  fs.mkdirSync(path.join(dirs.data, 'User/globalStorage'), { recursive: true });
  const db = new DatabaseSync(path.join(dirs.data, 'User/globalStorage/state.vscdb'));
  db.exec('CREATE TABLE IF NOT EXISTS ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)');
  for (const [k, v] of Object.entries(firstRun.state)) db.prepare('INSERT INTO ItemTable VALUES (?, ?)').run(k, v);
  db.close();
}
if (firstRun.storage) {
  fs.mkdirSync(path.join(dirs.data, 'User/globalStorage'), { recursive: true });
  fs.writeFileSync(path.join(dirs.data, 'User/globalStorage/storage.json'), JSON.stringify(firstRun.storage));
}

const port = await new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
let editorLog = '';
editor = spawn(exe, [dirs.workspace, path.join(dirs.workspace, 'sample.ts'), `--user-data-dir=${dirs.data}`, `--extensions-dir=${dirs.extensions}`,
  `--remote-debugging-port=${port}`, '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust', '--new-window', '--force-color-profile=srgb',
  ...(process.platform === 'darwin' ? ['--use-mock-keychain'] : []), ...(firstRun.args || []), ...(vsix ? [] : [`--extensionDevelopmentPath=${ROOT}`])],
{ stdio: ['ignore', 'pipe', 'pipe'], detached: !WIN, cwd: dirs.workspace, env });
editor.on('error', (e) => stop(1, `cannot start ${exe}: ${e.message}`));
editor.stdout.on('data', (d) => { editorLog += d; });
editor.stderr.on('data', (d) => { editorLog += d; });

let seq = 0, ws = null;
const waiting = new Map(), errors = [];
function open(url) {
  const socket = new WebSocket(url);
  socket.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  return new Promise((resolve, reject) => { socket.addEventListener('open', () => resolve(socket)); socket.addEventListener('error', () => reject(new Error(`cannot open ${url}`))); });
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`${method} got no answer in 30 s`)); }, 30000);
  waiting.set(id, (m) => { clearTimeout(timer); resolve(m); });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

// the workbench window, not a glass or agents window the editor may open beside it
const until = Date.now() + 120000;
while (!ws && Date.now() < until) {
  try {
    const pages = (await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) })).json()).filter((t) => t.type === 'page');
    for (const page of pages) {
      ws = await open(page.webSocketDebuggerUrl);
      if (await evaluate(`!!document.querySelector('.monaco-workbench .part.editor') && !document.body.dataset.cursorGlassMode`)) break;
      ws.close(); ws = null;
    }
  } catch { ws?.close(); ws = null; }
  if (!ws) await sleep(500);
}
if (!ws) stop(1, `no workbench window on port ${port}\n${editorLog.split('\n').slice(-12).join('\n')}`);
await send('Runtime.enable');
await send('Log.enable');

const READ = (keys) => `(() => {
  const wb = document.querySelector('.monaco-workbench');
  const cs = getComputedStyle(wb), vars = {};
  for (const k of ${JSON.stringify(keys)}) vars[k] = cs.getPropertyValue('--vscode-' + k.replace(/\\./g, '-')).trim();
  return { vars, classes: wb.className };
})()`;
// a first-run layer the recipes above did not skip: hidden for the screenshot and recorded
const HIDE = `(() => {
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
  const W = innerWidth, H = innerHeight, hidden = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.monaco-grid-view') || el.classList.contains('monaco-workbench') || el.querySelector('.monaco-grid-view')) continue;
    const s = getComputedStyle(el), b = el.getBoundingClientRect();
    if (s.display === 'none' || (s.position !== 'fixed' && s.position !== 'absolute') || b.width < W * 0.9 || b.height < H * 0.9) continue;
    if (s.backgroundImage === 'none' && /^rgba\\(.*,\\s*0\\)$|^transparent$/.test(s.backgroundColor)) continue;
    el.style.setProperty('display', 'none', 'important');
    hidden.push(name(el));
  }
  return hidden;
})()`;
function css(v) {
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const m = v.match(/^rgba?\((.+)\)$/);
  if (m) {
    const [r, g, b, a = '1'] = m[1].split(/[\s,/]+/).filter(Boolean);
    const unit = (x, scale) => (x.endsWith('%') ? (parseFloat(x) / 100) * scale : parseFloat(x));
    return { r: Math.round(unit(r, 255)), g: Math.round(unit(g, 255)), b: Math.round(unit(b, 255)), a: unit(a, 1) };
  }
  try { return parse(v); } catch { return null; }
}
// VS Code keeps an alpha to 3 decimals and writes it with 2, so 70/255 (0.2745) is written 0.28
const written = (a) => +(Math.round(a * 1000) / 1000).toFixed(2);
const same = (a, b) => !!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b && (Math.abs(a.a - b.a) <= 0.0051 || written(a.a) === b.a || written(b.a) === a.a);
const KIND = { vs: 'vs', 'vs-dark': 'vs-dark', 'hc-black': 'hc-black', 'hc-light': 'hc-light' };
const shot = async (file) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  if (s.result?.data) fs.writeFileSync(file, Buffer.from(s.result.data, 'base64'));
};
if (shots) fs.mkdirSync(shots, { recursive: true });

const results = [], unknownKeys = new Set();
for (const [i, t] of themes.entries()) {
  const keys = Object.keys(t.data.colors);
  const want = parse(t.data.colors['editor.background']);
  writeSettings(t.label);
  let got = null, seen = null;
  const deadline = Date.now() + (i === 0 ? 90000 : 20000);
  for (let tick = 1; Date.now() < deadline; tick++) {
    got = await evaluate(READ(['editor.background']));
    seen = got?.vars['editor.background'];
    const ours = got && (got.classes.includes(t.className) || !got.classes.includes(`${pkg.publisher}-${pkg.name}-`));
    if (ours && same(css(seen), want)) break;
    got = null;
    // the editor rewrote settings.json, or put up another theme at startup (a development host shows its
    // extension's first one) and has seen no change since: write the name again, through a change
    if (tick % 25 === 0) {
      if (readSettings()['workbench.colorTheme'] === t.label) { writeSettings(null); await sleep(500); }
      writeSettings(t.label);
    }
    await sleep(200);
  }
  const row = { label: t.label, loaded: !!got, compared: 0, exact: 0, unknown: 0, different: [] };
  const file = shots && path.join(shots, `${t.label.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.png`);
  if (got) {
    await sleep(i === 0 ? 5000 : 300);
    got = await evaluate(READ(keys));
    row.kindClass = KIND[t.uiTheme] && got.classes.split(/\s+/).includes(KIND[t.uiTheme]);
    for (const [k, v] of Object.entries(t.data.colors)) {
      const live = got.vars[k];
      if (!live) { row.unknown++; unknownKeys.add(k); continue; }
      row.compared++;
      if (same(parse(v), css(live))) row.exact++; else row.different.push(`${k}: ${v} resolved as ${live}`);
    }
    if (shots) {
      const hidden = await evaluate(HIDE);
      if (hidden?.length) row.hidden = hidden;
      await shot(file);
    }
  } else {
    row.seen = { background: seen ?? null, setting: readSettings()['workbench.colorTheme'] ?? null };
    if (shots) await shot(file);
  }
  results.push(row);
  console.log(`${row.loaded ? (row.different.length ? 'DIFF' : 'ok  ') : 'MISS'} ${t.label.padEnd(40)} ${row.exact}/${row.compared} exact, ${row.unknown} not registered${row.kindClass === false ? ', wrong theme kind class' : ''}${row.hidden ? `, hid ${row.hidden.join(' ')}` : ''}`);
  for (const d of row.different.slice(0, 5)) console.log(`       ${d}`);
  if (row.seen) console.log(`       background seen ${row.seen.background}, settings name ${row.seen.setting}`);
}

const totals = results.reduce((a, r) => ({ loaded: a.loaded + (r.loaded ? 1 : 0), compared: a.compared + r.compared, exact: a.exact + r.exact, unknown: a.unknown + r.unknown }), { loaded: 0, compared: 0, exact: 0, unknown: 0 });
const kindWrong = results.filter((r) => r.kindClass === false).length;
const themeErrors = errors.filter((e) => /\btheme\b|tuguidragos\.tapetum/i.test(String(e).split('\n')[0].replace(/(?:[a-z][a-z0-9+.-]*:\/\/|\/)\S+/gi, '')));
console.log(`\n${identity.name} ${identity.version}${identity.core ? ` (core ${identity.core})` : ''}: ${totals.loaded} of ${themes.length} themes loaded, ${totals.exact} of ${totals.compared} values exact, ${unknownKeys.size} keys not registered in the workbench window, ${kindWrong} with the wrong kind class`);
console.log(`console errors: ${errors.length}, of them about themes: ${themeErrors.length}`);
for (const e of themeErrors.slice(0, 5)) console.log(`   ${String(e).split('\n')[0].slice(0, 200)}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ editor: identity, target, extension: vsix ? path.basename(extensionRoot) : 'development', firstRun, totals, kindWrong, unknownKeys: [...unknownKeys].sort(), errors, results }, null, 1));
ws.close();
stop(totals.loaded === themes.length && totals.exact === totals.compared && !kindWrong ? 0 : 1);

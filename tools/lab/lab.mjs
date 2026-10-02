// The lab: an isolated editor with the themes of a given tree and a driver extension, on a fixture workspace.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { _electron } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(HERE, '../..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function resolveEditor(p) {
  p = path.resolve(p);
  if (p.endsWith('.app')) {
    const name = spawnSync('plutil', ['-extract', 'CFBundleExecutable', 'raw', path.join(p, 'Contents/Info.plist')], { encoding: 'utf8' }).stdout.trim();
    return { exe: path.join(p, 'Contents/MacOS', name), app: path.join(p, 'Contents/Resources/app') };
  }
  const app = [path.join(path.dirname(p), 'resources/app'), path.join(path.dirname(p), '../Resources/app')].find((a) => fs.existsSync(path.join(a, 'product.json')));
  if (!app) throw new Error(`no resources/app with a product.json next to ${p}`);
  return { exe: p, app };
}

const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'init.defaultBranch=main',
  '-c', 'commit.gpgsign=false', '-c', 'protocol.file.allow=always', ...args], { cwd, stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_DATE: '2026-09-01T10:00:00Z', GIT_COMMITTER_DATE: '2026-09-01T10:00:00Z' } });
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

// a git repository with staged, unstaged, renamed, deleted and untracked files, a submodule, and the files the scenes open
export function buildWorkspace(dir) {
  fs.cpSync(path.join(HERE, 'fixture'), dir, { recursive: true });
  git(dir, 'init', '-q');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'fixture');
  write(path.join(dir, 'docs/links.md'), '# Links\n\nPlain text beside a [link to the guide](https://example.invalid/guide), then more plain text,\n'
    + 'and a second [link to the notes](https://example.invalid/notes) in the same paragraph.\n\n- read the [release notes](https://example.invalid/release) before you update\n- plain item without a link\n');
  git(dir, 'add', 'docs/links.md');
  git(dir, 'commit', '-q', '-m', 'links');
  fs.appendFileSync(path.join(dir, 'src/style.css'), '\n.card.selected {\n  font-weight: 600;\n}\n');
  git(dir, 'add', 'src/style.css');
  const app = path.join(dir, 'src/app.ts');
  fs.writeFileSync(app, fs.readFileSync(app, 'utf8').replace('const TAX_RATE = 0.19;', 'const TAX_RATE = 0.21; // changed rate') + '\nexport const VERSION = "1.0.0";\n');
  fs.writeFileSync(path.join(dir, 'data.json'), fs.readFileSync(path.join(dir, 'data.json'), 'utf8').replace('"price": 180', '"price": 175'));
  fs.rmSync(path.join(dir, 'old.txt'));
  git(dir, 'mv', 'src/main.go', 'src/server.go');
  const sub = `${dir}-submodule`;
  write(path.join(sub, 'lib.txt'), 'lib\n');
  git(sub, 'init', '-q');
  git(sub, 'add', '-A');
  git(sub, 'commit', '-q', '-m', 'lib');
  git(dir, 'submodule', '--quiet', 'add', sub, 'vendor/lib');
  write(path.join(dir, 'notes.txt'), 'untracked notes\n');
  write(path.join(dir, 'src/broken.ts'), 'export const broken: number = "not a number";\n');
  write(path.join(dir, 'long.txt'), Array.from({ length: 160 }, (_, i) => `line ${String(i).padStart(3, '0')} ${'the quick brown fox jumps over the lazy dog '.repeat(8)}`).join('\n') + '\n');
  write(path.join(dir, 'conflict.ts'), 'export function total(items: number[]): number {\n<<<<<<< HEAD\n  // current: sum with a loop\n  let sum = 0;\n'
    + '||||||| base\n  // common ancestor: the first version\n  let sum = items.length;\n=======\n  // incoming: reduce\n'
    + '  const sum = items.reduce((a, b) => a + b, 0);\n>>>>>>> feature\n  return sum;\n}\n');
  write(path.join(dir, 'cells.ipynb'), JSON.stringify({ cells: [{ cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
    source: ['# the tax rate of the shop\n', 'rate = 0.19\n', 'total = 120 * (1 + rate)'] }], metadata: { language_info: { name: 'python' } }, nbformat: 4, nbformat_minor: 5 }));
  write(path.join(dir, 'm-base.ts'), '// shared header\nconst rate = 0.19; // base comment\nexport const name = "base";\n');
  write(path.join(dir, 'm-in1.ts'), '// shared header\nconst rate = 0.21; // left comment\nexport const name = "left";\n');
  write(path.join(dir, 'm-in2.ts'), '// shared header\nconst rate = 0.20; // right comment\nexport const name = "right";\n');
  fs.copyFileSync(path.join(dir, 'm-base.ts'), path.join(dir, 'm-out.ts'));
  write(path.join(dir, 'stop.js'), '// a program that stops at its debugger statement\nconst rate = 0.19; // tax rate\nfunction inner() {\n'
    + '  debugger; // stopped here, a comment on the top frame line\n  return rate * 42; // after the stop\n}\nfunction outer() {\n'
    + '  return inner(); // the caller frame, a comment on the focused frame line\n}\nconsole.log(outer());\n');
  write(path.join(dir, '.vscode/launch.json'), JSON.stringify({ version: '0.2.0', configurations: [{ type: 'node', request: 'launch', name: 'Stop',
    program: '${workspaceFolder}/stop.js', runtimeExecutable: process.execPath, console: 'internalConsole' }] }, null, 1));
  write(path.join(dir, 'checks.test.js'), "// checks for the inventory\ntest('a failed test', () => {\n  expect(total(1)).toBe(1);\n});\n\n"
    + "test('an errored test', () => {\n  load('missing.json');\n});\n\ntest('a passed test', () => {\n  expect(total(0)).toBe(0);\n});\n");
}

const CONTENT_TYPES = '<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension=".json" ContentType="application/json"/><Default Extension=".js" ContentType="application/javascript"/>'
  + '<Default Extension=".vsixmanifest" ContentType="text/xml"/></Types>';

// a VSIX of an extension folder, enough for the editor's own installer
export function packVsix(source, files, out) {
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'tlab-vsix-'));
  for (const f of ['package.json', ...files]) fs.cpSync(path.join(source, f), path.join(stage, 'extension', f), { recursive: true });
  fs.writeFileSync(path.join(stage, '[Content_Types].xml'), CONTENT_TYPES);
  fs.writeFileSync(path.join(stage, 'extension.vsixmanifest'), `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
 <Metadata>
  <Identity Language="en-US" Id="${pkg.name}" Version="${pkg.version}" Publisher="${pkg.publisher}" />
  <DisplayName>${pkg.displayName || pkg.name}</DisplayName>
  <Properties><Property Id="Microsoft.VisualStudio.Code.Engine" Value="${pkg.engines.vscode}" /></Properties>
 </Metadata>
 <Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation>
 <Dependencies/>
 <Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" /></Assets>
</PackageManifest>`);
  fs.rmSync(out, { force: true });
  execFileSync('zip', ['-q', '-r', '-X', out, '[Content_Types].xml', 'extension.vsixmanifest', 'extension'], { cwd: stage });
  fs.rmSync(stage, { recursive: true, force: true });
}

// the themes of a git revision, or of the working tree when ref is empty
export function themeSource(ref) {
  if (!ref) return ROOT;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlab-ref-'));
  const archive = execFileSync('git', ['archive', ref, 'package.json', 'themes'], { cwd: ROOT, maxBuffer: 1 << 30 });
  execFileSync('tar', ['-x', '-C', dir], { input: archive });
  return dir;
}

const BASE_SETTINGS = {
  'workbench.startupEditor': 'none', 'window.restoreWindows': 'none', 'security.workspace.trust.enabled': false,
  'update.mode': 'none', 'extensions.autoUpdate': 'off', 'extensions.autoCheckUpdates': false, 'telemetry.telemetryLevel': 'off',
  'editor.minimap.enabled': false, 'git.openRepositoryInParentFolders': 'always', 'git.detectSubmodules': true,
};

// macOS caps socket paths near 104 characters, and the editor and the debugger put theirs in the profile and in TMPDIR
export function prepare(editor, themes, settings = {}) {
  const base = fs.mkdtempSync(path.join('/tmp', 'tlab-'));
  const run = { base, data: `${base}/d`, extensions: `${base}/e`, workspace: `${base}/w`, home: `${base}/h`, tmp: `${base}/t`, ipc: `${base}/i` };
  for (const d of [run.data, run.extensions, run.home, run.tmp, run.ipc]) fs.mkdirSync(d, { recursive: true });
  buildWorkspace(run.workspace);
  const env = { ...process.env, HOME: run.home, TMPDIR: `${run.tmp}/` };
  packVsix(themes, ['themes'], `${base}/tapetum.vsix`);
  packVsix(path.join(HERE, 'driver'), ['extension.js'], `${base}/driver.vsix`);
  for (const vsix of [`${base}/tapetum.vsix`, `${base}/driver.vsix`]) {
    const r = spawnSync(editor.exe, [path.join(editor.app, 'out/cli.js'), '--user-data-dir', run.data, '--extensions-dir', run.extensions, '--install-extension', vsix, '--force'],
      { encoding: 'utf8', env: { ...env, ELECTRON_RUN_AS_NODE: '1' } });
    if (r.status !== 0) throw new Error(`could not install ${vsix}: ${r.stderr || r.stdout}`);
  }
  write(`${run.data}/User/settings.json`, JSON.stringify({ ...BASE_SETTINGS, ...settings, 'tapetumLab.dir': run.ipc }, null, 1));
  run.env = env;
  return run;
}

export async function launch(editor, run, size = [1500, 950]) {
  const app = await _electron.launch({
    executablePath: editor.exe,
    args: [run.workspace, `--user-data-dir=${run.data}`, `--extensions-dir=${run.extensions}`, '--password-store=basic', '--disable-updates', '--skip-welcome',
      '--skip-release-notes', '--disable-workspace-trust', '--disable-telemetry', '--use-inmemory-secretstorage', '--new-window', '--force-color-profile=srgb'],
    env: run.env, timeout: 90000,
  });
  const page = await app.firstWindow({ timeout: 90000 });
  await page.waitForSelector('.monaco-workbench', { timeout: 90000 });
  const start = Date.now();
  while (!fs.existsSync(`${run.ipc}/ready.json`) && Date.now() - start < 60000) await sleep(200);
  if (!fs.existsSync(`${run.ipc}/ready.json`)) throw new Error('the driver extension did not start');
  await app.evaluate(({ BrowserWindow }, [w, h]) => BrowserWindow.getAllWindows()[0].setBounds({ x: 40, y: 40, width: w, height: h }), size);
  await sleep(800);
  // the window of a script is rarely the focused one, so focus is emulated unless a scene turns it off
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  return { app, page, cdp };
}

let sequence = 0;
export async function command(run, body, timeout = 30000) {
  const n = Date.now() * 1000 + ++sequence;
  fs.writeFileSync(`${run.ipc}/tmp-${n}.json`, JSON.stringify(body));
  fs.renameSync(`${run.ipc}/tmp-${n}.json`, `${run.ipc}/cmd-${n}.json`);
  const res = `${run.ipc}/res-${n}.json`, start = Date.now();
  while (!fs.existsSync(res)) {
    if (Date.now() - start > timeout) throw new Error(`no answer to ${JSON.stringify(body)}`);
    await sleep(40);
  }
  const out = JSON.parse(fs.readFileSync(res, 'utf8'));
  fs.unlinkSync(res);
  if (!out.ok) throw new Error(`${body.op} failed: ${out.error}`);
  return out;
}

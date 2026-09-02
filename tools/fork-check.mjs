// Checks every theme against another editor built on VS Code, without touching this repository.
// Usage: node tools/fork-check.mjs <name> <path to the editor's resources/app> [--keep]
//
// The repository is copied to a temporary folder, the editor's colour registry, stylesheets and
// derivations are extracted into the copy exactly as they are for VS Code, and analyze, audit and
// deep run there. The summary says what the editor knows that the committed registry does not,
// what it does not know yet, and which findings are real. An editor on an older or extended core
// does not know every key Tapetum sets and registers keys of its own, so the missing and dead key
// counts of audit, its README figures, and the coverage and seam classes of analyze are reported
// as expected; every other finding, and anything deep reports, is real and sets the exit code.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const keep = process.argv.includes('--keep');
const [name, given] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!name || !given) {
  console.error("usage: node tools/fork-check.mjs <name> <path to the editor's resources/app> [--keep]");
  process.exit(2);
}

function resolveApp(p) {
  for (const c of [p, path.join(p, 'Contents/Resources/app'), path.join(p, 'resources/app'), path.join(p, 'lib/vscode')]) {
    if (fs.existsSync(path.join(c, 'product.json'))) return path.resolve(c);
  }
  throw new Error(`no product.json under ${p}; pass the editor's resources/app folder`);
}

const app = resolveApp(given);
const product = JSON.parse(fs.readFileSync(path.join(app, 'product.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const core = product.vscodeVersion || product.vsCodeVersion;
const RUN = fs.mkdtempSync(path.join(os.tmpdir(), `tapetum-${name}-`));
const SKIP = new Set(['.git', 'node_modules', 'readme-assets', '.vscode-test', '_shots']);
fs.cpSync(ROOT, RUN, {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(ROOT, src);
    return rel === '' || (!SKIP.has(rel.split(path.sep)[0]) && !rel.endsWith('.vsix'));
  },
});
try {
  fs.symlinkSync(path.join(ROOT, 'readme-assets'), path.join(RUN, 'readme-assets'), 'junction');
} catch {
  fs.cpSync(path.join(ROOT, 'readme-assets'), path.join(RUN, 'readme-assets'), { recursive: true });
}
const cleanup = () => {
  if (keep) console.log(`\ncopy kept in ${RUN}`);
  else fs.rmSync(RUN, { recursive: true, force: true });
};

const env = { ...process.env, VSCODE_APP: app };
const run = (tool) => spawnSync(process.execPath, [path.join(RUN, 'tools', tool)], { env, encoding: 'utf8', cwd: RUN, maxBuffer: 64 * 1024 * 1024 });
const list = (arr, max = 12) => (arr.length ? arr.slice(0, max).join(', ') + (arr.length > max ? `, and ${arr.length - max} more` : '') : 'none');

console.log(`${name}: ${product.nameLong} ${product.version}${core && core !== product.version ? ` on VS Code ${core}` : ''}${product.date ? `, built ${product.date.slice(0, 10)}` : ''}`);
console.log(`Tapetum ${pkg.version}, the working tree, copied to ${RUN}\n`);

for (const t of ['extract-keys.mjs', 'extract-pairs.mjs', 'extract-derivations.mjs']) {
  const r = run(t);
  if (r.status !== 0) {
    console.log(`${t} failed:\n${(r.stderr || r.stdout).trim()}`);
    cleanup();
    process.exit(1);
  }
  console.log(r.stdout.trim().split('\n').slice(0, 3).join('\n'));
}

const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/vscode-color-keys-full.json'), 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(RUN, 'tools/vscode-color-keys-full.json'), 'utf8'));
const basePairs = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/render-pairs.json'), 'utf8')).map((p) => `${p.fg}|${p.bg}`));
const pairs = JSON.parse(fs.readFileSync(path.join(RUN, 'tools/render-pairs.json'), 'utf8'));
const theme = JSON.parse(fs.readFileSync(path.join(ROOT, pkg.contributes.themes[0].path), 'utf8'));
const set = new Set(Object.keys(theme.colors));
const forkKeys = new Set(reg.confirmedReal);
const baseKeys = new Set(base.confirmedReal);
const forkDep = new Set(reg.deprecated);
const onlyFork = [...forkKeys].filter((k) => !baseKeys.has(k)).sort();
const onlyBase = [...baseKeys].filter((k) => !forkKeys.has(k)).sort();
const unknown = [...set].filter((k) => !forkKeys.has(k)).sort();
const stale = [...set].filter((k) => forkDep.has(k)).sort();
const unset = [...forkKeys].filter((k) => !forkDep.has(k) && !set.has(k)).sort();
const newPairs = pairs.filter((p) => !basePairs.has(`${p.fg}|${p.bg}`)).map((p) => `${p.fg} on ${p.bg}`);

console.log(`\nregistry: ${forkKeys.size} keys, ${forkDep.size} deprecated (committed registry, VS Code ${base.vscode}: ${baseKeys.size} keys)`);
console.log(`keys this editor has and VS Code ${base.vscode} does not (${onlyFork.length}): ${list(onlyFork)}`);
console.log(`keys VS Code ${base.vscode} has and this editor does not (${onlyBase.length}): ${list(onlyBase)}`);
console.log(`Tapetum keys this editor does not know, ignored harmlessly (${unknown.length}): ${list(unknown)}`);
console.log(`Tapetum keys this editor marks deprecated (${stale.length}): ${list(stale)}`);
console.log(`live keys of this editor left to its defaults (${unset.length}): ${list(unset)}`);
console.log(`text and background pairs from this editor's stylesheets: ${pairs.length}, not in the committed set (${newPairs.length}): ${list(newPairs, 8)}`);

const EXPECTED_KINDS = new Set(['coverage', 'seam']);
const EXPECTED_AUDIT = [/: \d+ missing keys$/, /: \d+ dead keys: /, /: \d+ deprecated keys set: /, /^README does not say /];
const normalise = (m) => m.replace(/#[0-9a-fA-F]{6,8}\b/g, '#').replace(/\d+(\.\d+)?/g, 'N');
const perTheme = new Map();
const real = { analyze: new Map(), audit: new Map(), deep: new Map() };
const expected = { analyze: new Map(), audit: new Map(), deep: new Map() };
const count = (map, key) => map.set(key, (map.get(key) || 0) + 1);
const themeOf = (label) => { if (!perTheme.has(label)) perTheme.set(label, { real: 0, expected: 0 }); return perTheme.get(label); };
const exits = {};

for (const t of ['analyze', 'audit', 'deep']) {
  const r = run(`${t}.mjs`);
  exits[t] = r.status;
  if (r.stderr.trim()) console.log(`\n${t} stderr: ${r.stderr.trim().split('\n').slice(0, 6).join('\n')}`);
  let label = null;
  let inProblems = false;
  for (const line of r.stdout.split('\n')) {
    if (t === 'audit') {
      if (/^\d+ PROBLEMS:$/.test(line)) { inProblems = true; continue; }
      if (!inProblems || !/^   \S/.test(line)) continue;
      const msg = line.trim();
      const m = msg.match(/^(Tapetum [^:]+): /);
      const ok = EXPECTED_AUDIT.some((re) => re.test(msg));
      count(ok ? expected.audit : real.audit, normalise(msg));
      if (m) themeOf(m[1])[ok ? 'expected' : 'real']++;
      continue;
    }
    const h = line.match(/^(Tapetum [^\d]+?)\s+(\d+ problems|\d+ keys\s+clean)$/);
    if (h) { label = h[1].trim(); themeOf(label); continue; }
    const m = line.match(/^\s+\[(\w+)\] (.*)$/);
    if (!m || !label) continue;
    const ok = t === 'analyze' && EXPECTED_KINDS.has(m[1]);
    count(ok ? expected[t] : real[t], `[${m[1]}] ${normalise(m[2])}`);
    themeOf(label)[ok ? 'expected' : 'real']++;
  }
}

const sum = (map) => [...map.values()].reduce((a, b) => a + b, 0);
for (const t of ['analyze', 'audit', 'deep']) {
  console.log(`\n${t}: exit ${exits[t]}, ${sum(expected[t])} expected on this core, ${sum(real[t])} real`);
  for (const [msg, n] of [...expected[t].entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`   expected ${String(n).padStart(3)}  ${msg}`);
  for (const [msg, n] of [...real[t].entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   REAL     ${String(n).padStart(3)}  ${msg}`);
}

const failing = [...perTheme.entries()].filter(([, v]) => v.real > 0);
const seen = perTheme.size;
console.log(`\nthemes seen: ${seen} of ${pkg.contributes.themes.length}`);
console.log(`themes with a real problem: ${failing.length ? failing.map(([k, v]) => `${k} (${v.real})`).join(', ') : 'none'}`);
const realTotal = sum(real.analyze) + sum(real.audit) + sum(real.deep);
const complete = seen === pkg.contributes.themes.length && exits.analyze !== null && exits.audit !== null && exits.deep !== null;
console.log(`\n${realTotal === 0 && complete ? 'PASS' : 'FAIL'} on ${product.nameLong} ${product.version}: ${realTotal} real problems${complete ? '' : ', and a check did not run to the end'}`);
cleanup();
process.exit(realTotal === 0 && complete ? 0 : 1);

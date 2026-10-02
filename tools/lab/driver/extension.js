// Answers the commands the lab writes into the folder named by the tapetumLab.dir setting:
// cmd-<n>.json in, res-<n>.json out, one at a time and in order.
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const settings = () => vscode.workspace.getConfiguration();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function activate(context) {
  const dir = settings().get('tapetumLab.dir');
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  const themeChanges = [];
  context.subscriptions.push(vscode.window.onDidChangeActiveColorTheme(() => themeChanges.push(Date.now())));

  const ops = {
    async theme({ label }) {
      if (settings().get('workbench.colorTheme') === label) return { changed: false };
      const before = themeChanges.length;
      await settings().update('workbench.colorTheme', label, vscode.ConfigurationTarget.Global);
      const start = Date.now();
      while (themeChanges.length === before && Date.now() - start < 15000) await wait(50);
      if (themeChanges.length === before) throw new Error(`the theme ${label} did not load`);
      return { changed: true };
    },
    async config({ key, value }) {
      await settings().update(key, value, vscode.ConfigurationTarget.Global);
      return { value: settings().get(key) };
    },
    async exec({ id, args = [] }) {
      const result = await vscode.commands.executeCommand(id, ...args);
      try { return { result: JSON.parse(JSON.stringify(result ?? null)) }; } catch { return { result: String(result) }; }
    },
    execNoWait({ id, args = [] }) {
      vscode.commands.executeCommand(id, ...args).then(() => {}, () => {});
      return {};
    },
    async open({ path: file, line, col = 1, preview = false, preserveFocus = false }) {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
      const editor = await vscode.window.showTextDocument(document, { preview, preserveFocus });
      if (line) {
        const at = new vscode.Position(line - 1, col - 1);
        editor.selection = new vscode.Selection(at, at);
        editor.revealRange(new vscode.Range(at, at), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
      }
      return {};
    },
    async dirty({ path: file, text = '# an unsaved edit\n' }) {
      const document = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === file);
      if (!document) throw new Error(`${file} is not open`);
      const edit = new vscode.WorkspaceEdit();
      edit.insert(document.uri, new vscode.Position(document.lineCount - 1, 0), text);
      await vscode.workspace.applyEdit(edit);
      return {};
    },
    cursor({ line, col, endCol }) {
      const editor = vscode.window.activeTextEditor;
      if (!editor) throw new Error('no active editor');
      const start = new vscode.Position(line - 1, col - 1);
      editor.selection = new vscode.Selection(start, endCol ? new vscode.Position(line - 1, endCol - 1) : start);
      editor.revealRange(new vscode.Range(start, start), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
      return {};
    },
    notify() {
      vscode.window.showInformationMessage('An information notification with a [link](https://example.invalid)', 'Open', 'Dismiss');
      vscode.window.showWarningMessage('A warning notification', 'Retry');
      vscode.window.showErrorMessage('An error notification', 'Details');
      return {};
    },
    progress({ ms = 20000 }) {
      vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'A long task', cancellable: true }, () => wait(ms));
      return {};
    },
    async revert() {
      for (const document of vscode.workspace.textDocuments.filter((d) => d.isDirty)) {
        await vscode.window.showTextDocument(document, { preview: false });
        await vscode.commands.executeCommand('workbench.action.files.revert');
      }
      return {};
    },
    // a run with a failed, an errored and a passed test on lines 2, 6 and 10 of a file, its results stale when retire is set
    tests({ path: file, retire = false }) {
      const controller = vscode.tests.createTestController('tapetumLabTests', 'Lab tests');
      context.subscriptions.push(controller);
      const uri = vscode.Uri.file(file);
      const items = [['failed', 'a failed test', 1], ['errored', 'an errored test', 5], ['passed', 'a passed test', 9]].map(([id, label, line]) => {
        const item = controller.createTestItem(id, label, uri);
        item.range = new vscode.Range(line, 0, line, 1);
        controller.items.add(item);
        return item;
      });
      const run = controller.createTestRun(new vscode.TestRunRequest(items), 'lab', true);
      run.failed(items[0], new vscode.TestMessage('expected 1, got 2'));
      run.errored(items[1], new vscode.TestMessage('it threw'));
      run.passed(items[2]);
      run.end();
      if (retire) controller.invalidateTestResults();
      return {};
    },
  };

  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    let names;
    try { names = fs.readdirSync(dir).filter((f) => /^cmd-\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4))); } catch { return; }
    if (!names.length) return;
    busy = true;
    for (const name of names) {
      const file = path.join(dir, name), n = name.slice(4, -5);
      let command;
      try { command = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
      fs.unlinkSync(file);
      let result;
      try {
        if (!ops[command.op]) throw new Error(`unknown op ${command.op}`);
        result = { ok: true, ...(await ops[command.op](command)) };
      } catch (e) { result = { ok: false, error: String(e?.message ?? e) }; }
      fs.writeFileSync(path.join(dir, `res-${n}.tmp`), JSON.stringify(result));
      fs.renameSync(path.join(dir, `res-${n}.tmp`), path.join(dir, `res-${n}.json`));
    }
    busy = false;
  }, 80);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
  fs.writeFileSync(path.join(dir, 'ready.json'), JSON.stringify({ version: vscode.version }));
}

module.exports = { activate, deactivate() {} };

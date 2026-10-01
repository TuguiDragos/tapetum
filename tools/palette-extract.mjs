import fs from 'node:fs';

const ROLE_SCOPE = {
  keyword: 'keyword.control',
  string: 'string.quoted',
  func: 'entity.name.function',
  type: 'entity.name.type',
  number: 'constant.numeric',
  comment: 'comment',
  param: 'variable.parameter',
  prop: 'variable.other.property',
  tag: 'entity.name.tag',
  op: 'keyword.operator',
  variable: 'variable.other.readwrite',
  regexp: 'string.regexp',
};

// the rule TextMate gives a lone scope: the selector with the most matching segments, the later rule on a tie
const ruleFor = (rules, scope) => {
  let best = null, depth = 0;
  for (const r of rules) for (const sel of [].concat(r.scope || [])) {
    if (sel.includes(' ') || !(scope === sel || scope.startsWith(sel + '.'))) continue;
    const d = sel.split('.').length;
    if (d >= depth && r.settings?.foreground) { best = r; depth = d; }
  }
  return best;
};

const UI = ['editor.background', 'editor.foreground', 'editor.lineHighlightBackground',
  'editorLineNumber.foreground', 'editorLineNumber.activeForeground', 'editorCursor.foreground',
  'sideBar.background', 'sideBar.foreground', 'sideBarSectionHeader.foreground',
  'activityBar.background', 'activityBar.foreground', 'activityBar.inactiveForeground', 'activityBar.activeBorder',
  'tab.activeBackground', 'tab.activeForeground', 'tab.inactiveBackground', 'tab.inactiveForeground', 'tab.activeBorderTop',
  'editorGroupHeader.tabsBackground', 'statusBar.background', 'statusBar.foreground',
  'titleBar.activeBackground', 'titleBar.activeForeground', 'badge.background', 'badge.foreground',
  'button.background', 'button.foreground', 'editorIndentGuide.background1',
  'gitDecoration.modifiedResourceForeground', 'gitDecoration.addedResourceForeground',
  'terminal.ansiGreen', 'terminal.ansiRed', 'terminal.ansiYellow', 'panel.background', 'editorWidget.border'];

export function extract(file) {
  const t = JSON.parse(fs.readFileSync(file, 'utf8'));
  const syntax = {};
  for (const [role, scope] of Object.entries(ROLE_SCOPE)) {
    const rule = ruleFor(t.tokenColors || [], scope);
    if (rule) {
      syntax[role] = { hex: rule.settings.foreground, italic: /italic/.test(rule.settings.fontStyle || ''), bold: /bold/.test(rule.settings.fontStyle || '') };
    }
  }
  const ui = {};
  for (const k of UI) if (t.colors[k]) ui[k] = t.colors[k];
  return { name: t.name, type: t.type, syntax, ui };
}

if (process.argv[1] && import.meta.url.endsWith(encodeURI(process.argv[1].split("/").pop()))) {
  if (!process.argv[2]) { console.error('usage: node tools/palette-extract.mjs <theme.json>'); process.exit(2); }
  console.log(JSON.stringify(extract(process.argv[2]), null, 2));
}

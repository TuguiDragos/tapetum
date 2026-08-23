import fs from 'node:fs';

const ROLE_FROM_TOKEN = {
  keyword: 'Keywords',
  string: 'Strings',
  func: 'Functions and methods',
  type: 'Types and classes',
  number: 'Numbers and language constants',
  comment: 'Comment',
  param: 'Parameters',
  prop: 'Properties',
  tag: 'Tags',
  op: 'Operators and punctuation',
  variable: 'Variables',
  regexp: 'Regular expressions',
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
  for (const [role, ruleName] of Object.entries(ROLE_FROM_TOKEN)) {
    const rule = (t.tokenColors || []).find((r) => r.name === ruleName);
    if (rule?.settings?.foreground) {
      syntax[role] = { hex: rule.settings.foreground, italic: /italic/.test(rule.settings.fontStyle || ''), bold: /bold/.test(rule.settings.fontStyle || '') };
    }
  }
  const ui = {};
  for (const k of UI) if (t.colors[k]) ui[k] = t.colors[k];
  return { name: t.name, type: t.type, syntax, ui };
}

if (process.argv[1] && import.meta.url.endsWith(encodeURI(process.argv[1].split("/").pop()))) {
  console.log(JSON.stringify(extract(process.argv[2]), null, 2));
}

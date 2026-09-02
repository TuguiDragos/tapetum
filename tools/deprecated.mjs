export const KEPT_DEPRECATED = [
  { key: 'modernActivityBar.activeBackground', replacement: 'modernActivityBarItem.activeBackground',
    why: 'deprecated in VS Code 1.136; kept for one release for editors that have not reached 1.136 yet' },
  { key: 'modernActivityBar.activeForeground', replacement: 'modernActivityBarItem.activeForeground',
    why: 'deprecated in VS Code 1.136; kept for one release for editors that have not reached 1.136 yet' },
  { key: 'modernActivityBar.hoverBackground', replacement: 'modernActivityBarItem.hoverBackground',
    why: 'deprecated in VS Code 1.136; kept for one release for editors that have not reached 1.136 yet' },
  { key: 'modernActivityBar.hoverForeground', replacement: 'modernActivityBarItem.hoverForeground',
    why: 'deprecated in VS Code 1.136; kept for one release for editors that have not reached 1.136 yet' },
  { key: 'editorIndentGuide.background', replacement: 'editorIndentGuide.background1',
    why: 'deprecated since VS Code 1.85; kept while the manifest accepts VS Code 1.70' },
  { key: 'editorIndentGuide.activeBackground', replacement: 'editorIndentGuide.activeBackground1',
    why: 'deprecated since VS Code 1.85; kept while the manifest accepts VS Code 1.70' },
];

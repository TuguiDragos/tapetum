export const KEPT_DEPRECATED = [
  { key: 'modernActivityBar.activeBackground', replacement: 'modernActivityBarItem.activeBackground',
    why: 'deprecated in VS Code 1.136; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, VSCodium 1.135 in September 2026' },
  { key: 'modernActivityBar.activeForeground', replacement: 'modernActivityBarItem.activeForeground',
    why: 'deprecated in VS Code 1.136; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, VSCodium 1.135 in September 2026' },
  { key: 'modernActivityBar.hoverBackground', replacement: 'modernActivityBarItem.hoverBackground',
    why: 'deprecated in VS Code 1.136; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, VSCodium 1.135 in September 2026' },
  { key: 'modernActivityBar.hoverForeground', replacement: 'modernActivityBarItem.hoverForeground',
    why: 'deprecated in VS Code 1.136; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, VSCodium 1.135 in September 2026' },
  { key: 'chat.inputWorkingBorderColor2', replacement: null,
    why: 'deprecated in VS Code 1.138, which animates the chat input border from chat.inputWorkingBorderColor1 alone; kept while an editor Tapetum is checked on still cycles through all 3 colours, as tools/fork-check.mjs reports, VSCodium, Kiro and Windsurf in September 2026; there is no key it has to match' },
  { key: 'chat.inputWorkingBorderColor3', replacement: null,
    why: 'deprecated in VS Code 1.138, which animates the chat input border from chat.inputWorkingBorderColor1 alone; kept while an editor Tapetum is checked on still cycles through all 3 colours, as tools/fork-check.mjs reports, VSCodium, Kiro and Windsurf in September 2026; there is no key it has to match' },
];

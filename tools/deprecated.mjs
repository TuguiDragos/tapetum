export const KEPT_DEPRECATED = [
  { key: 'modernActivityBar.activeBackground', replacement: 'modernActivityBarItem.activeBackground',
    why: 'deprecated in VS Code 1.136; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, Positron 2026.10.2 on VS Code 1.134 in October 2026' },
  { key: 'modernActivityBar.activeForeground', replacement: 'modernActivityBarItem.activeForeground',
    why: 'deprecated in VS Code 1.136; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, Positron 2026.10.2 on VS Code 1.134 in October 2026' },
  { key: 'modernActivityBar.hoverBackground', replacement: 'modernActivityBarItem.hoverBackground',
    why: 'deprecated in VS Code 1.136; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, Positron 2026.10.2 on VS Code 1.134 in October 2026' },
  { key: 'modernActivityBar.hoverForeground', replacement: 'modernActivityBarItem.hoverForeground',
    why: 'deprecated in VS Code 1.136; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, Positron 2026.10.2 on VS Code 1.134 in October 2026' },
  { key: 'chat.voiceSpeakingGlow', replacement: 'chat.voiceListeningGlow',
    why: 'deprecated in VS Code 1.144, which paints the speaking state of Voice Mode with chat.voiceListeningGlow; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, VSCodium 1.143 and Positron 2026.10.2 on VS Code 1.134 in October 2026' },
];

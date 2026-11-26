export const KEPT_DEPRECATED = [
  { key: 'chat.voiceSpeakingGlow', replacement: 'chat.voiceListeningGlow',
    why: 'deprecated in VS Code 1.144, which paints the speaking state of Voice Mode with chat.voiceListeningGlow; kept while an editor Tapetum is checked on still uses it, as tools/fork-check.mjs reports, VSCodium 1.143, Positron 2026.11.1 on VS Code 1.138 and Devin 3.15.14 on VS Code 1.141.2 in November 2026' },
];

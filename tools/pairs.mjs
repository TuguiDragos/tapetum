import { over, parse, mix, alpha } from './color.mjs';

// An entry with bgAlpha matches only the variant of the pair painted at that share of its strength.
export const ACCEPTED = [
  {
    fg: 'descriptionForeground', bg: 'badge.background',
    why: 'appears only in .chat-debug-wirelog-badge. Grey text on a coloured badge is an inherent conflict: the themes shipped with VS Code measure 1.35 in 2026-dark and 1.17 in 2026-light, so it cannot be fixed without changing the badge colour across the whole interface.',
  },
  {
    fg: 'badge.foreground', bg: 'badge.background', bgAlpha: 0.5,
    why: 'the disabled plugin status of the sessions window is the badge at half strength under the ordinary badge text. Half a badge pulls the ground toward the surface, so the text reads only when it also stands apart from the surface: light text in a dark theme, dark text in a light one. Tapetum\'s badge text has the lightness of the surface in every theme (dark text on a bright badge in the dark themes, light text on a strong badge in the light ones), so 57 of 58 measure under 4.5, the lowest 2.16 in Passepartout Light; only Safelight\'s near-white badge holds. VS Code\'s own 2026-light measures 2.20, and Light Modern passes only because its badge is grey. The alternative is a different badge across the whole interface.',
  },
  {
    fg: 'inlineEdit.gutterIndicator.primaryForeground', bg: 'inlineEdit.gutterIndicator.background',
    why: 'the .inline-edits-view-indicator rule pairs them, but no bundle of VS Code 1.139.1 or 1.140.0 gives that class to any element: the gutter indicator is .inline-edits-view-gutter-indicator, and its icon paints primaryForeground on primaryBackground.',
  },
];
export const accepted = (p) => ACCEPTED.some((a) => a.fg === p.fg && a.bg === p.bg && a.bgAlpha === p.bgAlpha);

const SURFACES = ['editor.background', 'sideBar.background', 'panel.background',
  'editorWidget.background', 'titleBar.activeBackground', 'activityBar.background',
  'editorGroupHeader.tabsBackground', 'menu.background', 'quickInput.background'];

const RIDES_ANYWHERE = {
  'keybindingLabel.background': ['button.background', 'badge.background', 'list.activeSelectionBackground', 'notifications.background'],
};

const isTranslucent = (c) => parse(c).a < 1;

// A key painted at a share of its strength (a color-mix with transparent) is that key with its alpha scaled.
const faded = (c, share) => (share === undefined ? c : alpha(c, parse(c).a * share));

function worstSurface(t, bgKey, share) {
  if (!t.colors[bgKey]) return null;
  const bg = faded(t.colors[bgKey], share);
  if (!isTranslucent(bg)) return [{ under: null, resolved: bg }];
  const extra = RIDES_ANYWHERE[bgKey] || [];
  return [...SURFACES, ...extra].filter((s) => t.colors[s] && !isTranslucent(t.colors[s]))
    .map((s) => ({ under: s, resolved: over(bg, t.colors[s]) }));
}

// The surfaces a pair's text sits on: the background key, or, when the rule blends 2 keys, the
// dominant key with the other riding on it at its share, both composited on the same ground first.
export function surfacesFor(t, p) {
  const base = worstSurface(t, p.bg, p.bgAlpha);
  if (!base || !p.bgMix) return base;
  const other = t.colors[p.bgMix.key];
  if (!other) return null;
  return base.map(({ under, resolved }) => ({ under, resolved: mix(resolved, over(other, under ? t.colors[under] : resolved), p.bgMix.share) }));
}

export const textOn = (t, p, surface) => {
  const fg = over(faded(t.colors[p.fg], p.fgAlpha), surface);
  if (!p.fgMix || !t.colors[p.fgMix.key]) return fg;
  return mix(fg, over(t.colors[p.fgMix.key], surface), p.fgMix.share);
};

export const describe = (p) => {
  const part = (key, share, blend) => `${key}${share !== undefined ? ` at ${Math.round(share * 100)}%` : ''}${blend ? ` blended ${Math.round(blend.share * 100)}% with ${blend.key}` : ''}`;
  return `${part(p.fg, p.fgAlpha, p.fgMix)} on ${part(p.bg, p.bgAlpha, p.bgMix)}`;
};

export const FLOOR = (fgKey) => {
  if (/placeholder|inactive|ghost|disabled|dimmed|unnecessary|lineNumber(?!\.active)/i.test(fgKey)) return 3.0;
  if (/description|comment/i.test(fgKey)) return 4.0;
  return 4.5;
};

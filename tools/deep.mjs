import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, parse, deuter, protan, relLum, hex2lch, mix, alpha } from './color.mjs';
import { FAMILIES } from './palettes.mjs';
import { syntaxFloor } from './scheme-kit.mjs';
const VARIANT_KEYS = (f) => ['dark', 'light', 'hcDark', 'hcLight'].filter((k) => f[k]);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const load = (id, v) => JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${id}-${v}.json`), 'utf8'));
const isAlpha = (c) => parse(c).a < 1;
const ANSI = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'];

const OVERLAYS = ['editor.selectionBackground', 'editor.findMatchBackground', 'editor.findMatchHighlightBackground',
  'editor.wordHighlightBackground', 'editor.wordHighlightStrongBackground', 'editorBracketMatch.background',
  'editor.symbolHighlightBackground', 'editor.snippetTabstopHighlightBackground', 'diffEditor.insertedTextBackground',
  'diffEditor.removedTextBackground', 'editor.hoverHighlightBackground', 'editor.rangeHighlightBackground',
  'editor.selectionHighlightBackground', 'editor.lineHighlightBackground', 'merge.currentContentBackground'];

const GIT = ['modified', 'untracked', 'ignored', 'conflicting', 'deleted', 'added', 'renamed', 'stageModified',
  'stageDeleted', 'submodule'].map((k) => `gitDecoration.${k}ResourceForeground`);

const GIT_TWINS = [['added', 'untracked'], ['modified', 'stageModified'], ['deleted', 'stageDeleted']]
  .map(([a, b]) => `${a}/${b}`);

const NOT_TEXT = /^(welcomePage\.progress|agentsVoice|chart|scmGraph|minimap|progressBar|editorError|editorWarning|editorInfo|editorHint|inlineEdit|editorMultiCursor\.primary)/;
const DIM_OK = /placeholder|inactive|disabled|dimmed|ghost|unnecessary|deemphasized|retired|ignored|deprecated/i;

const STATUS_HUE = { error: 25, warn: 75, ok: 140, info: 265 };
const ANSI_HUE = { Red: 25, Yellow: 85, Green: 140, Cyan: 200, Blue: 265, Magenta: 335 };
const ANSI_EXEMPT = [
  { family: 'safelight', slot: 'Magenta', why: 'the darkroom has no magenta; the slot takes the salmon of the filter, as placed in the palette' },
];
const PRESENCE_EXEMPT = [
  { family: 'quantum', variant: 'light', key: 'editorStickyScrollHover.background', why: 'its syntax reads at 1.009 of the floor on the editor, so a hovered line that keeps every floor moves only 0.80 dE' },
];
const FOCUS_SURFACES = ['editor.background', 'sideBar.background', 'editorWidget.background', 'panel.background',
  'statusBar.background', 'titleBar.activeBackground'];
const WASH_SURFACES = [...FOCUS_SURFACES, 'editorGroupHeader.tabsBackground'];
const SESSION_FRAMES = ['chat.sessionStateIndicator.inProgressBorder', 'chat.sessionStateIndicator.unvisitedBorder',
  'chat.sessionStateIndicator.needsInputBorder'];
const TAB_STRIP_DE = 4.3;
// a link and the text beside it; every theme with colourful syntax stands 13 dE apart or more
const LINK_DE = 12;
const PRESENCE = [
  ['editor.lineHighlightBackground', 'editor.background', 3.0],
  ['editor.inactiveLineHighlightBackground', 'editor.background', 2.0],
  ['tab.hoverBackground', 'editorGroupHeader.tabsBackground', 3.0],
  ['modernTab.hoverBackground', 'editor.background', 2.0],
  ['modernTab.hoverBackground', 'menu.background', 2.0],
  ['modernTab.activeBackground', 'editor.background', TAB_STRIP_DE],
  ['modernTab.activeBackground', 'menu.background', TAB_STRIP_DE],
  ['modernEditorTab.activeBackground', 'editor.background', TAB_STRIP_DE],
  ['modernActivityBarItem.hoverBackground', 'modernActivityBar.background', 2.0],
  ['modernActivityBarItem.activeBackground', 'modernActivityBar.background', 4.0],
  ...[['button.hoverBackground', 'button.background'], ['extensionButton.hoverBackground', 'extensionButton.background'],
    ['extensionButton.prominentHoverBackground', 'extensionButton.prominentBackground'],
    ['agentsNewSessionButton.hoverBackground', 'agentsNewSessionButton.background'],
    ...['error', 'warning', 'offline', 'remote'].map((k) => [`statusBarItem.${k}HoverBackground`, `statusBarItem.${k}Background`])].map(([k, g]) => [k, g, 2.0]),
  ['editorStickyScrollHover.background', 'editorStickyScroll.background', 3.0],
  ['terminalStickyScrollHover.background', 'terminalStickyScroll.background', 3.0],
  ...['editor.selectionBackground', 'editor.inactiveSelectionBackground', 'editor.selectionHighlightBackground',
    'editor.findMatchBackground', 'editor.findMatchHighlightBackground', 'editor.findRangeHighlightBackground',
    'editor.hoverHighlightBackground', 'editor.rangeHighlightBackground', 'editor.symbolHighlightBackground',
    'editor.foldBackground', 'editorBracketMatch.background', 'editor.linkedEditingBackground',
    'editor.stackFrameHighlightBackground',
    'editor.focusedStackFrameHighlightBackground', 'toolbar.hoverBackground'].map((k) => [k, 'editor.background', 2.0]),
  ...['list.hoverBackground', 'list.activeSelectionBackground', 'list.inactiveSelectionBackground', 'list.focusBackground']
    .map((k) => [k, 'sideBar.background', 2.0]),
  ['statusBarItem.hoverBackground', 'statusBar.background', 2.0],
  ['menu.selectionBackground', 'menu.background', 2.0],
  ['editorSuggestWidget.selectedBackground', 'editorSuggestWidget.background', 2.0],
  ['quickInputList.focusBackground', 'quickInput.background', 2.0],
  ['terminal.selectionBackground', 'terminal.background', 2.0],
  ['terminal.inactiveSelectionBackground', 'terminal.background', 2.0],
  ['peekViewResult.selectionBackground', 'peekViewResult.background', 2.0],
];
const COMMENT_GLYPHS = ['editorGutter.commentGlyphForeground', 'editorGutter.commentUnresolvedGlyphForeground',
  'editorGutter.commentDraftGlyphForeground'];
// text on a wash over every surface; the find foregrounds both ways, since VS Code paints them crosswise to their descriptions
const WASH_PAIRS = [
  ['descriptionForeground', 'editor.inactiveSelectionBackground', 4.0],
  ['editor.selectionForeground', 'editor.inactiveSelectionBackground', 4.5],
  ['list.focusHighlightForeground', 'list.filterMatchBackground', 4.5],
  ['editor.findMatchForeground', 'editor.findMatchBackground', 4.5],
  ['editor.findMatchHighlightForeground', 'editor.findMatchBackground', 4.5],
  ['editor.findMatchForeground', 'editor.findMatchHighlightBackground', 4.5],
  ['editor.findMatchHighlightForeground', 'editor.findMatchHighlightBackground', 4.5],
];
// colours VS Code paints on whatever surface a component sits on, so each one has to read on all of them
const TEXT_SURFACES = ['editor.background', 'sideBar.background', 'panel.background', 'editorWidget.background', 'menu.background',
  'quickInput.background', 'editorHoverWidget.background', 'notifications.background', 'surface.background', 'agentsPanel.background'];
const ON_ANY_SURFACE = [
  ['foreground', 4.5], ['descriptionForeground', 4.0], ['errorForeground', 4.5], ['textLink.foreground', 4.5],
  ['textLink.activeForeground', 4.5], ['chat.mcpCompatibilityWarningForeground', 4.5], ['icon.foreground', 3.0], ['editorError.foreground', 3.0], ['editorWarning.foreground', 3.0],
  ['editorInfo.foreground', 3.0], ['problemsErrorIcon.foreground', 3.0], ['problemsWarningIcon.foreground', 3.0],
  ['problemsInfoIcon.foreground', 3.0], ['testing.iconFailed', 3.0], ['testing.iconPassed', 3.0], ['testing.iconQueued', 3.0],
  ['chat.workingProgressStableIconForeground', 3.0], ['chat.workingProgressInsidersIconForeground', 3.0],
];
// text VS Code paints on a known surface without a stylesheet pair: the debug views, notifications, parameter hints, dropdown options
const ON_ITS_SURFACE = [
  ...['name', 'value', 'string', 'number', 'boolean', 'error', 'type'].map((k) => [`debugTokenExpression.${k}`, ['sideBar.background', 'panel.background', 'editorHoverWidget.background']]),
  ['notificationLink.foreground', ['notifications.background']],
  ['editorHoverWidget.highlightForeground', ['editorHoverWidget.background']],
  ['pickerGroup.foreground', ['dropdown.listBackground']],
  ...['problemsWarningIcon.foreground', 'problemsInfoIcon.foreground'].map((k) => [k, ['menu.background', 'input.background']]),
];
// Insiders draws these surfaces as frosted glass, 50% to 100% of the surface over what lies under it, blurred: text on them,
// with the wash it sits on (a key, or a share of one over the glass) and the opacity VS Code draws it at when it dims it,
// and the surfaces of the theme that can lie under the glass
const tint = (k, share) => (c, glass) => mix(glass, over(c[k], glass), share);
const GLASS = {
  'quickInput.background': [['quickInput.foreground', 4.5], ['descriptionForeground', 4.0], ['list.highlightForeground', 4.5], ['icon.foreground', 3.0],
    // the description and the meta beside a name, which VS Code writes at 70% off the focused row
    ['quickInput.foreground', 4.0, null, 0.7],
    ['keybindingLabel.foreground', 4.5, 'keybindingLabel.background'], ['quickInputList.focusForeground', 4.5, 'quickInputList.focusBackground'],
    ['quickInputList.focusHighlightForeground', 4.5, 'quickInputList.focusBackground'],
    // Quick Chat lays a chat on it
    ['textLink.foreground', 4.5], ['textLink.activeForeground', 4.5], ['textPreformat.foreground', 4.5, 'textPreformat.background'],
    ['foreground', 4.5, 'chat.requestBubbleBackground'], ['chat.linesAddedForeground', 4.5], ['chat.linesRemovedForeground', 4.5]],
  // the action widget, and the context menus through a style Insiders injects
  'menu.background': [['menu.foreground', 4.5], ['foreground', 4.5], ['descriptionForeground', 4.0], ['menu.selectionForeground', 4.5, 'menu.selectionBackground'], ['list.hoverForeground', 4.5, 'list.hoverBackground'], ['descriptionForeground', 4.0, 'list.hoverBackground'], ['keybindingLabel.foreground', 4.5, 'keybindingLabel.background'],
    ['textLink.foreground', 4.5], ['textLink.activeForeground', 4.5], ['problemsWarningIcon.foreground', 4.5], ['problemsInfoIcon.foreground', 4.5],
    ['problemsWarningIcon.foreground', 4.5, 'list.hoverBackground'], ['problemsInfoIcon.foreground', 4.5, 'list.hoverBackground'],
    // the arrow of a submenu, at 60%
    ['menu.foreground', 3.0, null, 0.6],
    ['badge.foreground', 4.5, 'badge.background'], ['input.foreground', 4.5, 'input.background'], ['icon.foreground', 3.0],
    // the model picker of chat
    ['modernTab.activeForeground', 4.5, 'modernTab.activeBackground'], ['modernTab.hoverForeground', 4.5, 'modernTab.hoverBackground'],
    ['foreground', 4.5, 'toolbar.hoverBackground'], ['foreground', 4.5, 'chat.requestBubbleBackground'], ['foreground', 4.5, tint('button.background', 0.18)],
    ['descriptionForeground', 4.0, tint('foreground', 0.10)], ['foreground', 4.5, tint('foreground', 0.10)], ['foreground', 4.5, tint('charts.green', 0.22)],
    ['foreground', 4.5, tint('editorWarning.foreground', 0.22)]],
  'editorHoverWidget.background': [['editorHoverWidget.foreground', 4.5], ['foreground', 4.5], ['descriptionForeground', 4.0], ['textLink.foreground', 4.5],
    ['textLink.activeForeground', 4.5], ['icon.foreground', 3.0], ['editorHoverWidget.foreground', 4.5, 'textCodeBlock.background'],
    ['textLink.foreground', 4.5, 'editorHoverWidget.statusBarBackground'],
    // the hovers of a page with a bad certificate, an agent session, a chat attachment, a pull request or an issue, a chat model
    ['errorForeground', 4.5], ['chat.linesAddedForeground', 4.5], ['chat.linesRemovedForeground', 4.5], ['debugTokenExpression.name', 4.5], ['editor.foreground', 4.5],
    ['editor.foreground', 4.5, 'textCodeBlock.background'], ['textLink.foreground', 4.5, 'textCodeBlock.background'], ['descriptionForeground', 4.0, 'textCodeBlock.background'],
    ['notificationsWarningIcon.foreground', 3.0], ['notificationsInfoIcon.foreground', 3.0], ['extensionIcon.verifiedForeground', 3.0],
    ...['testing.iconFailed', 'testing.iconPassed', 'testing.iconQueued', 'charts.green', 'charts.purple', 'charts.red'].map((k) => [k, 3.0, 'textCodeBlock.background'])],
  'editorWidget.background': [['editorWidget.foreground', 4.5], ['descriptionForeground', 4.0], ['textLink.foreground', 4.5], ['icon.foreground', 3.0]],
  'notifications.background': [['notifications.foreground', 4.5], ['descriptionForeground', 4.0], ['notificationLink.foreground', 4.5], ['icon.foreground', 3.0],
    ['notificationsErrorIcon.foreground', 3.0], ['notificationsWarningIcon.foreground', 3.0], ['notificationsInfoIcon.foreground', 3.0]],
};
// at its default 80% the glass also lies over the washes a theme paints, a search match as a 12px blur keeps it, the minimap's
// selection at half its alpha
const washesUnderGlass = (c) => {
  const eb = c['editor.background'], side = c['sideBar.background'], term = c['terminal.background'], on = (k, base) => over(c[k], base);
  const sel = c['minimap.selectionHighlight'];
  return {
    'editor.selectionBackground': on('editor.selectionBackground', eb), 'editor.inactiveSelectionBackground': on('editor.inactiveSelectionBackground', eb),
    'minimap.selectionHighlight': mix(eb, sel.slice(0, 7), parse(sel).a * 0.5),
    ...Object.fromEntries(['inserted', 'removed'].map((d) => [`diffEditor.${d}TextBackground`, on(`diffEditor.${d}TextBackground`, on(`diffEditor.${d}LineBackground`, eb))])),
    'mergeEditor.change.word.background': on('mergeEditor.change.word.background', on('mergeEditor.change.background', eb)),
    ...Object.fromEntries(['modified', 'original'].map((s) => [`inlineEdit.${s}ChangedTextBackground`, on(`inlineEdit.${s}ChangedTextBackground`, on(`inlineEdit.${s}ChangedLineBackground`, eb))])),
    ...Object.fromEntries(['debugExceptionWidget.background', 'testing.coveredBackground', 'testing.uncoveredBackground'].map((k) => [k, on(k, eb)])),
    ...Object.fromEntries(['chat.requestBubbleBackground', 'chat.requestBubbleHoverBackground', 'list.activeSelectionBackground', 'list.inactiveSelectionBackground'].map((k) => [k, on(k, side)])),
    'terminal.selectionBackground': on('terminal.selectionBackground', term), 'terminal.inactiveSelectionBackground': on('terminal.inactiveSelectionBackground', term),
    'editor.findMatchBackground': mix(eb, on('editor.findMatchBackground', eb), 0.55), 'terminal.findMatchBackground': mix(term, on('terminal.findMatchBackground', term), 0.55),
  };
};
// the text of the surfaces under the glass, which its 12px blur keeps at about 12% where the lines are dense
const TEXT_UNDER_GLASS = { 'editor.background': 'editor.foreground', 'sideBar.background': 'sideBar.foreground', 'panel.background': 'foreground', 'terminal.background': 'terminal.foreground' };
const withText = (c, ground, text) => mix(ground, over(c[text], c['editor.background']), 0.12);
const UNDER_GLASS = ['editor.background', 'sideBar.background', 'panel.background', 'statusBar.background', 'titleBar.activeBackground', 'activityBar.background',
  'editorGroupHeader.tabsBackground', 'terminal.background'];
// text and surface set in different rules of the stylesheets, which tools/extract-pairs.mjs cannot pair
const multiDiffHeaders = (c) => {
  const header = over(c['sideBarSectionHeader.background'], c['editor.background']);
  return [header, over(c['toolbar.hoverBackground'], header), over(c['list.focusBackground'], header), over(c['list.inactiveSelectionBackground'], c['editor.background'])];
};
const COMPOSED = [
  { fg: (c) => c.descriptionForeground, grounds: (c) => [mix(c['menu.background'], over(c.foreground, c['menu.background']), 0.1)], floor: 4.0, what: 'description on a badge washed with the text at 10% over the menu' },
  { fg: (c) => c.descriptionForeground, grounds: (c) => [over(c['textCodeBlock.background'], c['editorHoverWidget.background'])], floor: 4.0, what: 'description on a code block pill in a hover' },
  { fg: (c) => c['textLink.foreground'], grounds: (c) => [over(c['textCodeBlock.background'], c['editorHoverWidget.background'])], floor: 4.5, what: 'link on a code block pill in a hover' },
  { fg: (c) => c['button.secondaryForeground'], grounds: (c) => ['activeSessionView.background', 'inactiveSessionView.background'].map((k) => over(c['button.secondaryBackground'], c[k])), floor: 4.5, what: 'secondary button in an Agents session' },
  { fg: (c) => c.foreground, grounds: multiDiffHeaders, floor: 4.5, what: 'file name on a multi diff card header' },
  { fg: (c, light) => alpha(c.foreground, light ? 0.95 : 0.7), grounds: multiDiffHeaders, floor: 4.0, what: 'description on a multi diff card header' },
  { fg: () => '#ffffff', grounds: (c) => [over(c['extensionIcon.preReleaseForeground'], c['editor.background'])], floor: 4.5, what: 'the white text VS Code writes on the pre-release badge' },
  { fg: (c) => c['textLink.foreground'], grounds: (c) => [over(c['editorHoverWidget.statusBarBackground'], c['editorHoverWidget.background'])], floor: 4.5, what: 'link on the status bar of a hover' },
  { fg: (c) => c['textLink.foreground'], share: 0.9, grounds: (c) => [c['editor.background']], floor: 4.5, what: 'link in a Settings description, which VS Code shows at 90%' },
  { fg: (c) => c['textLink.activeForeground'], share: 0.9, grounds: (c) => [c['editor.background']], floor: 4.5, what: 'hovered link in a Settings description, which VS Code shows at 90%' },
  { fg: (c) => c['textLink.activeForeground'], grounds: (c) => [over(c['list.hoverBackground'], mix(c['editorWidget.background'], c.foreground, 0.04))], floor: 4.5, what: 'hovered name on a featured card of the customization discovery' },
  { fg: (c) => c['sideBar.foreground'], grounds: (c) => [over(c['editor.findMatchHighlightBackground'], c['sideBar.background'])], floor: 4.5, what: 'a match in the search view, the side bar text on the find highlight' },
  { fg: (c) => c['editor.foreground'], grounds: (c) => [over(c['editor.findMatchHighlightBackground'], c['editor.background'])], floor: 4.5, what: 'text on a find highlight in the editor' },
  { fg: (c) => c['quickInputList.focusHighlightForeground'], grounds: (c) => [over(c['quickInputList.focusBackground'], c['quickInput.background'])], floor: 4.5, what: 'match highlight on the focused row of the command palette' },
  // the warning or note label of a chat picker sits on the chat pane, in the side bar, the panel or an editor; hovered or open it takes the toolbar hover
  ...['problemsWarningIcon.foreground', 'problemsInfoIcon.foreground'].map((k) => ({ fg: (c) => c[k], floor: 4.5, what: `${k}, the label of a chat picker on the chat pane, plain, hovered or open`,
    grounds: (c) => ['sideBar.background', 'panel.background', 'editor.background'].flatMap((s) => { const pane = over(c[s], c['editor.background']); return [pane, over(c['toolbar.hoverBackground'], pane)]; }) })),
  // VS Code writes the source, code and position of a problem at 70%, on the selected, focused and hovered rows too
  ...[[null, null], ['list.activeSelectionForeground', 'list.activeSelectionBackground'], ['list.inactiveSelectionForeground', 'list.inactiveSelectionBackground'],
    ['list.focusForeground', 'list.focusBackground'], ['list.hoverForeground', 'list.hoverBackground']].map(([k, row]) => ({
    fg: (c) => c[k] || c.foreground, share: 0.7, floor: 4.0, what: `the source of a problem at 70%${row ? ` on ${row}` : ' on the panel'}`,
    grounds: (c) => { const pane = over(c['panel.background'], c['editor.background']); return [row ? over(c[row], pane) : pane]; } })),
  // and a description beside a name in a list at 70% (95% in light themes), plain or hovered; focused and selected rows show it whole
  { fg: (c, light) => alpha(c['sideBar.foreground'], light ? 0.95 : 0.7), grounds: (c) => [c['sideBar.background']], floor: 4.0, what: 'a description in a side bar list' },
  { fg: (c, light) => alpha(c['list.hoverForeground'], light ? 0.95 : 0.7), grounds: (c) => [over(c['list.hoverBackground'], c['sideBar.background'])], floor: 4.0, what: 'a description on a hovered row of a side bar list' },
  // the placeholders of inputs and of the editors inside them: the source control message, the chat input, inline chat, a comment reply
  { fg: (c) => c['input.placeholderForeground'], grounds: (c) => [c['input.background']], floor: 3.2, what: 'the placeholder of an input' },
  { fg: (c) => c['editor.placeholder.foreground'], floor: 3.2, what: 'the placeholder of an editor in an input',
    grounds: (c) => [c['input.background'], over(c['inlineChat.background'], c['editor.background']), over(c['editorCommentsWidget.replyInputBackground'], c['editor.background'])] },
  { fg: (c) => c['terminal.foreground'], grounds: (c) => [c['terminal.findMatchBackground'].slice(0, 7), over(c['terminal.findMatchHighlightBackground'], c['terminal.background'])], floor: 4.5, what: 'terminal text on its find matches, the active one drawn by xterm without alpha' },
];
const DECORATED_NAMES = [...['added', 'modified', 'deleted', 'renamed', 'stageModified', 'stageDeleted', 'untracked', 'conflicting', 'submodule']
  .map((s) => `gitDecoration.${s}ResourceForeground`), 'list.errorForeground', 'list.warningForeground', 'list.invalidItemForeground'];
// with the modern UI off, a hovered tab takes these, in a focused group and in another
const CLASSIC_TAB_HOVERS = ['tab.hoverBackground', 'tab.unfocusedHoverBackground'];
const LINE_NUMBER_GROUNDS = ['editor.background', 'editorStickyScrollGutter.background', 'peekViewEditorGutter.background', 'peekViewEditorStickyScrollGutter.background'];
// sticky scroll paints every number in editorLineNumber.foreground, so the active one shows only in the editor and peek gutters
const ACTIVE_LINE_NUMBER_GROUNDS = ['editor.background', 'editorGutter.background', 'peekViewEditorGutter.background'];
// high contrast lines: rulers and guides 3.0 where they lie, the guides of the active block 4.5
const HC_LINES = [['editorRuler.foreground', 'editor.background', 3.0], ['tree.inactiveIndentGuidesStroke', 'sideBar.background', 3.0], ['tree.indentGuidesStroke', 'sideBar.background', 4.5],
  ...[1, 2, 3, 4, 5, 6].flatMap((i) => [[`editorIndentGuide.background${i}`, 'editor.background', 3.0], [`editorIndentGuide.activeBackground${i}`, 'editor.background', 4.5]])];
// the quieter text of high contrast, on the surface each is written on
const HC_QUIET = [['titleBar.inactiveForeground', 'titleBar.inactiveBackground'], ['activityBar.inactiveForeground', 'activityBar.background'],
  ['activityBarTop.inactiveForeground', 'activityBar.background'], ['tab.unfocusedInactiveForeground', 'tab.unfocusedInactiveBackground'],
  ['panelTitle.inactiveForeground', 'panel.background'], ['disabledForeground', 'editor.background'], ['list.deemphasizedForeground', 'sideBar.background'],
  ['input.placeholderForeground', 'input.background'], ['inlineChatInput.placeholderForeground', 'inlineChatInput.background'],
  ...['input.background', 'inlineChat.background', 'editorCommentsWidget.replyInputBackground'].map((g) => ['editor.placeholder.foreground', g]),
  ['agentsChatInput.placeholderForeground', 'agentsChatInput.background'], ['editor.placeholder.foreground', 'editor.background'],
  ['editor.foldPlaceholderForeground', 'editor.background'], ['commandCenter.inactiveForeground', 'commandCenter.background', 'titleBar.inactiveBackground']];
// a figure under a floor, cut rather than rounded, so 3.1996 does not read as 3.20
const findTextsOf = (c) => ['editor.findMatchForeground', 'editor.findMatchHighlightForeground'].map((k) => c[k]).filter(Boolean);
const down = (x) => (Math.floor(x * 100) / 100).toFixed(2);
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function analyse(fam, v) {
  const t = load(fam.id, v);
  const c = t.colors;
  const eb = c['editor.background'];
  const p = fam[v];
  const out = { label: t.name, findings: [] };
  const bad = (sev, msg) => out.findings.push({ sev, msg });
  out.pending = {};
  // a link is told from the text beside it by its colour alone: in a hover, a notification, the Settings and the markdown preview
  for (const k of ['textLink.foreground', 'notificationLink.foreground']) {
    const d = deltaE(over(c[k], eb), over(c.foreground, eb));
    if (d < LINK_DE) bad('links', `${k} at ${d.toFixed(1)} dE from the text beside it, under ${LINK_DE}`);
  }
  const pend = (what, cr, floor) => {
    const q = (out.pending[what] ||= { worst: 99, under: false });
    q.worst = Math.min(q.worst, cr);
    q.under ||= cr < floor;
  };
  const hc = t.type === 'hcDark' || t.type === 'hcLight';

  const sem = Object.entries(t.semanticTokenColors || {})
    .map(([k, val]) => [k, typeof val === 'string' ? val : val && val.foreground])
    .filter(([, val]) => val);
  let semWorst = 99, semKey = '';
  for (const [k, val] of sem) {
    const cr = contrast(over(val, eb), eb);
    if (cr < semWorst) { semWorst = cr; semKey = k; }
    const floor = /comment|deprecated|unnecessary|documentation/i.test(k) ? 4.0 : 4.5;
    if (cr < floor) bad('semantic', `${k} at ${cr.toFixed(2)}, under ${floor}`);
  }
  out.semantic = { count: sem.length, worst: semWorst, worstKey: semKey };

  const pairs = [];
  for (const k of Object.keys(c)) {
    if (!k.endsWith('Foreground') && !k.endsWith('.foreground')) continue;
    const base = k.replace(/(\.foreground|Foreground)$/, '');
    for (const cand of [`${base}.background`, `${base}Background`]) {
      if (!(cand in c) || NOT_TEXT.test(k) || DIM_OK.test(k)) continue;
      const bgv = c[cand];
      const ground = isAlpha(bgv) ? over(bgv, eb) : bgv;
      if (relLum(ground) === relLum(eb) && isAlpha(bgv) && parse(bgv).a < 0.04) continue;
      pairs.push({ fg: k, bg: cand, cr: contrast(over(c[k], ground), ground) });
    }
  }
  const sibFails = pairs.filter((x) => x.cr < 4.5 && !DIM_OK.test(x.fg) && !NOT_TEXT.test(x.fg));
  out.siblings = { checked: pairs.length, failed: sibFails.length, worst: pairs.length ? Math.min(...pairs.map((x) => x.cr)) : null };
  for (const f of sibFails) bad('pair', `${f.fg} on ${f.bg} at ${f.cr.toFixed(2)}`);

  const R = ['keyword', 'func', 'string', 'type', 'number', 'tag'];
  const sel = c['editor.selectionBackground'];
  if (!hc) for (const r of R) {
    const cr = contrast(p[r], over(sel, eb));
    if (cr < 3.0) bad('layers', `${r} on editor.selectionBackground at ${down(cr)}, under 3.0`);
  }
  // VS Code paints the selection under its decorations and never the current line on a selection; find matches keep their own text colour,
  // but high contrast writes all selected text in selectionForeground
  const selFg = c['editor.selectionForeground'];
  const comments = [...new Set(t.tokenColors.filter((r) => r.settings.foreground && [].concat(r.scope).some((s) => /^comment/.test(String(s).trim()))).map((r) => r.settings.foreground))];
  const onSel = hc && selFg && parse(selFg).a === 1 ? [selFg] : [...R.map((r) => p[r]), ...comments];
  const selFloor = hc ? 4.5 : 3.0, floorNote = hc ? '4.5 in high contrast' : '3.0';
  const worstOver = (layers, texts) => { const g = layers.reduce((u, k) => over(c[k], u), eb); return Math.min(...texts.map((x) => contrast(over(x, g), g))); };
  if (!hc) for (const x of comments) {
    const cr = contrast(x, over(sel, eb));
    if (cr < 3.0) bad('layers', `comments (${x}) on editor.selectionBackground at ${down(cr)}, under 3.0`);
  }
  let stackWorst = 99, stackAt = '';
  for (const k of ['wordHighlightBackground', 'wordHighlightStrongBackground', 'wordHighlightTextBackground', 'snippetTabstopHighlightBackground']) {
    const cr = worstOver(['editor.selectionBackground', `editor.${k}`], onSel);
    if (cr < stackWorst) { stackWorst = cr; stackAt = `syntax over the selection plus ${k}`; }
  }
  out.stacked = { worst: stackWorst, at: stackAt };
  if (stackWorst < selFloor) bad('layers', `${stackAt} at ${down(stackWorst)}, under ${floorNote}`);
  const hoverSel = Math.min(...['', 'editor.wordHighlightBackground', 'editor.wordHighlightStrongBackground'].map((k) => worstOver(['editor.selectionBackground', 'editor.hoverHighlightBackground', k].filter(Boolean), onSel)));
  if (hoverSel < selFloor) bad('layers', `syntax over the selection plus the hover highlight at ${down(hoverSel)}, under ${floorNote}`);
  // a hovered word also lies on the current line, a range highlight and the diff washes, and the hover may not take it under what that wash leaves
  if (!hc) for (const layers of [['editor.inactiveSelectionBackground'], ['editor.lineHighlightBackground'], ['editor.rangeHighlightBackground'],
    ...['inserted', 'removed'].flatMap((d) => [[`diffEditor.${d}LineBackground`], [`diffEditor.${d}LineBackground`, `diffEditor.${d}TextBackground`]])]) {
    const floor = Math.min(3.0, worstOver(layers, onSel)), cr = worstOver([...layers, 'editor.hoverHighlightBackground'], onSel);
    if (cr < floor - 0.005) bad('layers', `syntax under the hover highlight on ${layers.join(' plus ')} at ${down(cr)}, under ${floor.toFixed(2)}`);
  }
  // VS Code paints find matches above the hover highlight (their decorations carry zIndex 10 and 13, the hover none)
  if (!hc && findTextsOf(c).length) for (const [under, match] of [[[], 'editor.findMatchHighlightBackground'], [[], 'editor.findMatchBackground'], [['editor.selectionBackground'], 'editor.findMatchHighlightBackground']]) {
    const cr = worstOver([...under, 'editor.hoverHighlightBackground', match], findTextsOf(c));
    if (cr < 4.5) bad('layers', `a find match over the hover highlight on ${[...under, match].join(' plus ')} at ${down(cr)}, under 4.5`);
  }
  const diffSel = Math.min(...['inserted', 'removed'].map((d) => worstOver(['editor.selectionBackground', `diffEditor.${d}LineBackground`, `diffEditor.${d}TextBackground`], onSel)));
  pend(`syntax over the selection in a diff (${floorNote})`, diffSel, selFloor);
  // the details of the action widget at 80% and the permissions of an agent host at 85%, on the menu, solid or as glass over the theme
  // and its text, and the summary of those permissions beside the chat pickers, plain, hovered or pressed
  if (!hc) {
    const menu = over(c['menu.background'], eb), unders = [menu, ...UNDER_GLASS.map((u) => mix(over(c[u], eb), menu, 0.5)),
      ...Object.entries(TEXT_UNDER_GLASS).map(([u, text]) => mix(withText(c, over(c[u], eb), text), menu, 0.5)), ...Object.values(washesUnderGlass(c)).map((w) => mix(w, menu, 0.8))];
    const at = (k, share, grounds, wash) => Math.min(...grounds.map((g) => { const ground = wash ? over(c[wash], g) : g; return contrast(mix(ground, c[k], share), ground); }));
    pend('a detail of the action widget, the description at 80% (4.0)', at('descriptionForeground', 0.8, unders), 4.0);
    for (const k of ['descriptionForeground', 'problemsWarningIcon.foreground', 'problemsInfoIcon.foreground'])
      pend(`${k}, a permission of an agent host at 85% on the menu, on its row and focused (4.0)`, Math.min(at(k, 0.85, unders), at(k, 0.85, unders, 'list.hoverBackground')), 4.0);
    const pickers = ['sideBar.background', 'panel.background', 'editor.background'].flatMap((s) => { const pane = over(c[s], eb), input = over(c['input.background'], pane);
      return [pane, input].flatMap((g) => [g, over(c['toolbar.hoverBackground'], g), over(c['toolbar.activeBackground'], g)]); });
    for (const k of ['descriptionForeground', 'problemsWarningIcon.foreground', 'problemsInfoIcon.foreground'])
      pend(`${k}, the summary of an agent host's permissions at 85% beside the chat pickers (4.0)`, at(k, 0.85, pickers), 4.0);
    pend('the arrow of a submenu in the chat model picker, the description at 60% on a hovered row (3.0)', at('descriptionForeground', 0.6, unders, 'list.hoverBackground'), 3.0);
  }
  // what VS Code itself writes at part strength, high contrast aside: the line badge of the call stack at 60%, the empty message of the
  // outline at 50%, the name on an inactive pill tab at 50% of the text, a description on an inactive tab, and a terminal icon a user colours
  // black or white
  if (!hc) {
    const sb = c['sideBar.background'], pane = over(c['panel.background'], eb), light = t.type === 'light';
    const badge = over(alpha(c['badge.background'], 0.6), sb), pill = over(c['modernEditorTab.inactiveBackground'], eb), tabs = over(c['editorGroupHeader.connectedTabsBackground'], eb);
    pend('the line badge of the call stack, at 60% (4.5)', contrast(over(alpha(c['badge.foreground'], 0.6), badge), badge), 4.5);
    pend('the empty message of the outline, at 50% (4.5)', contrast(mix(sb, c['sideBar.foreground'], 0.5), sb), 4.5);
    pend('the name on an inactive pill tab, the text at 50% (4.5)', contrast(mix(pill, c.foreground, 0.5), pill), 4.5);
    pend(`a description on an inactive tab, at ${light ? 95 : 70}% (4.0)`, contrast(mix(tabs, c['tab.inactiveForeground'], light ? 0.95 : 0.7), tabs), 4.0);
    pend('a terminal icon coloured black or white (3.0)', Math.min(...['terminal.ansiBlack', 'terminal.ansiWhite'].map((k) => contrast(c[k], pane))), 3.0);
  }
  const findTexts = hc && selFg && parse(selFg).a === 1 ? [selFg] : ['editor.findMatchForeground', 'editor.findMatchHighlightForeground'].map((k) => c[k]).filter(Boolean);
  if (findTexts.length) {
    const findSel = Math.min(...[['editor.inactiveSelectionBackground', 'editor.findMatchHighlightBackground'], ['editor.inactiveSelectionBackground', 'editor.rangeHighlightBackground', 'editor.findMatchBackground'],
      ['editor.selectionBackground', 'editor.findMatchHighlightBackground']].map((l) => worstOver(l, findTexts)));
    if (findSel < 4.5) bad('layers', `find matches written over the selection at ${down(findSel)}, under 4.5`);
  }

  const tb = c['terminal.background'];
  const tsel = over(c['terminal.selectionBackground'], tb);
  let ansiWorst = 99, ansiWorstK = '', ansiSelWorst = 99, ansiSelK = '';
  for (const n of ANSI) for (const pre of ['terminal.ansi', 'terminal.ansiBright']) {
    const k = pre + n, val = c[k];
    const lightTheme = t.type === 'light' || t.type === 'hcLight';
    const skip = n === 'Black' || (n === 'White' && lightTheme);
    if (!skip) {
      const cr = contrast(val, tb);
      if (cr < ansiWorst) { ansiWorst = cr; ansiWorstK = k; }
      if (cr < 3.0) bad('terminal', `${k} at ${cr.toFixed(2)} on the terminal background`);
    }
    const crs = contrast(val, tsel);
    if (!skip && crs < ansiSelWorst) { ansiSelWorst = crs; ansiSelK = k; }
    if (!skip && crs < 2.2) bad('terminal', `${k} at ${crs.toFixed(2)} over the terminal selection`);
  }
  out.terminal = { worst: ansiWorst, worstKey: ansiWorstK, onSelection: ansiSelWorst, onSelectionKey: ansiSelK };

  const git = GIT.filter((k) => c[k]);
  const sb = c['sideBar.background'];
  let gitMin = 999, gitPair = '', gitCr = 99, gitCrK = '';
  for (let i = 0; i < git.length; i++) {
    const cr = contrast(over(c[git[i]], sb), sb);
    if (cr < gitCr) { gitCr = cr; gitCrK = git[i]; }
    for (let j = i + 1; j < git.length; j++) {
      const label = `${git[i].slice(14, -18)}/${git[j].slice(14, -18)}`;
      const twin = GIT_TWINS.includes(label) || GIT_TWINS.includes(label.split('/').reverse().join('/'));
      const d = deltaE(c[git[i]], c[git[j]]);
      if (!twin && d < gitMin) { gitMin = d; gitPair = label; }
    }
  }
  out.git = { count: git.length, minDeltaE: gitMin, pair: gitPair, worstContrast: gitCr, worstKey: gitCrK };
  if (gitMin < 6) bad('git', `${gitPair} at ${gitMin.toFixed(1)} dE`);
  if (gitCr < 3.5 && !DIM_OK.test(gitCrK)) bad('git', `${gitCrK} at ${gitCr.toFixed(2)} on the side bar`);

  const br = [1, 2, 3].map((i) => c[`editorBracketHighlight.foreground${i}`]);
  let brMin = 999, brPair = '', brCr = 99;
  for (let i = 0; i < 3; i++) {
    brCr = Math.min(brCr, contrast(br[i], eb));
    for (let j = i + 1; j < 3; j++) {
      const d = deltaE(br[i], br[j]);
      if (d < brMin) { brMin = d; brPair = `${i + 1}/${j + 1}`; }
    }
  }
  out.brackets = { minDeltaE: brMin, pair: brPair, worstContrast: brCr };
  if (brCr < 3.0) bad('brackets', `weakest level at ${brCr.toFixed(2)}`);
  if (brMin < 5) bad('brackets', `levels ${brPair} at ${brMin.toFixed(1)} dE`);

  const mmBg = over(c['minimap.background'] || eb, eb);
  const MM = ['minimap.findMatchHighlight', 'minimap.selectionHighlight', 'minimap.errorHighlight',
    'minimap.warningHighlight', 'minimap.infoHighlight', 'minimapGutter.addedBackground',
    'minimapGutter.modifiedBackground', 'minimapGutter.deletedBackground'];
  let mmWorst = 99, mmKey = '';
  for (const k of MM) {
    if (!c[k]) continue;
    const cr = contrast(over(c[k], mmBg), mmBg);
    if (cr < mmWorst) { mmWorst = cr; mmKey = k; }
    if (cr < 1.5) bad('minimap', `${k} at ${cr.toFixed(2)}, invisible`);
  }
  out.minimap = { worst: mmWorst, worstKey: mmKey };

  const insLine = over(c['diffEditor.insertedLineBackground'], eb);
  const delLine = over(c['diffEditor.removedLineBackground'], eb);
  const ins = over(c['diffEditor.insertedTextBackground'], insLine);
  const del = over(c['diffEditor.removedTextBackground'], delLine);
  const diffGrounds = [insLine, delLine, ins, del];
  const diffSyntax = ['keyword', 'func', 'string', 'type', 'number', 'tag'];
  const diffText = Math.min(...diffGrounds.flatMap((g) => diffSyntax.map((r) => contrast(p[r], g))));
  const diffComment = p.comment ? Math.min(...diffGrounds.map((g) => contrast(p.comment, g))) : 99;
  const diffMark = Math.min(deltaE(ins, insLine), deltaE(del, delLine));
  const curContent = over(c['merge.currentContentBackground'], eb);
  const incContent = over(c['merge.incomingContentBackground'], eb);
  const curHeader = over(c['merge.currentHeaderBackground'], eb);
  const incHeader = over(c['merge.incomingHeaderBackground'], eb);
  // a diff3 conflict adds the common ancestor block between them
  const mergeGrounds = [curContent, incContent, curHeader, incHeader, ...['merge.commonContentBackground', 'merge.commonHeaderBackground'].map((k) => over(c[k], eb))];
  const mergeText = Math.min(...mergeGrounds.flatMap((g) => diffSyntax.concat('comment').map((r) => contrast(p[r], g))));
  const mergeSplit = deltaE(curContent, incContent);
  const mergePresence = Math.min(deltaE(curContent, eb), deltaE(incContent, eb));
  out.merge = { split: mergeSplit, presence: mergePresence, text: mergeText };
  if (mergeText < 3.0) bad('conflict', `text at ${down(mergeText)} over the conflict blocks, under 3.0`);
  if (mergePresence < 3) bad('conflict', `the blocks do not show on the background, ${mergePresence.toFixed(1)} dE`);
  if (mergeSplit < 8) bad('conflict', `current and incoming at ${down(mergeSplit)} dE, under 8`);

  out.diff = { deltaE: deltaE(insLine, delLine), text: diffText, comment: diffComment, mark: diffMark };
  // Void marks an edited line with these washes alone, so they tell added from removed and keep the code as a diff does
  const voidWashes = [over(c['void.greenBG'], eb), over(c['void.redBG'], eb)];
  if (deltaE(...voidWashes) < 8) bad('diff', `void.greenBG and void.redBG at ${deltaE(...voidWashes).toFixed(1)} dE, under 8`);
  const voidText = Math.min(...voidWashes.flatMap((g) => diffSyntax.map((r) => contrast(p[r], g))));
  const voidComment = p.comment ? Math.min(...voidWashes.map((g) => contrast(p.comment, g))) : 99;
  if (voidText < 3.4 || voidComment < 3.2) bad('diff', `syntax at ${down(voidText)} and comments at ${down(voidComment)} on the Void washes, under 3.4 and 3.2`);
  if (out.diff.deltaE < 2.5) bad('diff', `inserted and removed at ${out.diff.deltaE.toFixed(1)} dE`);
  if (diffText < 3.4) bad('diff', `syntax on a diff background at ${down(diffText)}, under 3.4`);
  if (diffComment < 3.2) bad('diff', `comments on a diff background at ${down(diffComment)}, under 3.2`);
  if (diffMark < 2) bad('diff', `the changed word at ${diffMark.toFixed(1)} dE from the line`);

  const sim = (fn) => {
    let m = 999, pair = '';
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
      const d = deltaE(fn(p[R[i]]), fn(p[R[j]]));
      if (d < m) { m = d; pair = `${R[i]}/${R[j]}`; }
    }
    return { min: m, pair };
  };
  out.cvd = { deuter: sim(deuter), protan: sim(protan) };

  let ovWorst = 99, ovKey = '';
  for (const o of OVERLAYS) {
    const g = over(c[o], eb);
    for (const r of R.concat(['comment'])) {
      const cr = contrast(p[r], g);
      if (cr < ovWorst) { ovWorst = cr; ovKey = `${r}/${o.split('.').pop()}`; }
    }
  }
  out.overlay = { worst: ovWorst, at: ovKey };

  const rules = t.tokenColors.filter((r) => r.settings.foreground);
  let tmWorst = 99, tmKey = '';
  for (const r of rules) {
    const cr = contrast(over(r.settings.foreground, eb), eb);
    if (cr < tmWorst) { tmWorst = cr; tmKey = r.name; }
    const floor = syntaxFloor(r);
    if (cr < floor) bad('textmate', `${r.name} at ${cr.toFixed(2)}, under ${floor}`);
  }
  out.textmate = { rules: rules.length, worst: tmWorst, worstKey: tmKey };
  const logRule = (scope) => rules.filter((r) => [].concat(r.scope).includes(scope)).pop();
  const [logError, logWarning] = [logRule('log.error'), logRule('log.warning')];
  if (!logError || !logWarning) bad('textmate', 'log files get no colour for errors or warnings');
  else if (deltaE(logError.settings.foreground, logWarning.settings.foreground) < 12) bad('textmate', `log errors and warnings ${down(deltaE(logError.settings.foreground, logWarning.settings.foreground))} dE apart, under 12`);

  const syntaxCr = R.map((r) => contrast(p[r], p.bg));
  out.syntax = { min: Math.min(...syntaxCr), mean: syntaxCr.reduce((a, b) => a + b) / 6 };
  let sMin = 999;
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) sMin = Math.min(sMin, deltaE(p[R[i]], p[R[j]]));
  out.syntax.separation = sMin;

  if (!p.status) {
    const status = { error: c['editorError.foreground'], warn: c['editorWarning.foreground'],
      ok: c['gitDecoration.addedResourceForeground'], info: c['editorInfo.foreground'] };
    for (const [role, target] of Object.entries(STATUS_HUE)) {
      const [, chroma, hue] = hex2lch(status[role]);
      if (chroma < 12) bad('status', `${role} (${status[role]}) is nearly grey, chroma ${chroma.toFixed(0)}`);
      else if (hueDist(hue, target) > 45) bad('status', `${role} (${status[role]}) is ${hueDist(hue, target).toFixed(0)} degrees from the expected hue`);
    }
  }
  for (const [name, target] of Object.entries(ANSI_HUE)) {
    if (ANSI_EXEMPT.some((e) => e.family === fam.id && e.slot === name)) continue;
    const val = c['terminal.ansi' + name];
    const [, chroma, hue] = hex2lch(val);
    if (chroma < 10) bad('terminal', `ansi${name} (${val}) is nearly grey, chroma ${chroma.toFixed(0)}`);
    else if (hueDist(hue, target) > 50) bad('terminal', `ansi${name} (${val}) is ${hueDist(hue, target).toFixed(0)} degrees from ${name.toLowerCase()}`);
  }
  for (const s of ['sideBar.background', 'editorWidget.background', 'panel.background', 'quickInput.background']) {
    const ground = over(c['list.activeSelectionBackground'], over(c[s], eb));
    const cr = contrast(over(c['list.focusAndSelectionOutline'], ground), ground);
    if (cr < 3) bad('focus', `list.focusAndSelectionOutline on the selection over ${s} at ${cr.toFixed(2)}, under 3:1`);
  }
  const sideBar = c['sideBar.background'];
  const dotted = contrast(over(c['list.inactiveFocusOutline'], sideBar), sideBar);
  if (dotted < 3) bad('focus', `list.inactiveFocusOutline on sideBar.background at ${down(dotted)}, under 3:1`);
  for (const k of ['focusBorder', 'list.focusOutline']) for (const s of WASH_SURFACES) {
    const ground = isAlpha(c[s]) ? over(c[s], eb) : c[s];
    const cr = contrast(over(c[k], ground), ground);
    if (cr < 3) bad('focus', `${k} on ${s} at ${cr.toFixed(2)}, under 3:1`);
  }
  for (const k of SESSION_FRAMES) for (const s of FOCUS_SURFACES) {
    const ground = isAlpha(c[s]) ? over(c[s], eb) : c[s];
    const cr = contrast(over(c[k], ground), ground);
    if (cr < 3) bad('frame', `${k} on ${s} at ${cr.toFixed(2)}, under 3:1`);
  }
  // word and snippet highlights are outlines, so it is the 1px line that has to stand out, on the editor and on the selection
  if (!hc) for (const k of ['editor.wordHighlightBorder', 'editor.wordHighlightStrongBorder', 'editor.wordHighlightTextBorder', 'editor.snippetTabstopHighlightBorder'])
    for (const g of [eb, over(sel, eb)]) if (deltaE(over(c[k], g), g) < 10) bad('presence', `${k} at ${deltaE(over(c[k], g), g).toFixed(2)} dE from ${g === eb ? 'editor.background' : 'the selection'}, under 10`);
  if (!hc) for (const [k, groundKey, min] of PRESENCE) {
    if (PRESENCE_EXEMPT.some((e) => e.family === fam.id && e.variant === v && e.key === k)) continue;
    const ground = isAlpha(c[groundKey]) ? over(c[groundKey], eb) : c[groundKey];
    const d = deltaE(over(c[k], ground), ground);
    if (d < min) bad('presence', `${k} at ${d.toFixed(2)} dE from ${groundKey}, under ${min}`);
  }
  for (const [fgKey, washKey, floor] of WASH_PAIRS) for (const s of WASH_SURFACES) {
    const surface = isAlpha(c[s]) ? over(c[s], eb) : c[s];
    const ground = over(c[washKey], surface);
    const cr = contrast(over(c[fgKey], ground), ground);
    if (cr < floor) bad('pair', `${fgKey} on ${washKey} over ${s} at ${cr.toFixed(2)}, under ${floor}`);
  }
  for (const [k, floor] of ON_ANY_SURFACE) for (const s of TEXT_SURFACES) {
    if (!c[k] || !c[s]) { bad('surface', `${c[k] ? s : k} is not set`); continue; }
    const ground = over(c[s], eb);
    const cr = contrast(over(c[k], ground), ground);
    if (cr < floor) bad('surface', `${k} on ${s} at ${cr.toFixed(2)}, under ${floor}`);
  }
  for (const [k, grounds] of ON_ITS_SURFACE) for (const g of grounds) {
    const ground = over(c[g], eb);
    const cr = contrast(over(c[k], ground), ground);
    if (cr < 4.5) bad('surface', `${k} on ${g} at ${down(cr)}, under 4.5`);
  }
  for (const k of DECORATED_NAMES) {
    const cr = contrast(over(c[k], c['sideBar.background']), c['sideBar.background']);
    if (cr < 4.5) bad('surface', `${k}, a decorated file name in the side bar, at ${cr.toFixed(2)}, under 4.5`);
    const apart = deltaE(c[k], c['sideBar.foreground']);
    if (apart < 10) bad('surface', `${k}, a decorated file name, at ${apart.toFixed(1)} dE from the plain names, under 10`);
    for (const row of ['list.hoverBackground', 'list.inactiveSelectionBackground', 'list.focusBackground', 'list.inactiveFocusBackground']) {
      const ground = over(c[row], c['sideBar.background']);
      const cr = contrast(over(c[k], ground), ground);
      if (cr < 4.5) bad('surface', `${k}, a decorated file name on ${row}, at ${down(cr)}, under 4.5`);
    }
    // its letter (M, U, a problem count) is drawn beside the name at 75%, and it is the only status mark of the source control view
    const tabStrip = over(c['editorGroupHeader.tabsBackground'], eb);
    const letterGrounds = { 'the side bar': c['sideBar.background'], ...Object.fromEntries(['list.hoverBackground', 'list.inactiveSelectionBackground', 'list.focusBackground', 'list.inactiveFocusBackground'].map((r) => [r, over(c[r], c['sideBar.background'])])),
      ...(k === 'list.invalidItemForeground' ? {} : { 'the tab strip': tabStrip, ...Object.fromEntries(CLASSIC_TAB_HOVERS.map((h) => [h, over(c[h], tabStrip)])), ...(hc ? {} : { 'a hovered tab': mix(tabStrip, c.foreground, 0.06) }) }) };
    for (const [where, ground] of Object.entries(letterGrounds)) {
      const cr = contrast(mix(ground, over(c[k], ground), 0.75), ground);
      if (cr < 3.0) bad('surface', `${k}, the letter of a decoration at 75% on ${where}, at ${down(cr)}, under 3.0`);
    }
    if (k === 'list.invalidItemForeground') continue;
    const strip = c['editorGroupHeader.tabsBackground'];
    const onTab = contrast(over(c[k], strip), strip);
    if (onTab < 4.5) bad('surface', `${k}, a decorated name on a tab, at ${down(onTab)}, under 4.5`);
    for (const h of CLASSIC_TAB_HOVERS) {
      const ground = over(c[h], over(strip, eb));
      const cr = contrast(over(c[k], ground), ground);
      if (cr < 4.5) bad('surface', `${k}, a decorated name on ${h}, at ${down(cr)}, under 4.5`);
    }
    // VS Code 1.140 paints a hovered connected tab as color-mix(foreground 6%, strip); high contrast gives it no fill
    if (hc) continue;
    const hovered = mix(over(strip, eb), c.foreground, 0.06);
    const onHovered = contrast(over(c[k], hovered), hovered);
    if (onHovered < 4.5) bad('surface', `${k}, a decorated name on a hovered tab, at ${down(onHovered)}, under 4.5`);
  }
  for (const g of LINE_NUMBER_GROUNDS) {
    const floor = hc ? 4.5 : 3.0;
    const cr = contrast(over(c['editorLineNumber.foreground'], c[g]), c[g]);
    if (cr < floor) bad('surface', `editorLineNumber.foreground on ${g} at ${cr.toFixed(2)}, under ${floor}`);
  }
  for (const g of ACTIVE_LINE_NUMBER_GROUNDS) {
    const ground = over(c[g] || eb, eb);
    const cr = contrast(over(c['editorLineNumber.activeForeground'], ground), ground);
    if (cr < 4.5) bad('surface', `editorLineNumber.activeForeground on ${g} at ${cr.toFixed(2)}, under 4.5`);
  }
  for (const k of ['diffEditorGutter.insertedLineBackground', 'diffEditorGutter.removedLineBackground']) {
    const ground = over(c[k], eb);
    const floor = hc ? 4.5 : 3.0;
    const cr = contrast(over(c['editorLineNumber.foreground'], ground), ground);
    if (cr < floor) bad('surface', `editorLineNumber.foreground on ${k} at ${down(cr)}, under ${floor}`);
    const act = contrast(over(c['editorLineNumber.activeForeground'], ground), ground);
    if (act < 4.5) bad('surface', `editorLineNumber.activeForeground on ${k} at ${down(act)}, under 4.5`);
  }
  const cell = over(c['notebook.cellEditorBackground'] || eb, eb);
  const inCell = contrast(over(c['editorLineNumber.foreground'], cell), cell);
  if (inCell < (hc ? 4.5 : 3.0)) bad('surface', `editorLineNumber.foreground on notebook.cellEditorBackground at ${down(inCell)}, under ${hc ? 4.5 : 3.0}`);
  for (let i = 1; i <= 6; i++) for (const k of [`editorBracketPairGuide.background${i}`, `editorBracketPairGuide.activeBackground${i}`])
    if (c[k].slice(0, 7).toLowerCase() !== c[`editorBracketHighlight.foreground${i}`].slice(0, 7).toLowerCase()) bad('brackets', `${k} is not the colour of the brackets it joins`);
  const sticky = over(c['editorStickyScroll.background'], eb);
  for (const r of rules) {
    const cr = contrast(over(r.settings.foreground, sticky), sticky);
    if (cr < syntaxFloor(r)) bad('surface', `${r.name} on editorStickyScroll.background at ${down(cr)}, under ${syntaxFloor(r)}`);
    const hover = over(c['editorStickyScrollHover.background'], sticky);
    const onHover = contrast(over(r.settings.foreground, hover), hover);
    if (onHover < syntaxFloor(r)) bad('surface', `${r.name} on editorStickyScrollHover.background at ${down(onHover)}, under ${syntaxFloor(r)}`);
  }
  if (hc) for (const [k, g, under] of HC_QUIET) {
    const ground = over(c[g], under ? c[under] : eb);
    const cr = contrast(over(c[k], ground), ground);
    if (cr < 4.5) bad('surface', `${k} on ${g} at ${down(cr)}, under 4.5 in high contrast`);
  }
  if (hc) for (const [k, g, floor] of HC_LINES) {
    const cr = contrast(over(c[k], c[g]), c[g]);
    if (cr < floor) bad('surface', `${k} on ${g} at ${down(cr)}, under ${floor} in high contrast`);
  }
  if (!hc) for (const [s, texts] of Object.entries(GLASS)) for (const [k, floor, wash, share] of texts) {
    const shown = (ground) => (share ? mix(ground, c[k], share) : over(c[k], ground));
    for (const u of UNDER_GLASS) for (const text of [null, TEXT_UNDER_GLASS[u]]) {
      if (text === undefined) continue;
      const under = text ? withText(c, over(c[u], eb), text) : over(c[u], eb);
      const glass = mix(under, over(c[s], eb), 0.5), ground = typeof wash === 'function' ? wash(c, glass) : wash ? over(c[wash], glass) : glass;
      const cr = contrast(shown(ground), ground);
      if (cr < floor) bad('glass', `${k}${share ? ` at ${share * 100}%` : ''}${typeof wash === 'string' ? ` on ${wash}` : wash ? ' on a tint' : ''} on ${s} as glass at half over ${u}${text ? ' and its text' : ''}, at ${down(cr)}, under ${floor}`);
    }
    for (const [w, plain] of Object.entries(washesUnderGlass(c))) for (const under of [plain, withText(c, plain, /^terminal/.test(w) ? 'terminal.foreground' : /^(chat|list)\./.test(w) ? 'sideBar.foreground' : 'editor.foreground')]) {
      const glass = mix(under, over(c[s], eb), 0.8), ground = typeof wash === 'function' ? wash(c, glass) : wash ? over(c[wash], glass) : glass;
      const cr = contrast(shown(ground), ground);
      if (cr < floor) bad('glass', `${k}${share ? ` at ${share * 100}%` : ''}${typeof wash === 'string' ? ` on ${wash}` : wash ? ' on a tint' : ''} on ${s} as glass at 80% over ${w}${under === plain ? '' : ' and its text'}, at ${down(cr)}, under ${floor}`);
    }
    // over content the theme does not paint, a white page under a dark theme or a black image under a light one, at the default 80%
    const glass = mix(t.type === 'light' ? '#000000' : '#ffffff', over(c[s], eb), 0.8), ground = typeof wash === 'function' ? wash(c, glass) : wash ? over(c[wash], glass) : glass;
    pend(`text on the frosted glass of Insiders over white or black content, at the default 80% (${floor.toFixed(1)})`, contrast(shown(ground), ground), floor);
  }
  // VS Code 1.140 writes the workspace name in the command center at 60%, a placeholder of its search, on the title bar, or with
  // the modern UI off on the wash of its input, plain or hovered
  for (const [k, wash] of [['commandCenter.foreground', 'agentStatusIndicator.background'], ['commandCenter.activeForeground', 'commandCenter.activeBackground']]) {
    const tb = over(c['titleBar.activeBackground'], eb), floor = hc ? 4.5 : 3.2;
    for (const g of [tb, over(c[wash], tb)]) {
      const cr = contrast(mix(g, c[k], 0.6), g);
      if (cr < floor) bad('surface', `${k}, the workspace name in the command center at 60%${g === tb ? '' : ` on ${wash}`}, at ${down(cr)}, under ${floor}`);
    }
  }
  for (const { fg, share, grounds, floor, what } of COMPOSED) for (const ground of grounds(c)) {
    // a share is an opacity VS Code applies to the element, drawn as the exact blend with what lies under it
    const shown = share ? mix(ground, fg(c, t.type === 'light'), share) : over(fg(c, t.type === 'light'), ground);
    const cr = contrast(shown, ground);
    if (cr < floor) bad('surface', `${what} at ${cr.toFixed(2)}, under ${floor}`);
  }
  if (!hc) {
    const strip = over(c['editorGroupHeader.connectedTabsBackground'] ?? c['editorGroupHeader.tabsBackground'], eb);
    const sep = deltaE(strip, eb);
    if (sep < TAB_STRIP_DE) bad('tabs', `the tab strip at ${sep.toFixed(2)} dE from the editor, under ${TAB_STRIP_DE}`);
    const texts = [
      ['modernEditorTab.activeForeground', eb, 4.5, 'the active tab'],
      ['tab.inactiveForeground', strip, 4.5, 'an inactive tab'],
      ['modernEditorTab.hoverForeground', mix(strip, over(c.foreground, strip), 0.06), 4.5, 'a hovered connected tab'],
      ['modernEditorTab.hoverForeground', over(c['modernEditorTab.hoverBackground'], strip), 4.5, 'a hovered tab'],
      ['icon.foreground', strip, 3.0, 'the editor actions on the strip'],
      ['modernEditorTab.activeForeground', over(c['modernEditorTab.activeBackground'], eb), 4.5, 'the active pill'],
    ];
    out.tabTexts = texts.length;
    for (const [k, ground, floor, what] of texts) {
      const cr = contrast(over(c[k], ground), ground);
      if (cr < floor) bad('tabs', `${k} on ${what} at ${cr.toFixed(2)}, under ${floor}`);
    }
    for (const [item, s] of [['modernTab', 'editor.background'], ['modernTab', 'menu.background'], ['modernActivityBarItem', 'modernActivityBar.background']]) {
      const d = deltaE(over(c[`${item}.activeBackground`], c[s]), over(c[`${item}.hoverBackground`], c[s]));
      if (d < 1.5) bad('tabs', `an active ${item} at ${d.toFixed(2)} dE from a hovered one on ${s}, under 1.5`);
    }
  }
  if (hc) for (const [a, b] of [['editorError.border', 'editorWarning.border'], ['editorError.border', 'editorInfo.border'], ['editorWarning.border', 'editorInfo.border'], ['diffEditor.insertedTextBorder', 'diffEditor.removedTextBorder']]) {
    const d = deltaE(c[a], c[b]);
    if (d < 12) bad('status', `${a} and ${b} at ${d.toFixed(1)} dE, the meaning is lost`);
  }
  if (hc) for (const k of ['list.focusOutline', 'list.focusAndSelectionOutline', 'listFilterWidget.outline', 'editorSuggestWidget.focusOutline', 'toolbar.hoverOutline'])
    if (c[k]?.toLowerCase() !== c.focusBorder.toLowerCase()) bad('focus', `${k} = ${c[k]}, while high contrast marks focus with ${c.focusBorder}`);
  if (hc) for (const [k, v] of Object.entries(c))
    if (/(inactive|Inactive|unfocused|Unfocused).*(\.border|Border)$/.test(k) && k !== 'notebook.inactiveSelectedCellBorder' && v.toLowerCase() === c.focusBorder.toLowerCase())
      bad('focus', `${k}, an inactive or unfocused border, carries the focus colour ${v}`);
  for (const k of COMMENT_GLYPHS) {
    const strip = c['editorGutter.commentRangeForeground'];
    const cr = contrast(over(c[k], strip), strip);
    if (cr < 4.5) bad('pair', `${k} on editorGutter.commentRangeForeground at ${cr.toFixed(2)}`);
  }
  const palette = [...R.map((r) => p[r]), p.accent, ...(p.status ? Object.values(p.status) : []), ...Object.values(p.ansi), ...(p.depth || [])]
    .filter(Boolean);
  const hues = palette.filter((x) => hex2lch(x)[1] > 12).map((x) => hex2lch(x)[2]);
  for (const [k, val] of Object.entries(c)) {
    if (isAlpha(val) || hex2lch(val)[1] <= 18) continue;
    const near = Math.min(...hues.map((h) => hueDist(h, hex2lch(val)[2])));
    if (near > 30) bad('foreign', `${k} = ${val} is ${near.toFixed(0)} degrees from every hue in the palette`);
  }

  const opaque = Object.entries(c).filter(([, val]) => !isAlpha(val));
  const seen = new Map();
  for (const [k, val] of opaque) { const key = val.toLowerCase(); seen.set(key, (seen.get(key) || 0) + 1); }
  out.distinctOpaque = seen.size;

  return out;
}

const rows = [];
for (const fam of FAMILIES) for (const v of VARIANT_KEYS(fam)) rows.push(analyse(fam, v));

const detail = process.argv.includes('--detail');
console.log('DEEP AUDIT, every theme on its own\n');
console.log('theme'.padEnd(38) + 'syntax'.padStart(6) + 'sep'.padStart(7) + 'TextMate'.padStart(10) + 'semantic'.padStart(10) + 'overlay'.padStart(10) + 'stacked'.padStart(9) + 'ANSI'.padStart(6) + 'ANSI/sel'.padStart(10) + 'git dE'.padStart(8) + 'brackets'.padStart(11) + 'diff dE'.padStart(9) + 'minimap'.padStart(9) + 'cvd'.padStart(11) + 'issues'.padStart(10));
console.log('-'.repeat(160));
let issues = 0;
for (const r of rows) {
  issues += r.findings.length;
  console.log(
    r.label.padEnd(39) +
    `${r.syntax.min.toFixed(2)}`.padStart(5) + `${r.syntax.separation.toFixed(1)}`.padStart(7) +
    `${r.textmate.worst.toFixed(2)}`.padStart(10) + `${r.semantic.worst.toFixed(2)}`.padStart(10) +
    `${r.overlay.worst.toFixed(2)}`.padStart(10) + `${r.stacked.worst.toFixed(2)}`.padStart(9) +
    `${r.terminal.worst.toFixed(2)}`.padStart(6) + `${r.terminal.onSelection.toFixed(2)}`.padStart(10) +
    `${r.git.minDeltaE.toFixed(1)}`.padStart(8) + `${r.brackets.minDeltaE.toFixed(1)}`.padStart(11) +
    `${r.diff.deltaE.toFixed(1)}`.padStart(9) + `${r.minimap.worst.toFixed(2)}`.padStart(9) +
    `${Math.min(r.cvd.deuter.min, r.cvd.protan.min).toFixed(1)}`.padStart(11) +
    `${r.findings.length || ''}`.padStart(10));
}
console.log('-'.repeat(160));
const agg = (fn) => Math.min(...rows.map(fn));
console.log(`minimums across the package: syntax ${agg((r) => r.syntax.min).toFixed(2)}, separation ${agg((r) => r.syntax.separation).toFixed(1)}, TextMate ${agg((r) => r.textmate.worst).toFixed(2)}, semantic ${agg((r) => r.semantic.worst).toFixed(2)}, overlay ${agg((r) => r.overlay.worst).toFixed(2)}, stacked ${agg((r) => r.stacked.worst).toFixed(2)}, ANSI ${agg((r) => r.terminal.worst).toFixed(2)}, git ${agg((r) => r.git.minDeltaE).toFixed(1)}, brackets ${agg((r) => r.brackets.minDeltaE).toFixed(1)}, diff ${agg((r) => r.diff.deltaE).toFixed(1)}`);
console.log(`sibling pairs checked per theme: ${rows[0].siblings.checked}, TextMate rules ${rows[0].textmate.rules}, semantic selectors ${rows[0].semantic.count}`);
console.log(`on every text surface: ${ON_ANY_SURFACE.length} colours on ${TEXT_SURFACES.length} surfaces, ${COMPOSED.length} composed surfaces, ${DECORATED_NAMES.length} decorated file names on the side bar, line numbers on ${LINE_NUMBER_GROUNDS.length} surfaces and the active one on ${ACTIVE_LINE_NUMBER_GROUNDS.length}, the tab strip at ${TAB_STRIP_DE} dE with ${rows.find((r) => r.tabTexts).tabTexts} tab texts`);
if (issues || detail) {
  for (const r of rows) {
    if (!r.findings.length) continue;
    console.log(`\n${r.label}  ${r.findings.length} problems`);
    for (const f of r.findings) console.log(`   [${f.sev}] ${f.msg}`);
  }
}
console.log('\nmeasured but not counted as problems, since no theme value lifts them without a larger loss elsewhere:');
for (const what of [...new Set(rows.flatMap((r) => Object.keys(r.pending)))]) {
  const hit = rows.filter((r) => r.pending[what]);
  const low = hit.reduce((a, b) => (b.pending[what].worst < a.pending[what].worst ? b : a));
  console.log(`   ${what}: under the floor in ${hit.filter((r) => r.pending[what].under).length} of ${hit.length} themes, lowest ${low.pending[what].worst.toFixed(2)} in ${low.label}`);
}
console.log(issues ? `\nTOTAL ${issues} problems` : '\nNO PROBLEM IN THE DEEP AUDIT');
process.exit(issues ? 1 : 0);

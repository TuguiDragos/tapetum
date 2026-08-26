import { mix, alpha, lighten, darken, readable, contrast, relLum, deltaE, over as composite, hex2lch, lch2hex } from './color.mjs';

const alphaOf = alpha;
const mixOf = mix;

function tokens(s) {
  const hc = s.hc || null;
  const dark = s.variant === 'dark' || s.variant === 'hcDark';
  const up = (c, t) => (dark ? lighten(c, t) : darken(c, t));
  const dn = (c, t) => (dark ? darken(c, t) : lighten(c, t));

  const bg = s.bg;
  const elev = s.bgElev || up(bg, 0.05);
  const chrome = s.bgChrome || dn(bg, 0.3);
  const over = s.bgOverlay || up(bg, 0.1);
  const fg = s.fg;
  const depth = s.depth || depthRamp([s.syntax.keyword, s.syntax.string, s.syntax.number, s.syntax.type, s.syntax.func, s.syntax.tag], bg, dark);
  const hard = [bg, elev, chrome].reduce((a, b) => (dark ? (relLum(b) > relLum(a) ? b : a) : (relLum(b) < relLum(a) ? b : a)));
  const legible = (c, ground, target = 4.5) => {
    if (contrast(c, ground) >= target) return c;
    let best = c;
    for (let k = 0.05; k <= 0.95; k += 0.05) {
      best = dark ? lighten(c, k) : darken(c, k);
      if (contrast(best, ground) >= target) return best;
    }
    return best;
  };
  const dim = legible(s.fgDim || mix(fg, bg, 0.32), hard, 5.2);
  const faint = legible(s.fgFaint || mix(fg, bg, 0.58), hard, 3.4);
  const ghost = legible(mix(fg, bg, 0.68), hard, 2.6);
  const line = mix(bg, fg, 0.13);
  const line2 = mix(bg, fg, 0.24);
  const acc = s.accent || s.syntax.keyword;
  const sel = alpha(acc, dark ? 0.3 : 0.24);
  const selSoft = alpha(acc, dark ? 0.16 : 0.13);
  const onColor = (c) => {
    const white = contrast('#ffffff', c);
    const ink = contrast('#101014', c);
    if (white >= 4.5) return '#ffffff';
    if (ink >= 4.5) return '#101014';
    return white > ink ? '#ffffff' : '#101014';
  };
  const onAcc = onColor(acc);
  const st = s.status;
  const shadowInk = dark ? '#000000' : '#1a1a2e';
  const sh = (k) => alpha(shadowInk, dark ? k : k * 0.45);
  const shadow = sh(0.28);

  const y = s.syntax;
  const trio = bracketTrio({ y: s.syntax, bg, legible, declared: s.depth });
  const sides = mergeSides({ y: s.syntax, bg, dark, legible });
  return { bg, elev, chrome, over, fg, dim, faint, ghost, hard, hc, legible, line, line2, acc, sel, selSoft, onAcc, onColor, st, y, depth, trio, sides, ansi: s.ansi, shadow, sh, up, dn, dark, editor: {
    foreground: fg,
    descriptionForeground: dim,
    disabledForeground: faint,
    errorForeground: st.error,
    focusBorder: alpha(acc, 0.6),
    'icon.foreground': dim,
    'selection.background': sel,
    'widget.border': line2,
    'widget.shadow': sh(0.26),
    'sash.hoverBorder': acc,
    'toolbar.hoverBackground': alpha(fg, 0.06),
    'toolbar.activeBackground': alpha(fg, 0.10),
    'contrastBorder': '#00000000',
    'contrastActiveBorder': '#00000000',

    'textLink.foreground': y.func,
    'textLink.activeForeground': y.string,
    'textPreformat.foreground': legible(y.number, mix(hard, y.number, 0.12), 5.4),
    'textPreformat.background': alpha(y.number, 0.10),
    'textBlockQuote.background': elev,
    'textBlockQuote.border': acc,
    'textCodeBlock.background': elev,
    'textSeparator.foreground': line2,

    'editor.background': bg,
    'editor.foreground': fg,
    'editorLineNumber.foreground': ghost,
    'editorLineNumber.activeForeground': acc,
    'editorLineNumber.dimmedForeground': mix(faint, bg, 0.55),
    'editorCursor.foreground': acc,
    'editorCursor.background': bg,
    'editorMultiCursor.primary.foreground': acc,
    'editorMultiCursor.secondary.foreground': legible(mix(acc, bg, 0.35), bg, 4.6),
    'editor.selectionBackground': sel,
    'editor.selectionForeground': fg,
    'editor.inactiveSelectionBackground': selSoft,
    'editor.selectionHighlightBackground': selSoft,
    'editor.selectionHighlightBorder': '#00000000',
    'editor.wordHighlightBackground': alpha(y.func, 0.18),
    'editor.wordHighlightStrongBackground': alpha(y.type, 0.2),
    'editor.wordHighlightTextBackground': alpha(y.func, 0.14),
    'editor.findMatchBackground': alpha(y.number, 0.38),
    'editor.findMatchBorder': y.number,
    'editor.findMatchHighlightBackground': alpha(y.string, 0.24),
    'editor.findMatchForeground': legible(fg, composite(alpha(y.number, 0.38), bg), 4.6),
    'editor.findMatchHighlightForeground': fg,
    'editor.findRangeHighlightBackground': alpha(acc, 0.1),
    'editor.hoverHighlightBackground': alpha(acc, 0.14),
    'editor.lineHighlightBackground': up(bg, dark ? 0.035 : 0.02),
    'editor.lineHighlightBorder': '#00000000',
    'editor.rangeHighlightBackground': alpha(acc, 0.1),
    'editor.symbolHighlightBackground': alpha(y.type, 0.2),
    'editor.foldBackground': alpha(acc, 0.08),
    'editor.foldPlaceholderForeground': faint,
    'editorLink.activeForeground': y.string,
    'editorWhitespace.foreground': mix(bg, fg, 0.2),
    'editorIndentGuide.background1': line,
    'editorIndentGuide.activeBackground1': mix(bg, fg, 0.34),
    'editorRuler.foreground': line,
    'editorCodeLens.foreground': mix(y.comment, fg, 0.15),
    'editorLightBulb.foreground': st.warn,
    'editorLightBulbAutoFix.foreground': st.ok,
    'editorLightBulbAi.foreground': y.tag,
    'editorBracketMatch.background': alpha(acc, 0.2),
    'editorBracketMatch.border': y.string,
    'editorBracketHighlight.foreground1': trio[0],
    'editorBracketHighlight.foreground2': trio[1],
    'editorBracketHighlight.foreground3': trio[2],
    'editorBracketHighlight.foreground4': trio[0],
    'editorBracketHighlight.foreground5': trio[1],
    'editorBracketHighlight.foreground6': trio[2],
    'editorBracketHighlight.unexpectedBracket.foreground': st.error,
    'editorBracketPairGuide.background1': alpha(trio[0], 0.28),
    'editorBracketPairGuide.background2': alpha(trio[1], 0.28),
    'editorBracketPairGuide.background3': alpha(depth[2], 0.28),
    'editorBracketPairGuide.background4': alpha(depth[3], 0.28),
    'editorBracketPairGuide.background5': alpha(depth[4], 0.28),
    'editorBracketPairGuide.background6': alpha(depth[5], 0.28),
    'editorBracketPairGuide.activeBackground1': alpha(depth[0], 0.6),
    'editorBracketPairGuide.activeBackground2': alpha(depth[1], 0.6),
    'editorBracketPairGuide.activeBackground3': alpha(depth[2], 0.6),
    'editorBracketPairGuide.activeBackground4': alpha(depth[3], 0.6),
    'editorBracketPairGuide.activeBackground5': alpha(depth[4], 0.6),
    'editorBracketPairGuide.activeBackground6': alpha(depth[5], 0.6),

    'editorError.foreground': softStatus(st.error),
    'editorWarning.foreground': softStatus(st.warn),
    'editorInfo.foreground': st.info,
    'editorHint.foreground': st.ok,
    'editorError.background': alpha(st.error, 0.08),
    'editorWarning.background': alpha(st.warn, 0.08),
    'editorInfo.background': alpha(st.info, 0.08),
    'problemsErrorIcon.foreground': softStatus(st.error),
    'problemsWarningIcon.foreground': softStatus(st.warn),
    'problemsInfoIcon.foreground': st.info,

    'editorGutter.background': '#00000000',
    'editorGutter.modifiedBackground': st.modified,
    'editorGutter.addedBackground': st.added,
    'editorGutter.deletedBackground': st.deleted,
    'editorGutter.commentRangeForeground': faint,
    'editorGutter.commentGlyphForeground': dim,
    'editorGutter.commentUnresolvedGlyphForeground': st.warn,
    'editorGutter.foldingControlForeground': dim,
    'editorGutter.itemBackground': alpha(acc, 0.14),
    'editorGutter.itemGlyphForeground': fg,

    'editorOverviewRuler.border': line,
    'editorOverviewRuler.background': cellFill(bg, fg, 5),
    'editorOverviewRuler.findMatchForeground': alpha(y.number, 0.6),
    'editorOverviewRuler.rangeHighlightForeground': alpha(acc, 0.4),
    'editorOverviewRuler.selectionHighlightForeground': alpha(acc, 0.4),
    'editorOverviewRuler.wordHighlightForeground': alpha(y.func, 0.4),
    'editorOverviewRuler.wordHighlightStrongForeground': alpha(y.type, 0.4),
    'editorOverviewRuler.wordHighlightTextForeground': alpha(y.func, 0.3),
    'editorOverviewRuler.modifiedForeground': alpha(st.modified, 0.8),
    'editorOverviewRuler.addedForeground': alpha(st.added, 0.8),
    'editorOverviewRuler.deletedForeground': alpha(st.deleted, 0.8),
    'editorOverviewRuler.errorForeground': softStatus(st.error),
    'editorOverviewRuler.warningForeground': softStatus(st.warn),
    'editorOverviewRuler.infoForeground': st.info,
    'editorOverviewRuler.bracketMatchForeground': y.string,
    'editorOverviewRuler.inlineChatInserted': alpha(st.added, 0.5),
    'editorOverviewRuler.inlineChatRemoved': alpha(st.deleted, 0.5),

    'editorWidget.background': elev,
    'editorWidget.foreground': fg,
    'editorWidget.border': line2,
    'editorWidget.resizeBorder': acc,
    'editorHoverWidget.background': elev,
    'editorHoverWidget.foreground': fg,
    'editorHoverWidget.border': line2,
    'editorHoverWidget.highlightForeground': y.string,
    'editorHoverWidget.statusBarBackground': over,
    'editorSuggestWidget.background': elev,
    'editorSuggestWidget.border': line2,
    'editorSuggestWidget.foreground': fg,
    'editorSuggestWidget.highlightForeground': y.string,
    'editorSuggestWidget.focusHighlightForeground': y.string,
    'editorSuggestWidget.selectedBackground': over,
    'editorSuggestWidget.selectedForeground': fg,
    'editorSuggestWidget.selectedIconForeground': acc,
    'editorSuggestWidgetStatus.foreground': dim,
    'editorGhostText.foreground': legible(mix(y.comment, fg, 0.1), bg, 3.2),
    'editorGhostText.border': '#00000000',
    'editorGhostText.background': '#00000000',
    'editorStickyScroll.background': mix(bg, elev, 0.5),
    'editorStickyScroll.border': line,
    'editorStickyScroll.shadow': sh(0.10),
    'editorStickyScrollHover.background': over,
    'editorInlayHint.background': alpha(acc, 0.08),
    'editorInlayHint.foreground': legible(mix(fg, bg, 0.18), mix(bg, acc, 0.1), 5.0),
    'editorInlayHint.typeBackground': alpha(y.type, 0.08),
    'editorInlayHint.typeForeground': legible(mix(y.type, fg, 0.3), mix(bg, y.type, 0.1), 4.5),
    'editorInlayHint.parameterBackground': alpha(y.param, 0.08),
    'editorInlayHint.parameterForeground': legible(mix(y.param, fg, 0.3), mix(bg, y.param, 0.1), 4.5),
    'editorUnnecessaryCode.opacity': alpha('#000000', 0.77),
    'editorUnnecessaryCode.border': '#00000000',

    'editorActionList.background': elev,
    'editorActionList.foreground': fg,
    'editorActionList.focusBackground': over,
    'editorActionList.focusForeground': fg,
  } };
}

function chrome(t) {
  const legible = t.legible;
  const { onColor, sh, bg, elev, chrome: ch, over, fg, dim, faint, line, line2, acc, sel, onAcc, st, y, shadow, up, dn, dark } = t;
  return {
    'titleBar.activeBackground': ch,
    'titleBar.activeForeground': legible(dim, ch, 4.5),
    'titleBar.inactiveBackground': ch,
    'titleBar.inactiveForeground': legible(faint, ch, 3.2),
    'titleBar.border': line,

    'commandCenter.background': alphaOf(fg, 0.05),
    'commandCenter.foreground': legible(dim, t.hard, 5.0),
    'commandCenter.border': line2,
    'commandCenter.activeBackground': alphaOf(fg, 0.1),
    'commandCenter.activeForeground': fg,
    'commandCenter.activeBorder': acc,
    'commandCenter.inactiveBorder': line,
    'commandCenter.debuggingBackground': alphaOf(acc, 0.2),

    'activityBar.background': ch,
    'activityBar.foreground': fg,
    'activityBar.inactiveForeground': legible(faint, ch, 3.2),
    'activityBar.border': line,
    'activityBar.activeBorder': acc,
    'activityBar.activeBackground': '#00000000',
    'activityBar.activeFocusBorder': acc,
    'activityBar.dropBorder': acc,
    'activityBarBadge.background': acc,
    'activityBarBadge.foreground': onAcc,
    'activityBarTop.background': ch,
    'activityBarTop.foreground': fg,
    'activityBarTop.inactiveForeground': faint,
    'activityBarTop.activeBorder': acc,
    'activityBarTop.activeBackground': over,
    'activityBarTop.dropBorder': acc,
    'modernActivityBar.background': ch,
    'modernActivityBar.inactiveBackground': ch,
    'modernActivityBar.activeBackground': bg,
    'modernActivityBar.activeForeground': fg,
    'modernActivityBar.hoverBackground': elev,
    'modernActivityBar.hoverForeground': fg,

    'profileBadge.background': acc,
    'profileBadge.foreground': onAcc,
    'profiles.sashBorder': line2,

    'sideBar.background': elev,
    'sideBar.foreground': legible(mixOf(fg, elev, 0.18), elev, 4.5),
    'sideBar.border': line,
    'sideBar.dropBackground': alphaOf(acc, 0.16),
    'sideBarTitle.background': elev,
    'sideBarTitle.foreground': legible(dim, elev, 4.5),
    'sideBarTitle.border': line,
    'sideBarSectionHeader.background': elev,
    'sideBarSectionHeader.foreground': fg,
    'sideBarSectionHeader.border': line,
    'sideBarActivityBarTop.border': line,
    'sideBarStickyScroll.background': elev,
    'sideBarStickyScroll.border': line,
    'sideBarStickyScroll.shadow': sh(0.18),

    'list.activeSelectionBackground': over,
    'list.activeSelectionForeground': fg,
    'list.activeSelectionIconForeground': acc,
    'list.inactiveSelectionBackground': alphaOf(fg, 0.06),
    'list.inactiveSelectionForeground': fg,
    'list.inactiveSelectionIconForeground': dim,
    'list.hoverBackground': alphaOf(fg, 0.06),
    'list.hoverForeground': fg,
    'list.focusBackground': over,
    'list.focusForeground': fg,
    'list.focusOutline': alphaOf(acc, 0.55),
    'list.focusAndSelectionOutline': alphaOf(acc, 0.7),
    'list.focusHighlightForeground': y.string,
    'list.inactiveFocusBackground': alphaOf(fg, 0.04),
    'list.inactiveFocusOutline': alphaOf(fg, 0.22),
    'list.highlightForeground': y.string,
    'list.errorForeground': st.error,
    'list.warningForeground': st.warn,
    'list.deemphasizedForeground': faint,
    'list.invalidItemForeground': st.error,
    'list.dropBackground': alphaOf(acc, 0.16),
    'list.dropBetweenBackground': acc,
    'list.filterMatchBackground': alphaOf(y.number, 0.3),
    'list.filterMatchBorder': y.number,
    'listFilterWidget.background': over,
    'listFilterWidget.outline': acc,
    'listFilterWidget.noMatchesOutline': st.error,
    'listFilterWidget.shadow': sh(0.22),
    'tree.indentGuidesStroke': line2,
    'tree.inactiveIndentGuidesStroke': line,
    'tree.tableColumnsBorder': line,
    'tree.tableOddRowsBackground': alphaOf(fg, 0.03),

    'editorGroup.border': line,
    'editorGroup.dropBackground': alphaOf(acc, 0.14),
    'editorGroup.emptyBackground': bg,
    'editorGroup.focusedEmptyBorder': acc,
    'editorGroup.dropIntoPromptBackground': elev,
    'editorGroup.dropIntoPromptForeground': fg,
    'editorGroup.dropIntoPromptBorder': line2,
    'editorGroupHeader.tabsBackground': ch,
    'editorGroupHeader.tabsBorder': line,
    'editorGroupHeader.noTabsBackground': ch,
    'editorGroupHeader.border': line,

    'tab.activeBackground': bg,
    'tab.activeForeground': fg,
    'tab.activeBorder': bg,
    'tab.activeBorderTop': acc,
    'tab.inactiveBackground': ch,
    'tab.inactiveForeground': mix(dim, faint, 0.4),
    'tab.border': line,
    'tab.hoverBackground': elev,
    'tab.hoverForeground': fg,
    'tab.hoverBorder': '#00000000',
    'tab.unfocusedActiveBackground': bg,
    'tab.unfocusedActiveForeground': dim,
    'tab.unfocusedActiveBorder': '#00000000',
    'tab.unfocusedActiveBorderTop': mixOf(acc, ch, 0.5),
    'tab.unfocusedInactiveBackground': ch,
    'tab.unfocusedInactiveForeground': faint,
    'tab.unfocusedHoverBackground': elev,
    'tab.unfocusedHoverForeground': dim,
    'tab.unfocusedHoverBorder': '#00000000',
    'tab.lastPinnedBorder': line2,
    'tab.dragAndDropBorder': acc,
    'tab.activeModifiedBorder': st.modified,
    'tab.inactiveModifiedBorder': mixOf(st.modified, ch, 0.5),
    'tab.unfocusedActiveModifiedBorder': mixOf(st.modified, ch, 0.4),
    'tab.unfocusedInactiveModifiedBorder': mixOf(st.modified, ch, 0.65),
    'tab.selectedBackground': bg,
    'tab.selectedForeground': fg,
    'tab.selectedBorderTop': acc,
    'modernTab.activeBackground': bg,
    'modernTab.activeForeground': fg,
    'modernTab.hoverBackground': elev,
    'modernTab.hoverForeground': fg,
    'modernEditorTab.activeBackground': bg,
    'modernEditorTab.activeForeground': fg,
    'modernEditorTab.inactiveBackground': '#00000000',
    'modernEditorTab.hoverBackground': elev,
    'modernEditorTab.hoverForeground': fg,
    'modernEditorTab.activeHoverBackground': elev,
    'modernEditorTab.activeActionBackground': bg,
    'modernEditorTab.activeHoverActionBackground': elev,
    'modernEditorTab.hoverActionBackground': elev,
    'modernEditorTab.selectedActionBackground': bg,

    'breadcrumb.background': bg,
    'breadcrumb.foreground': dim,
    'breadcrumb.focusForeground': fg,
    'breadcrumb.activeSelectionForeground': y.string,
    'breadcrumbPicker.background': elev,

    'panel.background': elev,
    'panel.border': line,
    'panel.dropBorder': acc,
    'panelTitle.activeBorder': acc,
    'panelTitle.activeForeground': fg,
    'panelTitle.inactiveForeground': legible(faint, elev, 3.2),
    'panelTitle.border': line,
    'panelInput.border': line2,
    'panelSection.border': line,
    'panelSection.dropBackground': alphaOf(acc, 0.14),
    'panelSectionHeader.background': elev,
    'panelSectionHeader.foreground': fg,
    'panelSectionHeader.border': line,
    'panelStickyScroll.background': elev,
    'panelStickyScroll.border': line,
    'panelStickyScroll.shadow': sh(0.18),
    'outputView.background': elev,

    'statusBar.background': ch,
    'statusBar.foreground': legible(dim, ch, 4.5),
    'statusBar.border': line,
    'statusBar.debuggingBackground': st.warn,
    'statusBar.debuggingForeground': onColor(st.warn),
    'statusBar.debuggingBorder': '#00000000',
    'statusBar.noFolderBackground': ch,
    'statusBar.noFolderForeground': legible(faint, ch, 4.6),
    'statusBar.noFolderBorder': line,
    'statusBar.focusBorder': acc,
    'statusBarItem.hoverBackground': alphaOf(fg, 0.1),
    'statusBarItem.hoverForeground': fg,
    'statusBarItem.activeBackground': alphaOf(fg, 0.16),
    'statusBarItem.focusBorder': acc,
    'statusBarItem.prominentBackground': alphaOf(fg, 0.14),
    'statusBarItem.prominentForeground': fg,
    'statusBarItem.prominentHoverBackground': alphaOf(fg, 0.2),
    'statusBarItem.prominentHoverForeground': fg,
    ...remoteIndicator(t),
    'statusBarItem.errorBackground': st.error,
    'statusBarItem.errorForeground': onColor(st.error),
    'statusBarItem.errorHoverBackground': up(st.error, 0.1),
    'statusBarItem.errorHoverForeground': onColor(up(st.error, 0.1)),
    'statusBarItem.warningBackground': st.warn,
    'statusBarItem.warningForeground': onColor(st.warn),
    'statusBarItem.warningHoverBackground': up(st.warn, 0.1),
    'statusBarItem.warningHoverForeground': onColor(up(st.warn, 0.1)),
    'statusBarItem.compactHoverBackground': alphaOf(fg, 0.14),
    'statusBarItem.offlineBackground': st.deleted,
    'statusBarItem.offlineForeground': onColor(st.deleted),
    'statusBarItem.offlineHoverBackground': up(st.deleted, 0.1),
    'statusBarItem.offlineHoverForeground': onColor(up(st.deleted, 0.1)),
  };
}

function controls(t) {
  const legible = t.legible;
  const { onColor, sh, bg, elev, chrome: ch, over, fg, dim, faint, line, line2, acc, onAcc, st, y, shadow, up, dn, dark } = t;
  const field = dark ? mixOf(bg, fg, 0.08) : '#ffffff';
  return {
    'input.background': field,
    'input.foreground': fg,
    'input.border': line2,
    'input.placeholderForeground': legible(faint, field, 3.2),
    'inputOption.activeBackground': alphaOf(acc, 0.22),
    'inputOption.activeBorder': acc,
    'inputOption.activeForeground': fg,
    'inputOption.hoverBackground': alphaOf(fg, 0.1),
    'inputValidation.errorBackground': mixOf(bg, st.error, dark ? 0.12 : 0.03),
    'inputValidation.errorForeground': fg,
    'inputValidation.errorBorder': st.error,
    'inputValidation.warningBackground': mixOf(bg, st.warn, dark ? 0.14 : 0.07),
    'inputValidation.warningForeground': fg,
    'inputValidation.warningBorder': st.warn,
    'inputValidation.infoBackground': mixOf(bg, st.info, dark ? 0.14 : 0.07),
    'inputValidation.infoForeground': fg,
    'inputValidation.infoBorder': st.info,

    'dropdown.background': field,
    'dropdown.listBackground': elev,
    'dropdown.foreground': fg,
    'dropdown.border': line2,

    'button.background': acc,
    'button.foreground': onAcc,
    'button.border': alphaOf(fg, 0.12),
    'button.hoverBackground': up(acc, 0.12),
    'button.separator': alphaOf(onAcc, 0.35),
    'button.secondaryBackground': over,
    'button.secondaryForeground': fg,
    'button.secondaryHoverBackground': mixOf(over, fg, 0.08),
    'extensionButton.background': acc,
    'extensionButton.foreground': onAcc,
    'extensionButton.border': alphaOf(fg, 0.12),
    'extensionButton.hoverBackground': up(acc, 0.12),
    'extensionButton.prominentBackground': acc,
    'extensionButton.prominentForeground': onAcc,
    'extensionButton.prominentHoverBackground': up(acc, 0.12),
    'extensionButton.separator': alphaOf(onAcc, 0.35),
    'extensionBadge.remoteBackground': acc,
    'extensionBadge.remoteForeground': onAcc,
    'extensionIcon.starForeground': st.warn,
    'extensionIcon.verifiedForeground': st.ok,
    'extensionIcon.preReleaseForeground': y.tag,
    'extensionIcon.sponsorForeground': y.tag,

    'checkbox.background': field,
    'checkbox.foreground': legible(acc, field, 5.0),
    'checkbox.border': line2,
    'checkbox.selectBackground': elev,
    'checkbox.selectBorder': acc,
    'radio.activeBackground': alphaOf(acc, 0.2),
    'radio.activeForeground': fg,
    'radio.activeBorder': acc,
    'radio.inactiveBackground': alphaOf(fg, 0.04),
    'radio.inactiveForeground': dim,
    'radio.inactiveBorder': line2,
    'radio.inactiveHoverBackground': alphaOf(fg, 0.08),

    'badge.background': acc,
    'badge.foreground': onAcc,
    'progressBar.background': acc,
    'gauge.background': alphaOf(acc, 0.25),
    'gauge.foreground': acc,
    'gauge.border': line2,
    'gauge.warningBackground': alphaOf(st.warn, 0.25),
    'gauge.warningForeground': st.warn,
    'gauge.errorBackground': alphaOf(st.error, 0.25),
    'gauge.errorForeground': st.error,

    'scrollbar.shadow': shadow,
    'scrollbarSlider.background': sliderTone(bg, fg, 2.0),
    'scrollbarSlider.hoverBackground': sliderTone(bg, fg, 2.7),
    'scrollbarSlider.activeBackground': sliderTone(bg, fg, 3.5),

    'minimap.background': bg,
    'minimap.foregroundOpacity': alphaOf('#000000', 0.8),
    'minimap.findMatchHighlight': y.number,
    'minimap.selectionHighlight': alphaOf(acc, 0.5),
    'minimap.selectionOccurrenceHighlight': alphaOf(acc, 0.3),
    'minimap.errorHighlight': softStatus(st.error),
    'minimap.warningHighlight': softStatus(st.warn),
    'minimap.infoHighlight': st.info,
    'minimap.chatEditHighlight': alphaOf(y.tag, 0.4),
    'minimapSlider.background': sliderTone(bg, fg, 1.8),
    'minimapSlider.hoverBackground': sliderTone(bg, fg, 2.4),
    'minimapSlider.activeBackground': sliderTone(bg, fg, 3.0),
    'minimapGutter.addedBackground': st.added,
    'minimapGutter.modifiedBackground': st.modified,
    'minimapGutter.deletedBackground': st.deleted,

    'quickInput.background': elev,
    'quickInput.foreground': fg,
    'quickInputList.focusBackground': over,
    'quickInputList.focusForeground': fg,
    'quickInputList.focusIconForeground': acc,
    'quickInputTitle.background': over,
    'pickerGroup.border': line,
    'pickerGroup.foreground': acc,
    'keybindingLabel.background': dark ? mixOf(bg, fg, 0.16) : mixOf(bg, fg, 0.10),
    'keybindingLabel.foreground': legible(fg, dark ? mixOf(bg, fg, 0.16) : mixOf(bg, fg, 0.10), 7),
    'keybindingLabel.border': dark ? mixOf(bg, fg, 0.26) : mixOf(bg, fg, 0.20),
    'keybindingLabel.bottomBorder': dark ? mixOf(bg, fg, 0.30) : mixOf(bg, fg, 0.24),
    'keybindingTable.headerBackground': elev,
    'keybindingTable.rowsBackground': alphaOf(fg, 0.03),

    'menu.background': elev,
    'menu.foreground': fg,
    'menu.border': line2,
    'menu.selectionBackground': over,
    'menu.selectionForeground': fg,
    'menu.selectionBorder': '#00000000',
    'menu.separatorBackground': line2,
    'menubar.selectionBackground': alphaOf(fg, 0.1),
    'menubar.selectionForeground': fg,
    'menubar.selectionBorder': '#00000000',

    'banner.background': over,
    'banner.foreground': fg,
    'banner.iconForeground': acc,
  };
}

function integrations(t) {
  const sides = t.sides;
  const legible = t.legible;
  const onColor = t.onColor;
  const A = t.ansi;
  const termBg = t.elev;
  const bright = (c) => {
    const nominal = t.dark ? 0.20 : 0.15;
    for (let k = nominal; k >= 0.02; k -= 0.01) {
      const cand = lighten(c, k);
      if (contrast(cand, termBg) >= 3.2) return cand;
    }
    return lighten(c, 0.02);
  };
  const { sh, bg, elev, chrome: ch, over, fg, dim, faint, line, line2, acc, onAcc, st, y, shadow, up, dn, dark } = t;
  return {
    'terminal.background': elev,
    'terminal.foreground': fg,
    'terminal.selectionBackground': alpha(t.acc, t.dark ? 0.24 : 0.16),
    'terminal.inactiveSelectionBackground': t.selSoft,
    'terminal.selectionForeground': fg,
    'terminal.border': line,
    'terminal.dropBackground': alphaOf(acc, 0.16),
    'terminal.tab.activeBorder': acc,
    'terminal.findMatchBackground': alphaOf(y.number, 0.38),
    'terminal.findMatchBorder': y.number,
    'terminal.findMatchHighlightBackground': alphaOf(y.string, 0.24),
    'terminal.hoverHighlightBackground': alphaOf(acc, 0.14),
    'terminalCursor.foreground': acc,
    'terminalCursor.background': bg,
    'terminalCommandDecoration.defaultBackground': faint,
    'terminalCommandDecoration.successBackground': st.ok,
    'terminalCommandDecoration.errorBackground': st.error,
    'terminalOverviewRuler.cursorForeground': acc,
    'terminalOverviewRuler.findMatchForeground': y.number,
    'terminalStickyScroll.background': elev,
    'terminalStickyScrollHover.background': over,
    'terminal.ansiBlack': dark ? mixOf(bg, fg, 0.16) : mixOf(fg, bg, 0.06),
    'terminal.ansiRed': A.red,
    'terminal.ansiGreen': A.green,
    'terminal.ansiYellow': A.yellow,
    'terminal.ansiBlue': A.blue,
    'terminal.ansiMagenta': A.magenta,
    'terminal.ansiCyan': A.cyan,
    'terminal.ansiWhite': dark ? mixOf(fg, bg, 0.2) : mixOf(fg, bg, 0.55),
    'terminal.ansiBrightBlack': dark ? faint : mixOf(fg, bg, 0.38),
    'terminal.ansiBrightRed': bright(A.red),
    'terminal.ansiBrightGreen': bright(A.green),
    'terminal.ansiBrightYellow': bright(A.yellow),
    'terminal.ansiBrightBlue': bright(A.blue),
    'terminal.ansiBrightMagenta': bright(A.magenta),
    'terminal.ansiBrightCyan': bright(A.cyan),
    'terminal.ansiBrightWhite': dark ? fg : mixOf(fg, bg, 0.72),

    ...gitDecorations(t),
    ...scmGraphColors(t),
    'scmGraph.historyItemHoverAdditionsForeground': st.added,
    'scmGraph.historyItemHoverDeletionsForeground': st.deleted,

    ...diffWashes(t),
    'diffEditor.border': line,
    'diffEditor.diagonalFill': line2,
    'diffEditor.unchangedRegionBackground': elev,
    'diffEditor.unchangedRegionForeground': dim,
    'diffEditor.unchangedRegionShadow': sh(0.14),
    'diffEditor.unchangedCodeBackground': alphaOf(fg, 0.03),
    'diffEditor.move.border': y.tag,
    'diffEditor.moveActive.border': y.number,
    'diffEditorOverview.insertedForeground': alphaOf(st.added, 0.6),
    'diffEditorOverview.removedForeground': alphaOf(st.deleted, 0.6),
    'diffEditorGutter.insertedLineBackground': alphaOf(st.added, 0.2),
    'diffEditorGutter.removedLineBackground': alphaOf(st.deleted, 0.2),
    'multiDiffEditor.headerBackground': elev,
    'multiDiffEditor.background': bg,
    'multiDiffEditor.border': line,

    'merge.currentHeaderBackground': alphaOf(sides.current, sides.headerK),
    'merge.currentContentBackground': alphaOf(sides.current, sides.contentK),
    'merge.incomingHeaderBackground': alphaOf(sides.incoming, sides.headerK),
    'merge.incomingContentBackground': alphaOf(sides.incoming, sides.contentK),
    'merge.commonHeaderBackground': alphaOf(faint, sides.headerK),
    'merge.commonContentBackground': alphaOf(faint, sides.contentK),
    'merge.border': '#00000000',
    'mergeEditor.change.background': alphaOf(st.added, 0.12),
    'mergeEditor.change.word.background': alphaOf(st.added, 0.22),
    'mergeEditor.changeBase.background': alphaOf(st.deleted, 0.12),
    'mergeEditor.changeBase.word.background': alphaOf(st.deleted, 0.22),
    'mergeEditor.conflict.unhandledUnfocused.border': alphaOf(st.warn, 0.5),
    'mergeEditor.conflict.unhandledFocused.border': st.warn,
    'mergeEditor.conflict.handledUnfocused.border': alphaOf(st.ok, 0.35),
    'mergeEditor.conflict.handledFocused.border': alphaOf(st.ok, 0.7),
    'mergeEditor.conflict.handled.minimapOverViewRuler': st.ok,
    'mergeEditor.conflict.unhandled.minimapOverViewRuler': st.warn,
    'mergeEditor.conflictingLines.background': alphaOf(st.warn, 0.16),

    'peekView.border': acc,
    'peekViewEditor.background': mixOf(bg, elev, 0.5),
    'peekViewEditor.matchHighlightBackground': alphaOf(y.number, 0.3),
    'peekViewEditor.matchHighlightBorder': '#00000000',
    'peekViewEditorGutter.background': mixOf(bg, elev, 0.5),
    'peekViewEditorStickyScroll.background': mixOf(bg, elev, 0.5),
    'peekViewResult.background': elev,
    'peekViewResult.fileForeground': fg,
    'peekViewResult.lineForeground': dim,
    'peekViewResult.matchHighlightBackground': alphaOf(y.number, 0.3),
    'peekViewResult.selectionBackground': over,
    'peekViewResult.selectionForeground': fg,
    'peekViewTitle.background': elev,
    'peekViewTitleLabel.foreground': fg,
    'peekViewTitleDescription.foreground': dim,

    'notificationCenter.border': line2,
    'notificationCenterHeader.background': over,
    'notificationCenterHeader.foreground': legible(dim, over, 4.6),
    'notificationToast.border': line2,
    'notifications.background': elev,
    'notifications.foreground': fg,
    'notifications.border': line,
    'notificationLink.foreground': y.func,
    'notificationsErrorIcon.foreground': st.error,
    'notificationsWarningIcon.foreground': st.warn,
    'notificationsInfoIcon.foreground': st.info,

    'debugToolBar.background': elev,
    'debugToolBar.border': line2,
    'debugIcon.breakpointForeground': st.error,
    'debugIcon.breakpointDisabledForeground': faint,
    'debugIcon.breakpointUnverifiedForeground': faint,
    'debugIcon.breakpointCurrentStackframeForeground': st.warn,
    'debugIcon.breakpointStackframeForeground': dim,
    'debugIcon.startForeground': st.ok,
    'debugIcon.pauseForeground': y.func,
    'debugIcon.stopForeground': st.error,
    'debugIcon.disconnectForeground': st.error,
    'debugIcon.restartForeground': st.ok,
    'debugIcon.stepOverForeground': y.func,
    'debugIcon.stepIntoForeground': y.func,
    'debugIcon.stepOutForeground': y.func,
    'debugIcon.continueForeground': y.func,
    'debugIcon.stepBackForeground': y.func,
    'debugConsole.infoForeground': st.info,
    'debugConsole.warningForeground': st.warn,
    'debugConsole.errorForeground': st.error,
    'debugConsole.sourceForeground': dim,
    'debugConsoleInputIcon.foreground': acc,
    'debugExceptionWidget.background': mixOf(bg, st.error, 0.18),
    'debugExceptionWidget.border': st.error,
    'debugTokenExpression.name': y.func,
    'debugTokenExpression.value': fg,
    'debugTokenExpression.string': y.string,
    'debugTokenExpression.number': y.number,
    'debugTokenExpression.boolean': y.number,
    'debugTokenExpression.error': st.error,
    'debugTokenExpression.type': y.type,
    'debugView.exceptionLabelBackground': st.error,
    'debugView.exceptionLabelForeground': onColor(st.error),
    'debugView.stateLabelBackground': over,
    'debugView.stateLabelForeground': fg,
    'debugView.valueChangedHighlight': alphaOf(y.func, 0.4),
    'editor.stackFrameHighlightBackground': alphaOf(st.warn, 0.16),
    'editor.focusedStackFrameHighlightBackground': alphaOf(st.ok, 0.16),
  };
}

function assistant(t) {
  const legible = t.legible;
  const { onColor, sh, bg, elev, chrome: ch, over, fg, dim, faint, line, line2, acc, onAcc, st, y, shadow, up, dn, dark } = t;
  const field = dark ? mixOf(bg, fg, 0.08) : '#ffffff';
  return {
    'chat.requestBackground': elev,
    'chat.requestBorder': line2,
    'chat.requestBubbleBackground': over,
    'chat.requestBubbleHoverBackground': mixOf(over, fg, 0.06),
    'chat.requestCodeBorder': line2,
    'chat.list.background': bg,
    'chat.avatarBackground': over,
    'chat.avatarForeground': fg,
    'chat.slashCommandBackground': alphaOf(acc, 0.14),
    'chat.slashCommandForeground': legible(acc, mixOf(t.hard, acc, 0.16), 5.2),
    'chat.linesAddedForeground': st.added,
    'chat.linesRemovedForeground': st.deleted,
    'chat.editedFileForeground': st.modified,
    'chat.findMatchBackground': alphaOf(y.number, 0.32),
    'chat.findMatchHighlightBackground': alphaOf(y.string, 0.22),
    'chat.thinkingShimmer': alphaOf(acc, 0.55),
    'chat.dictationActiveMicGlow': alphaOf(y.tag, 0.6),
    'chat.inputWorkingBorderColor1': y.keyword,
    'chat.inputWorkingBorderColor2': y.string,
    'chat.inputWorkingBorderColor3': y.tag,
    'chat.checkpointSeparator': line2,

    'inlineChat.background': elev,
    'inlineChat.border': line2,
    'inlineChat.shadow': shadow,
    'inlineChat.regionHighlight': alphaOf(acc, 0.1),
    'inlineChatInput.background': field,
    'inlineChatInput.border': line2,
    'inlineChatInput.focusBorder': acc,
    'inlineChatInput.placeholderForeground': faint,
    'inlineChatDiff.inserted': alphaOf(st.added, 0.12),
    'inlineChatDiff.removed': alphaOf(st.deleted, 0.12),

    'agents.background': bg,
    'agentsPanel.background': elev,
    'agentsPanel.border': line,
    'agentsPanel.foreground': fg,
    'agentsChatInput.background': field,
    'agentsChatInput.foreground': fg,
    'agentsChatInput.border': line2,
    'agentsChatInput.focusBorder': acc,
    'agentsChatInput.placeholderForeground': faint,
    'agentsNewSessionButton.background': acc,
    'agentsNewSessionButton.foreground': onAcc,
    'agentsNewSessionButton.border': alphaOf(fg, 0.14),
    'agentsNewSessionButton.hoverBackground': up(acc, 0.12),

    'inlineEdit.gutterIndicator.background': alphaOf(acc, 0.2),
    'inlineEdit.gutterIndicator.primaryBorder': acc,
    'inlineEdit.gutterIndicator.primaryForeground': onAcc,
    'inlineEdit.gutterIndicator.primaryBackground': acc,
    'inlineEdit.gutterIndicator.secondaryBorder': line2,
    'inlineEdit.gutterIndicator.secondaryForeground': dim,
    'inlineEdit.gutterIndicator.secondaryBackground': elev,
    'inlineEdit.modifiedBorder': alphaOf(st.modified, 0.6),
    'inlineEdit.modifiedBackground': alphaOf(st.modified, 0.08),
    'inlineEdit.modifiedChangedLineBackground': alphaOf(st.added, 0.1),
    'inlineEdit.modifiedChangedTextBackground': alphaOf(st.added, 0.2),
    'inlineEdit.originalBorder': alphaOf(st.deleted, 0.6),
    'inlineEdit.originalBackground': alphaOf(st.deleted, 0.08),
    'inlineEdit.originalChangedLineBackground': alphaOf(st.deleted, 0.1),
    'inlineEdit.originalChangedTextBackground': alphaOf(st.deleted, 0.2),

    'markdownAlert.note.foreground': st.info,
    'markdownAlert.tip.foreground': st.ok,
    'markdownAlert.important.foreground': y.keyword,
    'markdownAlert.warning.foreground': st.warn,
    'markdownAlert.caution.foreground': st.error,

    'testing.iconFailed': st.error,
    'testing.iconErrored': st.error,
    'testing.iconPassed': st.ok,
    'testing.iconQueued': st.warn,
    'testing.iconSkipped': faint,
    'testing.iconUnset': faint,
    'testing.runAction': st.ok,
    'testing.message.error.lineBackground': alphaOf(st.error, 0.14),
    'testing.message.error.badgeBackground': st.error,
    'testing.message.error.badgeBorder': '#00000000',
    'testing.message.error.badgeForeground': onColor(st.error),
    'testing.message.info.decorationForeground': st.info,
    'testing.message.info.lineBackground': alphaOf(st.info, 0.12),
    'testing.peekBorder': st.error,
    'testing.peekHeaderBackground': mixOf(bg, st.error, 0.14),
    'testing.messagePeekBorder': st.info,
    'testing.messagePeekHeaderBackground': mixOf(bg, st.info, 0.14),
    'testing.coveredBackground': alphaOf(st.ok, 0.14),
    'testing.coveredBorder': alphaOf(st.ok, 0.4),
    'testing.coveredGutterBackground': alphaOf(st.ok, 0.35),
    'testing.uncoveredBackground': alphaOf(st.error, 0.14),
    'testing.uncoveredBorder': alphaOf(st.error, 0.4),
    'testing.uncoveredGutterBackground': alphaOf(st.error, 0.3),
    'testing.uncoveredBranchBackground': alphaOf(st.warn, 0.22),
    'testing.coverCountBadgeBackground': acc,
    'testing.coverCountBadgeForeground': onAcc,

    'notebook.editorBackground': bg,
    'notebook.cellBorderColor': cellFill(bg, fg, 9),
    'notebook.cellEditorBackground': cellFill(bg, fg, 2.2),
    'notebook.cellHoverBackground': '#00000000',
    'notebook.cellInsertionIndicator': acc,
    'notebook.cellStatusBarItemHoverBackground': alphaOf(fg, 0.1),
    'notebook.cellToolbarSeparator': cellFill(bg, fg, 9),
    'notebook.focusedCellBackground': '#00000000',
    'notebook.focusedCellBorder': acc,
    'notebook.focusedEditorBorder': acc,
    'notebook.inactiveFocusedCellBorder': line2,
    'notebook.inactiveSelectedCellBorder': line2,
    'notebook.outputContainerBackgroundColor': '#00000000',
    'notebook.outputContainerBorderColor': '#00000000',
    'notebook.selectedCellBackground': '#00000000',
    'notebook.selectedCellBorder': line2,
    'notebook.symbolHighlightBackground': alphaOf(y.type, 0.16),
    'notebookScrollbarSlider.background': sliderTone(bg, fg, 1.5),
    'notebookScrollbarSlider.hoverBackground': sliderTone(bg, fg, 2.4),
    'notebookScrollbarSlider.activeBackground': sliderTone(bg, fg, 3.0),
    'notebookStatusErrorIcon.foreground': st.error,
    'notebookStatusRunningIcon.foreground': y.func,
    'notebookStatusSuccessIcon.foreground': st.ok,
    'notebookEditorOverviewRuler.runningCellForeground': y.func,

    'settings.headerForeground': fg,
    'settings.headerBorder': line,
    'settings.focusedRowBackground': alphaOf(fg, 0.04),
    'settings.focusedRowBorder': acc,
    'settings.rowHoverBackground': alphaOf(fg, 0.03),
    'settings.modifiedItemIndicator': acc,
    'settings.dropdownBackground': field,
    'settings.dropdownForeground': fg,
    'settings.dropdownBorder': line2,
    'settings.dropdownListBorder': line2,
    'settings.checkboxBackground': field,
    'settings.checkboxForeground': legible(acc, field, 5.0),
    'settings.checkboxBorder': line2,
    'settings.textInputBackground': field,
    'settings.textInputForeground': fg,
    'settings.textInputBorder': line2,
    'settings.numberInputBackground': field,
    'settings.numberInputForeground': y.number,
    'settings.numberInputBorder': line2,
    'settings.sashBorder': line2,
    'settings.settingsHeaderHoverForeground': fg,

    'charts.foreground': fg,
    'charts.lines': line2,
    'charts.red': st.error,
    'charts.blue': y.func,
    'charts.yellow': st.warn,
    'charts.orange': y.number,
    'charts.green': st.ok,
    'charts.purple': y.keyword,

    'symbolIcon.arrayForeground': y.number,
    'symbolIcon.booleanForeground': y.number,
    'symbolIcon.classForeground': y.type,
    'symbolIcon.colorForeground': y.tag,
    'symbolIcon.constantForeground': y.number,
    'symbolIcon.constructorForeground': y.type,
    'symbolIcon.enumeratorForeground': y.number,
    'symbolIcon.enumeratorMemberForeground': y.number,
    'symbolIcon.eventForeground': y.tag,
    'symbolIcon.fieldForeground': y.prop,
    'symbolIcon.fileForeground': fg,
    'symbolIcon.folderForeground': dim,
    'symbolIcon.functionForeground': y.func,
    'symbolIcon.interfaceForeground': y.type,
    'symbolIcon.keyForeground': y.prop,
    'symbolIcon.keywordForeground': y.keyword,
    'symbolIcon.methodForeground': y.func,
    'symbolIcon.moduleForeground': y.type,
    'symbolIcon.namespaceForeground': y.type,
    'symbolIcon.nullForeground': y.number,
    'symbolIcon.numberForeground': y.number,
    'symbolIcon.objectForeground': y.type,
    'symbolIcon.operatorForeground': y.op,
    'symbolIcon.packageForeground': y.type,
    'symbolIcon.propertyForeground': y.prop,
    'symbolIcon.referenceForeground': y.func,
    'symbolIcon.snippetForeground': y.string,
    'symbolIcon.stringForeground': y.string,
    'symbolIcon.structForeground': y.type,
    'symbolIcon.textForeground': fg,
    'symbolIcon.typeParameterForeground': y.type,
    'symbolIcon.unitForeground': y.number,
    'symbolIcon.variableForeground': y.variable,

    'welcomePage.background': bg,
    'welcomePage.tileBackground': elev,
    'welcomePage.tileHoverBackground': over,
    'welcomePage.tileBorder': line,
    'welcomePage.progress.background': alphaOf(fg, 0.1),
    'welcomePage.progress.foreground': acc,
    'walkThrough.embeddedEditorBackground': mixOf(bg, elev, 0.5),
    'walkthrough.stepTitle.foreground': fg,

    'ports.iconRunningProcessForeground': st.ok,
    'searchEditor.textInputBorder': line2,
    'searchEditor.findMatchBackground': alphaOf(y.number, 0.24),
    'search.resultsInfoForeground': dim,
    'editorCommentsWidget.resolvedBorder': faint,
    'editorCommentsWidget.unresolvedBorder': st.warn,
    'editorCommentsWidget.rangeBackground': alphaOf(st.warn, 0.08),
    'editorCommentsWidget.rangeActiveBackground': alphaOf(st.warn, 0.14),
    'editorCommentsWidget.replyInputBackground': elev,
    'commentsView.resolvedIcon': faint,
    'commentsView.unresolvedIcon': st.warn,
  };
}

export function buildColors(spec) {
  const t = tokens(spec);
  const all = { ...t.editor, ...chrome(t), ...controls(t), ...integrations(t), ...assistant(t), ...remainder(t), ...tail(t), ...addendum(t) };
  if (t.hc) applyHighContrast(all, t);
  for (const k of Object.keys(all)) if (all[k] === undefined) delete all[k];
  return all;
}

export { tokens };

function remainder(t) {
  const { onColor, sh, bg, elev, over, fg, dim, faint, line, line2, acc, onAcc, st, y, shadow, up, dn, dark } = t;
  const sym = {
    alias: y.variable, argument: y.param, branch: y.type, file: fg,
    folder: dim, inlineSuggestion: faint, method: y.func, option: y.keyword,
    optionValue: y.string, flag: y.keyword, symbolicLinkFile: y.type,
    symbolicLinkFolder: y.type, pullRequest: y.tag,
  };
  const out = {};
  for (const [k, v] of Object.entries(sym)) out[`terminalSymbolIcon.${k}Foreground`] = v;
  return {
    ...out,
    'editor.border': line,
    'editor.compositionBorder': acc,
    'editor.findMatchHighlightBorder': '#00000000',
    'editor.linkedEditingBackground': alphaOf(y.tag, 0.14),
    'editor.snippetTabstopHighlightBackground': alphaOf(acc, 0.16),
    'editor.snippetTabstopHighlightBorder': '#00000000',
    'editor.snippetFinalTabstopHighlightBackground': alphaOf(y.type, 0.16),
    'editor.snippetFinalTabstopHighlightBorder': y.type,
    'editor.placeholder.foreground': faint,
    'editorUnicodeHighlight.background': alphaOf(st.warn, 0.14),
    'editorUnicodeHighlight.border': st.warn,
    'editorGutter.addedSecondaryBackground': alphaOf(st.added, 0.5),
    'editorGutter.deletedSecondaryBackground': alphaOf(st.deleted, 0.5),
    'editorGutter.modifiedSecondaryBackground': alphaOf(st.modified, 0.5),
    'editorGutter.commentDraftGlyphForeground': dim,
    'button.hoverForeground': onAcc,
    'button.secondaryBorder': line2,
    'surface.background': elev,
    'surface.foreground': fg,
    'surface.border': line2,
    'activityErrorBadge.background': st.error,
    'activityErrorBadge.foreground': onColor(st.error),
    'activityWarningBadge.background': st.warn,
    'activityWarningBadge.foreground': onColor(st.warn),
    'agentsBadge.background': acc,
    'agentsBadge.foreground': onAcc,
    'agentsUnreadBadge.background': y.tag,
    'agentsUnreadBadge.foreground': onColor(y.tag),
  };
}

function tail(t) {
  const { onColor, sh, bg, elev, over, fg, dim, faint, line, line2, acc, onAcc, st, y, shadow, up, dn, dark } = t;
  return {
    'actionBar.toggledBackground': alphaOf(acc, 0.2),
    'toolbar.hoverOutline': '#00000000',
    'agentStatusIndicator.background': acc,
    'agentsBottomPanel.border': line,
    'agentsCard.border': line2,
    'agentsGradient.tintColor': alphaOf(acc, 0.28),
    'agentsVoice.speakingForeground': y.tag,
    'browser.border': line2,
    'editor.inlineValuesBackground': alphaOf(y.number, 0.12),
    'editor.inlineValuesForeground': t.legible(mixOf(y.number, fg, 0.25), mixOf(t.hard, y.number, 0.12), 4.7),
    'editor.rangeHighlightBorder': '#00000000',
    'editor.symbolHighlightBorder': '#00000000',
    'editor.wordHighlightBorder': '#00000000',
    'editor.wordHighlightStrongBorder': '#00000000',
    'editor.wordHighlightTextBorder': '#00000000',
    'editorError.border': '#00000000',
    'editorWarning.border': '#00000000',
    'editorInfo.border': '#00000000',
    'editorHint.border': '#00000000',
    'editorIndentGuide.background': line,
    'editorIndentGuide.activeBackground': mixOf(bg, fg, 0.34),
    'editorMarkerNavigation.background': elev,
    'editorMarkerNavigationError.background': st.error,
    'editorMarkerNavigationWarning.background': st.warn,
    'editorMarkerNavigationInfo.background': st.info,
    'editorPane.background': bg,
    'editorStickyScrollGutter.background': mixOf(bg, elev, 0.5),
    'peekViewEditorStickyScrollGutter.background': mixOf(bg, elev, 0.5),
    'editorSuggestWidget.focusOutline': acc,
    'interactive.result.editor.background.color': elev,
    'interactive.session.foreground': fg,
    'mergeEditor.conflict.input1.background': alphaOf(y.type, 0.16),
    'mergeEditor.conflict.input2.background': alphaOf(y.func, 0.16),
    'outputViewStickyScroll.background': elev,
    'quickInput.border': line2,
    'quickInputList.hoverBackground': alphaOf(fg, 0.06),
    'quickInputList.focusHighlightForeground': y.string,
    'scmGraph.historyItemHoverDefaultLabelBackground': over,
    'scmGraph.historyItemHoverDefaultLabelForeground': fg,
    'scrollbar.background': '#00000000',
    'searchEditor.findMatchBorder': alphaOf(y.number, 0.5),
    'shadow.sm': sh(0.10),
    'shadow.md': sh(0.18),
    'shadow.lg': sh(0.28),
    'shadow.xl': sh(0.38),
    'terminal.initialHintForeground': faint,
    'terminalCommandGuide.foreground': alphaOf(acc, 0.4),
    'terminalStickyScroll.border': line,
    'terminalSymbolIcon.commitForeground': y.number,
    'terminalSymbolIcon.tagForeground': y.tag,
    'terminalSymbolIcon.stashForeground': y.keyword,
    'terminalSymbolIcon.remoteForeground': y.func,
    'terminalSymbolIcon.pullRequestDoneForeground': y.type,
    'terminalSymbolIcon.symbolText': fg,
    'textPreformat.border': line2,
  };
}

function addendum(t) {
  const { bg, elev, chrome, over, fg, dim, faint, ghost, line, line2, acc, sel, onAcc, st, y, depth, trio, dark, legible } = t;
  const a = (c, k) => alpha(c, k);
  const m = (x, yy, k) => mix(x, yy, k);
  const guides = {};
  for (let i = 2; i <= 6; i++) {
    const hue = trio[(i - 1) % 3];
    guides[`editorIndentGuide.background${i}`] = a(hue, 0.22);
    guides[`editorIndentGuide.activeBackground${i}`] = a(hue, 0.55);
  }
  return {
    ...guides,
    'activeSessionView.background': elev,
    'activeSessionView.foreground': fg,
    'inactiveSessionView.background': chrome,
    'inactiveSessionView.foreground': dim,
    'agentFeedbackEditorWidget.background': elev,
    'agentFeedbackEditorWidget.border': line,
    'agentFeedbackInputWidget.border': line2,
    'agentSessionReadIndicator.foreground': faint,
    'agentSessionSelectedBadge.border': acc,
    'agentSessionSelectedUnfocusedBadge.border': line2,
    'agentsUpdateButton.downloadedBackground': m(bg, st.ok, 0.22),
    'agentsUpdateButton.downloadingBackground': m(bg, acc, 0.22),
    'chart.axis': line2,
    'chart.guide': line,
    'chart.line': acc,
    'chat.voiceGlowBaseColor': acc,
    'chat.voiceListeningGlow': a(acc, 0.5),
    'chat.voiceSpeakingGlow': a(y.string, 0.5),
    'checkbox.disabled.background': m(bg, fg, 0.06),
    'checkbox.disabled.foreground': ghost,
    'commandCenter.inactiveForeground': faint,
    'editor.findRangeHighlightBorder': a(y.number, 0.34),
    'editor.inactiveLineHighlightBackground': a(fg, dark ? 0.03 : 0.022),
    'editorActiveLineNumber.foreground': acc,
    'editorMarkerNavigationError.headerBackground': m(bg, st.error, 0.14),
    'editorMarkerNavigationWarning.headerBackground': m(bg, st.warn, 0.14),
    'editorMarkerNavigationInfo.headerBackground': m(bg, st.info, 0.14),
    'editorMinimap.inlineChatInserted': a(st.added, 0.5),
    'editorMultiCursor.primary.background': bg,
    'editorMultiCursor.secondary.background': bg,
    'editorBracketMatch.foreground': legible(y.string, composite(t.editor['editorBracketMatch.background'], bg), 4.6),
    'agentsVoice.speakingBackground': a(y.tag, 0.08),
    'editorOverviewRuler.commentForeground': a(y.comment, 0.7),
    'editorOverviewRuler.commentDraftForeground': a(y.comment, 0.45),
    'editorOverviewRuler.commentUnresolvedForeground': a(st.warn, 0.7),
    'editorOverviewRuler.currentContentForeground': a(y.type, 0.6),
    'editorOverviewRuler.incomingContentForeground': a(y.func, 0.6),
    'editorOverviewRuler.commonContentForeground': a(faint, 0.6),
    'extensionIcon.privateForeground': y.tag,
    'git.blame.editorDecorationForeground': ghost,
    'inlineChat.foreground': fg,
    'inlineEdit.gutterIndicator.successfulBackground': st.ok,
    'inlineEdit.gutterIndicator.successfulBorder': st.ok,
    'inlineEdit.gutterIndicator.successfulForeground': t.onColor(st.ok),
    'inlineEdit.tabWillAcceptModifiedBorder': acc,
    'inlineEdit.tabWillAcceptOriginalBorder': line2,
    'interactive.activeCodeBorder': acc,
    'interactive.inactiveCodeBorder': line,
    'mcpIcon.starForeground': st.warn,
    'panelTitleBadge.background': acc,
    'panelTitleBadge.foreground': onAcc,
    'quickInput.list.focusBackground': over,
    'sideBySideEditor.horizontalBorder': line,
    'sideBySideEditor.verticalBorder': line,
    'simpleFindWidget.sashBorder': line2,
    'strongForeground': fg,
    'terminal.findMatchHighlightBorder': a(y.number, 0.4),
    'terminalOverviewRuler.border': line,
    'testing.coveredMinimapBackground': a(st.ok, 0.45),
    'testing.uncoveredMinimapBackground': a(st.warn, 0.45),
    'testing.iconErrored.retired': m(bg, st.error, 0.55),
    'testing.iconFailed.retired': m(bg, st.error, 0.55),
    'testing.iconPassed.retired': m(bg, st.ok, 0.55),
    'testing.iconQueued.retired': m(bg, st.warn, 0.55),
    'testing.iconSkipped.retired': ghost,
    'testing.iconUnset.retired': ghost,
    'window.activeBorder': line2,
    'window.inactiveBorder': line,
  };
}

function gitDecorations(t) {
  const { st, y, bg } = t;
  let ignored = t.faint;
  if (deltaE(ignored, st.modified) < 9) {
    const [L, , h] = hex2lch(ignored);
    ignored = lch2hex(L, 0, h).toUpperCase();
    if (deltaE(ignored, st.modified) < 9) ignored = t.ghost;
  }
  const taken = [st.added, st.modified, st.deleted, st.conflict, ignored];
  const pool = ['tag', 'type', 'func', 'keyword', 'string', 'number'].map((k) => y[k]);
  const pick = (used) => {
    const scored = pool.map((c) => ({ c, near: Math.min(...used.map((u) => deltaE(c, u))) }))
      .sort((a, b) => b.near - a.near);
    if (scored[0].near >= 10) return scored[0].c;
    const [L, C, h] = hex2lch(scored[0].c);
    for (let turn = 30; turn <= 330; turn += 30) {
      const cand = lch2hex(L, Math.max(C, 30), (h + turn) % 360).toUpperCase();
      if (Math.min(...used.map((u) => deltaE(cand, u))) >= 12) return cand;
    }
    return scored[0].c;
  };
  const renamed = pick(taken);
  const submodule = pick([...taken, renamed]);
  return {
    'gitDecoration.addedResourceForeground': st.added,
    'gitDecoration.untrackedResourceForeground': st.added,
    'gitDecoration.modifiedResourceForeground': st.modified,
    'gitDecoration.stageModifiedResourceForeground': st.modified,
    'gitDecoration.deletedResourceForeground': st.deleted,
    'gitDecoration.stageDeletedResourceForeground': st.deleted,
    'gitDecoration.conflictingResourceForeground': st.conflict,
    'gitDecoration.ignoredResourceForeground': ignored,
    'gitDecoration.renamedResourceForeground': renamed,
    'gitDecoration.submoduleResourceForeground': submodule,
  };
}

function depthRamp(roles, bg, dark) {
  let min = 999;
  for (let i = 0; i < roles.length; i++) for (let j = i + 1; j < roles.length; j++) min = Math.min(min, deltaE(roles[i], roles[j]));
  if (min >= 8) return roles;
  const chroma = Math.max(...roles.map((c) => hex2lch(c)[1]));
  if (chroma < 14) {
    const [, , h] = hex2lch(roles[0]);
    const c6 = Math.min(chroma, 6);
    const hi = lightnessFor(13.0, bg), lo = lightnessFor(3.2, bg);
    const step = (hi - lo) / 5 > 0 ? 0.25 : -0.25;
    const out = [lch2hex(hi, c6, h).toUpperCase()];
    for (let L = hi; out.length < 6; L -= step) {
      if ((step > 0 && L < lo) || (step < 0 && L > lo)) break;
      const cand = lch2hex(L, c6, h).toUpperCase();
      const need = 6 - out.length;
      const room = Math.abs(L - lo);
      if (deltaE(cand, out[out.length - 1]) >= 6 || room <= Math.abs(step) * need) out.push(cand);
    }
    while (out.length < 6) out.push(lch2hex(lo, c6, h).toUpperCase());
    return out;
  }
  const [L, C, h0] = hex2lch(roles.reduce((a, b) => (hex2lch(b)[1] > hex2lch(a)[1] ? b : a)));
  const target = dark ? Math.max(L, 62) : Math.min(L, 48);
  return [0, 1, 2, 3, 4, 5].map((n) => lch2hex(target, Math.max(C, 34), (h0 + n * 60) % 360).toUpperCase());
}

function sliderTone(bg, fg, target) {
  let out = bg;
  for (let k = 0.02; k <= 0.9; k += 0.01) {
    out = mix(bg, fg, k);
    if (contrast(out, bg) >= target) return out;
  }
  return out;
}

function sliderAlpha(bg, fg, target) {
  for (let k = 0.05; k <= 0.9; k += 0.01) {
    if (deltaE(composite(alpha(fg, k), bg), bg) >= target) return Number(k.toFixed(2));
  }
  return 0.5;
}

function cellFill(bg, fg, target = 3.0) {
  let out = bg;
  for (let k = 0.01; k <= 0.3; k += 0.005) {
    out = mix(bg, fg, k);
    if (deltaE(out, bg) >= target) return out;
  }
  return out;
}

function mergeSides(t) {
  const { y, bg, dark, legible } = t;
  const pool = [y.type, y.func, y.keyword, y.string, y.number, y.tag].filter(Boolean);
  const chroma = Math.max(...pool.map((c) => hex2lch(c)[1]));

  let current, incoming;
  if (chroma < 16) {
    const [Lb, , hb] = hex2lch(bg);
    const away = dark ? 1 : -1;
    current = lch2hex(Math.min(96, Math.max(6, Lb + away * 34)), Math.min(chroma, 8), hb);
    incoming = lch2hex(Math.min(96, Math.max(6, Lb + away * 68)), Math.min(chroma, 8), hb);
  } else {
    current = legible(pool[0], bg, 3.0);
    for (const cand of pool.slice(1)) {
      const lifted = legible(cand, bg, 3.0);
      if (deltaE(lifted, current) >= 30) { incoming = lifted; break; }
    }
    if (!incoming) {
      const [L, C, h] = hex2lch(current);
      for (let turn = 120; turn <= 240; turn += 20) {
        const cand = legible(lch2hex(L, Math.max(C, 34), (h + turn) % 360), bg, 3.0);
        if (deltaE(cand, current) >= 30) { incoming = cand; break; }
      }
    }
    if (!incoming) incoming = legible(y.func, bg, 3.0);
  }

  const faint = [y.comment, y.keyword, y.string, y.func, y.type, y.number, y.tag].filter(Boolean);
  const reads = (ground) => Math.min(...faint.map((c) => contrast(c, ground)));
  const SEPARATION = 12, PRESENCE = 9, FLOOR = 3.0;

  let contentK = 0;
  for (let k = 0.06; k <= 0.40; k += 0.01) {
    const cg = composite(alpha(current, k), bg), ig = composite(alpha(incoming, k), bg);
    if (Math.min(reads(cg), reads(ig)) < FLOOR) break;
    contentK = Number(k.toFixed(2));
    if (deltaE(cg, ig) >= SEPARATION && Math.min(deltaE(cg, bg), deltaE(ig, bg)) >= PRESENCE) break;
  }
  if (!contentK) contentK = 0.06;

  let headerK = contentK;
  const headerCap = Math.min(contentK * 1.6, 0.5);
  for (let k = contentK + 0.01; k <= headerCap; k += 0.01) {
    const cg = composite(alpha(current, k), bg), ig = composite(alpha(incoming, k), bg);
    if (Math.min(reads(cg), reads(ig)) < FLOOR) break;
    headerK = Number(k.toFixed(2));
  }

  const common = lch2hex(hex2lch(bg)[0] + (dark ? 30 : -30), 4, hex2lch(bg)[2]);
  return { current, incoming, common, contentK, headerK };
}

function bracketTrio(t) {
  const { y, bg, legible, declared } = t;
  if (declared && declared.length >= 3) return declared.slice(0, 3);
  const seeds = [y.keyword, y.func, y.type, y.string, y.number, y.tag].filter(Boolean);
  const out = [];
  for (const seed of seeds) {
    const cand = legible(seed, bg, 4.0);
    if (out.every((c) => deltaE(c, cand) >= 12)) out.push(cand);
    if (out.length === 3) break;
  }
  while (out.length < 3) {
    const [L, C, h] = hex2lch(out[out.length - 1] || y.keyword);
    const turn = 60 * out.length;
    out.push(legible(lch2hex(L, Math.max(C, 22), (h + turn) % 360), bg, 4.0));
  }
  return out;
}

function softStatus(c, cap = 46) {
  const [L, C, h] = hex2lch(c);
  return C <= cap ? c : lch2hex(L, cap, h);
}

function headingColor(t) {
  const { y, fg } = t;
  const [Lf] = hex2lch(fg);
  const [L, C, h] = hex2lch(y.keyword);
  return lch2hex(Math.min(L, Lf), Math.max(C, 16), h);
}

function diffWashes(t) {
  const { st, bg, y } = t;
  const syntax = [y.keyword, y.string, y.func, y.type, y.number, y.tag, y.op].filter(Boolean);
  const LINE = 0.10, TEXT = 0.21;
  const SYNTAX_RESCUE = 3.4, COMMENT_RESCUE = 3.2;

  const at = (scale) => {
    const lineK = LINE * scale, textK = TEXT * scale;
    const insLine = alpha(st.added, lineK), delLine = alpha(st.deleted, lineK);
    const grounds = [composite(insLine, bg), composite(delLine, bg)];
    const insText = alpha(st.added, textK), delText = alpha(st.deleted, textK);
    grounds.push(composite(insText, grounds[0]), composite(delText, grounds[1]));
    return {
      insLine, delLine, insText, delText,
      syntax: Math.min(...grounds.flatMap((g) => syntax.map((c) => contrast(c, g)))),
      comment: y.comment ? Math.min(...grounds.map((g) => contrast(y.comment, g))) : 99,
    };
  };

  let pick = at(1);
  for (let scale = 1; scale >= 0.4; scale -= 0.05) {
    pick = at(scale);
    if (pick.syntax >= SYNTAX_RESCUE && pick.comment >= COMMENT_RESCUE) break;
  }

  return {
    'diffEditor.insertedLineBackground': pick.insLine,
    'diffEditor.removedLineBackground': pick.delLine,
    'diffEditor.insertedTextBackground': pick.insText,
    'diffEditor.removedTextBackground': pick.delText,
    'diffEditor.insertedTextBorder': '#00000000',
    'diffEditor.removedTextBorder': '#00000000',
  };
}

function legibleOn(c, ground, target) {
  if (contrast(c, ground) >= target) return c;
  const up = relLum(ground) < 0.5;
  let best = c;
  for (let k = 0.05; k <= 0.9; k += 0.05) {
    best = up ? lighten(c, k) : darken(c, k);
    if (contrast(best, ground) >= target) return best;
  }
  return best;
}

function lightnessFor(cr, bg) {
  const Yb = relLum(bg);
  const Y = Yb < 0.5 ? cr * (Yb + 0.05) - 0.05 : (Yb + 0.05) / cr - 0.05;
  const c = Math.min(1, Math.max(0, Y));
  return 116 * (c > 0.008856 ? Math.cbrt(c) : 7.787 * c + 16 / 116) - 16;
}

const HC = {
  dark: { border: '#6FC3DF', active: '#F38518', selection: '#F3F518', selectionFg: '#000000', ink: '#FFFFFF' },
  light: { border: '#0F4A85', active: '#006BBD', selection: '#0F4A85', selectionFg: '#FFFFFF', ink: '#000000' },
};

const KEEP_TRANSPARENT = /^(editorOverviewRuler\.border|scrollbar\.shadow|merge\.border|editorGroup\.dropIntoPromptBorder)$/;

function applyHighContrast(all, t) {
  const c = HC[t.hc];
  for (const k of Object.keys(all)) {
    if (!/(\.border|Border)$/.test(k) || KEEP_TRANSPARENT.test(k)) continue;
    if (/focus|active|Active/.test(k)) { all[k] = c.active; continue; }
    all[k] = c.border;
  }
  all.contrastBorder = c.border;
  all.contrastActiveBorder = c.active;
  all.focusBorder = c.active;
  all['editor.selectionBackground'] = c.selection;
  all['editor.selectionForeground'] = c.selectionFg;
  all['editor.foreground'] = t.fg;
  all['editor.background'] = t.bg;
  all['editorCursor.foreground'] = c.ink;
  all['editor.lineHighlightBorder'] = c.active;
  all['editor.lineHighlightBackground'] = '#00000000';
  all['editorWhitespace.foreground'] = t.legible(t.faint, t.bg, 4.5);
  all['widget.shadow'] = '#00000000';
  all['scrollbar.shadow'] = '#00000000';
  for (const k of ['shadow.sm', 'shadow.md', 'shadow.lg', 'shadow.xl']) if (k in all) all[k] = '#00000000';
}

function scmGraphColors(t) {
  const { elev, depth, y, legible } = t;
  const hueOf = (c) => hex2lch(c)[2];
  const dist = (a, b) => { const d = Math.abs(a - b); return d > 180 ? 360 - d : d; };
  const pool = [y.keyword, y.func, y.string, y.type, y.number, y.tag, ...depth];

  const pick = (target, taken) => {
    const ranked = pool
      .map((c) => ({ c, d: dist(hueOf(c), target) }))
      .sort((a, b) => a.d - b.d);
    for (const { c } of ranked) {
      const badge = legible(c, elev, 4.6);
      if (taken.every((u) => deltaE(badge, u) >= 12)) return badge;
    }
    const [L, C, h] = hex2lch(ranked[0].c);
    for (let turn = 40; turn <= 320; turn += 40) {
      const cand = legible(lch2hex(L, Math.max(C, 34), (h + turn) % 360), elev, 4.6);
      if (taken.every((u) => deltaE(cand, u) >= 14)) return cand;
    }
    return legible(ranked[0].c, elev, 4.6);
  };

  const local = pick(250, []);
  const remote = pick(300, [local]);
  const base = pick(40, [local, remote]);

  const lines = {};
  depth.slice(0, 5).forEach((c, i) => { lines[`scmGraph.foreground${i + 1}`] = legible(c, elev, 3.2); });

  return {
    ...lines,
    'scmGraph.historyItemRefColor': local,
    'scmGraph.historyItemRemoteRefColor': remote,
    'scmGraph.historyItemBaseRefColor': base,
    'scmGraph.historyItemHoverLabelForeground': elev,
  };
}

function remoteIndicator(t) {
  const { acc, st, onColor, up } = t;
  const [, chroma, hue] = hex2lch(acc);
  const readsAsOk = chroma > 18 && hue > 95 && hue < 175;
  const readsAsError = chroma > 18 && (hue < 35 || hue > 345);
  const risky = (c) => {
    const [, ch, h] = hex2lch(c);
    const green = ch > 18 && h > 95 && h < 175;
    const red = ch > 18 && (h < 35 || h > 345);
    return green || red || Math.min(deltaE(c, st.ok), deltaE(c, st.error), deltaE(c, st.warn)) < 14;
  };
  let base = risky(acc) ? st.info : acc;
  if (risky(base)) {
    const [L, C, h] = hex2lch(base);
    base = lch2hex(L, Math.max(C, 26), 250);
    if (risky(base)) base = lch2hex(L, Math.max(C, 26), 265);
  }
  return {
    'statusBarItem.remoteBackground': base,
    'statusBarItem.remoteForeground': onColor(base),
    'statusBarItem.remoteHoverBackground': up(base, 0.12),
    'statusBarItem.remoteHoverForeground': onColor(up(base, 0.12)),
  };
}

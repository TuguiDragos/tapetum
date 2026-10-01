// Keys the themes leave out on purpose. VS Code registers each without a default and reacts to its mere
// presence, so any value, transparent included, changes what it draws.
export const LEFT_UNSET = [
  { key: 'contrastBorder', themes: 'regular',
    why: 'VS Code reads it as the high contrast switch: set, even to transparent, it replaces borders meant for regular themes with its own, and the find widget and the segmented controls lose theirs; the high contrast themes set it' },
  { key: 'contrastActiveBorder', themes: 'regular',
    why: 'the same switch for focus: set, it turns off the fade of shrunk tab names, hides the line that marks keyboard focus in the activity bar, and takes the place of list.inactiveFocusOutline on the selected row; the high contrast themes set it' },
  { key: 'editorGroupHeader.border', themes: 'regular',
    why: 'set, VS Code draws it across the whole width under the tab strip and under the active tab too, so a connected tab never joins its editor; VS Code leaves it unset outside high contrast' },
  { key: 'activityBar.activeBackground', themes: 'all',
    why: 'set, VS Code paints it over the active item of the modern activity bar, whose own colour is modernActivityBarItem.activeBackground; the classic activity bar marks its active item with activityBar.activeBorder' },
];

export const leftUnset = (uiTheme) => new Set(LEFT_UNSET.filter((u) => u.themes === 'all' || !uiTheme.startsWith('hc')).map((u) => u.key));

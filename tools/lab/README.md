# The lab

The lab opens a real editor with the themes of any revision of this repository, plays a scene in it and saves
what the editor painted, so a colour is judged on the pixels it ends up as rather than on a model of them.

Each run builds its own profile, extensions folder and home in a fresh folder under `/tmp`, so the editor you
use every day is never touched, and nothing signs in. The workspace is a small git repository with staged,
unstaged, renamed, deleted and untracked files, a submodule, a diff3 conflict, a notebook, merge editor inputs,
a program that stops in the debugger and a file of tests (see `buildWorkspace` in `lab.mjs`).

## Setup

macOS or Linux, Node 24, git and zip.

```sh
npm ci --prefix tools/lab
```

## A scene, before and after

```sh
node tools/lab/run.mjs tools/lab/scenes/stale-tests.json --out /tmp/lab/stale --tag before --ref v1.1.0
node tools/lab/run.mjs tools/lab/scenes/stale-tests.json --out /tmp/lab/stale --tag after
```

`--ref` takes the themes of a git revision; without it the working tree is used. `--app` points at another
editor, such as VS Code Insiders, by its `.app` or its executable. `--keep` keeps the run folder.

Each scene leaves `<name>_<tag>.png` in the output folder, and `<tag>.json` holds every probe with the
screenshot's device scale.

## Scene files

```json
{
  "settings": { "testing.gutterEnabled": true },
  "setup": [{ "op": "open", "path": "checks.test.js" }],
  "scenes": [
    { "name": "stale-tests_riso", "theme": "Tapetum Riso", "actions": [], "settle": 1200, "probe": "document.title", "after": [] }
  ]
}
```

`settings` are added to the user settings, `setup` runs once, and each scene loads its theme, runs its
`actions`, waits `settle` milliseconds, takes the screenshot, evaluates `probe` in the window and runs `after`.

Actions run in the window: `wait {ms}`, `key {key}`, `type {text}`, `eval {js}`, `hover {selector}`,
`mouse {x, y}`, `hoverText {text, nth}`, `click {selector, nth, modifiers}`, `rclick {selector, nth}`,
`blurWindow`, `focusWindow` and `focusEmulation {enabled}`.

Actions run by the driver extension: `theme {label}`, `config {key, value}`, `exec {id, args}`,
`execNoWait {id, args}`, `open {path, line, col}`, `dirty {path, text}`, `cursor {line, col, endCol}`,
`notify`, `progress {ms}`, `revert` and `tests {path, retire}`. A `path` is relative to the workspace.

## Measuring

```sh
node tools/lab/pixels.mjs box /tmp/lab/stale/stale-tests_passepartout_after.png 166 264 32 32 '#a66e64'
node tools/lab/pixels.mjs crop /tmp/lab/stale 120 200 1160 420
node tools/lab/pixels.mjs sheet /tmp/lab/sheet.png /tmp/lab/stale/crops/stale-tests_passepartout
```

`box` takes device pixels: the CSS box of a probe times its scale. The ground is the commonest colour in the
box, and the ink is the colour given, counted exactly, or the pixel farthest from the ground.

## What the editor does that a scene has to know

- macOS caps socket paths near 104 characters, and the editor and the JavaScript debugger put theirs in the
  profile and in `TMPDIR`, which is why every run lives in a short folder under `/tmp`.
- The window of a script is rarely the focused one, so focus is emulated; turn it off and blur the window to
  see an inactive one.
- View lines hold non breaking spaces, so `hoverText` matches text with plain ones.
- Screenshots are taken in sRGB, so their pixels compare with theme colours as written.

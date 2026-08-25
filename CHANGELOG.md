# Changelog

## [1.0.2]

A day of looking at the themes rather than measuring them.

### Fixed

**Merge conflicts.** The two halves were too close in colour to tell apart in 44
of the 58, and neither stood out from the background in 45. The rule only ever
checked the two marker lines, never the code between them, and compared the
colours before they were mixed with the background rather than after.

**Brackets.** Six rainbow colours, so a warm monochrome family drew green and
cyan brackets. VS Code ships three and repeats them; Tapetum now does the same,
taking its three from the family's own palette.

**Unused code** was drawn at 45 per cent where the documentation suggests 75.

**Markdown headings** outshone body text in 27 of the 58. A heading may now
never carry more contrast against the background than the text around it.

**Error and warning colours** were saturated enough that Cherenkov Light had
drifted to magenta. The thin lines and small icons are capped now.

**Keyboard focus in lists was invisible.** No focus ring, and the focused row
had the same background as the selected one. An accessibility failure, not a
matter of taste.

**Buttons had no edge** and the scrolled pane shadow was off. Both restored
after a key by key comparison with Dark Modern.

**Notebook cells.** The cell is a gently raised surface again, its code on the
same background it would have in a normal file. The square output box and the
square overlays painted across cells on focus are gone.

**Sliders were see through.** The one over the minimap let 90 per cent of it
show through. Each is now built by picking the tone that carries the right
weight, then painting it solid.

**The strip beside the minimap** had no surface of its own. It has one now, with
a dividing line, as in Dark Modern.

## [1.0.1]

Most of this release came from someone opening the themes in a real editor and
saying what hurt. That turned out to be a better test than any of the measuring
tools, which had been reporting everything clean.

### Added

**Download counts under the title.** Two small badges, a box for installs on the
Marketplace and a downward arrow for downloads on Open VSX. The two shapes are
deliberate: the numbers count different things, and a reader should sense that
before reading the labels. Open VSX counts every fetch of the file, including
robots and mirrors, while the Marketplace counts people who actually installed
it, so the two will never line up and are not meant to be compared.

They refresh themselves. A workflow reads both registries each morning, and
commits only if a number actually moved, so the history does not fill up with
noise. The commit is made by the bot but credits the repository owner as
co-author, because the tooling behind it is his work.

Getting there was less obvious than it sounds. Hand drawn badge files turned out
to be impossible: the Marketplace refuses any README that points at an SVG from
outside its own list of trusted badge providers, and the packaging step catches
it, so the whole thing would have failed at publish time. Shields.io has also
quietly retired every Visual Studio Marketplace badge it used to serve. Neither
registry publishes a monthly figure either, only a running total.

### Fixed

**Diffs were hard to read.** In the diff editor a changed word sits on two
tinted layers at once, the tint for the whole line and a stronger one for the
word itself. Nothing in the tooling had ever looked at the two of them together,
only at each on its own, so this went unnoticed. Comments were the worst hit,
dropping to 3.14 against inserted text in Fraunhofer and to 2.72 somewhere in
the collection.

The awkward part is that comments are placed right at their contrast floor on
purpose, so they recede. That leaves no headroom at all: any tint, however
faint, pushes them under. There is no arrangement that keeps both the tint and
the full contrast, so the tints are now chosen to hold every theme above the
level that was reported as too low, and no theme is worse than the one that
started the complaint.

**Brackets looked like a rainbow.** Six colours, each a sixth of the way around
the colour wheel, with the saturation forced up. In a warm, almost monochrome
family like Safelight that meant green and cyan brackets in a theme that has
neither. VS Code itself only ships three bracket colours and repeats them, which
is the sensible thing to do, so Tapetum does that now, picking the three from
the family's own palette. Indent guides follow the same three. Families that
chose their own ramp by hand keep it.

**Unused code was almost invisible** rather than merely dimmed. It was being
drawn at 45 per cent while the VS Code documentation suggests 75. Open a file
with a lot of unused imports and you could barely read it.

**Markdown headings were the brightest thing on screen.** They borrowed the
keyword colour, which in several families is lighter than ordinary text, so a
heading line glared. Headings now follow a simple rule: a heading is never
allowed more contrast than the body text around it. That was broken in 27 of the
58 themes.

**Errors and warnings shouted.** The colours they used were pushed hard enough
that in Cherenkov Light the error colour had drifted all the way to magenta.
Squiggles and small icons appear everywhere, so they are now calmed down. The
underlying status colour is untouched, so git decorations and diff tints keep
looking like themselves.

**The two halves of a merge conflict looked the same.** In a few themes, current
and incoming were near enough in colour to be indistinguishable, which rather
defeats the point. They are now pulled apart, and if the palette has no two
colours far enough from each other, one of them gets rotated until it does.

**A stale number in the README.** It still claimed 729 colour keys long after
the count had grown to 964.

**A miscount in the docs.** Both the manifest and the changelog said five ways of
colouring code. There are six. `signal` had been left off the list.

### Changed

**A shorter store description**, and `cursor` and `windsurf` added to the search
keywords, since the extension runs in both and those are the words people
actually type.

**Five new checks in the audit**, so none of the above can creep back. The
stacked layer check had only ever combined the selection with a few highlights
and never included comments, which is exactly why the diff problem stayed
invisible. It now looks at the real diff stack, and the bracket check has been
taught that three repeating colours is the intended answer, not a bug.

## [1.0.0]

58 themes instead of 8, six different ways of colouring code instead of one, a
high contrast pair, and a verification pass that found bugs in the first release.

### Added

**24 new families**, each in a dark and a light variant, bringing the collection
to 28 families and 58 themes.

| Family | Drawn from | Scheme |
| --- | --- | --- |
| **Coherence** | 6 lines from one argon and krypton ion laser | grammar |
| **Valence** | Transition metals dissolved in water | grammar |
| **Hadal** | The depth at which each colour dies underwater | grammar |
| **Cinnabar** | Mineral pigments ground before synthetic chemistry | grammar |
| **Epitaxy** | A silicon wafer and real LED emission peaks | grammar |
| **Verdigris** | What copper turns into as it corrodes | grammar |
| **Cherenkov** | A reactor pool. No warm colour exists in it | grammar |
| **Aerogel** | Rayleigh scattering. Blue reflected, amber transmitted | grammar |
| **Cavitation** | Sonoluminescence, the flash of a collapsing bubble | grammar |
| **Noctiluca** | Light made by living things | grammar |
| **Incandescence** | The temperature scale of hot steel | grammar |
| **Safelight** | A darkroom under an OC filter | grammar |
| **Dichroic** | A dichroic filter. 2 hues in the whole of the code | grammar |
| **Provenance** | Where each symbol came from | provenance |
| **Stratum** | Sedimentary layers. Colour sits on nesting depth | tone |
| **Borrow** | Whether a thing can change, and where it is written to | borrow |
| **Palimpsest** | A scraped and rewritten manuscript | signal |
| **Silverpoint** | A silver stylus on prepared paper. No hue anywhere | tone |
| **Passepartout** | The mat around a framed photograph | grammar |
| **Effect** | Which code touches the world and which only computes | effect |
| **Cochineal** | Carminic acid, the first real scarlet Europe had | grammar |
| **Glacier** | Compressed glacier ice. Nothing in it is black | grammar |
| **Selenium** | Selenium toning. Hue rotates as tone drops | grammar |
| **Riso** | The 6 spot inks you can order for a duplicator | grammar |

**4 new colouring schemes.** Until now every theme answered one question: what
kind of symbol is this. A scheme is a property of the theme, so switching theme
switches the rule.

- `provenance` colours by where a symbol came from. Gold and bold for what you
  defined here, cyan and italic for what the language gave you, violet for what
  cannot change. Keywords are dimmed on purpose.
- `borrow` colours by mutability. Cold for frozen, warm for mutable, green and
  italic for borrowed parameters, and the name lights up at the exact point you
  write to it, using the `modification` semantic modifier.
- `effect` colours by side effect. `await`, `async`, `throw` and every mutation
  burn. Pure computation stays cold.
- `signal` scrapes boilerplate back toward the background so only the names you
  chose and the data stay lit.
- `tone` removes hue from the code entirely: 6 tones plus weight and italic.

**Colour coverage raised from 729 to 989 keys.** All 964 keys confirmed to exist
in VS Code 1.134.0 are now set, including bracket pair guides 4 to 6, indent
guides 2 to 6, window borders, the agent session surfaces, chart axes, voice
glow and the marker navigation headers. The previous registry of 729 keys was
itself incomplete, so the 100 percent coverage claimed in 0.1.0 was measured
against the wrong denominator.

**TextMate coverage raised from 55 rules over 183 scopes to 92 rules over 320
scopes**, measured at 98.3 percent of the non structural scopes emitted by the
125 grammars visible to the checker. Added coverage for log files, F#, Julia,
Pug, LaTeX, Clojure, Handlebars, snippets, dotenv, Markdown heading levels,
tables and math, C and C++ operators and preprocessor macros, regexp character
classes, JSDoc tags, CSS keyframe offsets and counters, Less variables and
unicode ranges, PHP attributes and namespaces, Objective-C protocols and R
namespaces.

**Verified against 15 languages whose grammars were installed for the purpose**,
not assumed. Rust, Go, Swift and Dart ship with VS Code. The other 11 were
installed and measured: Go modules, Svelte, Vue, Astro, Kotlin, Elixir, Zig,
Nix, Terraform, GraphQL and Prisma. 924 of their 939 scopes are covered, 98.4
percent, and 7 of the 15 reach 100 percent. What remains uncovered in them are
region markers such as `repeat-while` and `self-closing-tag`, which are not
tokens. Rules were added for GraphQL declarations and fragments, HCL and
Terraform functions, Kotlin packages, Zig error types, Go module operators and
Prisma scalar fields.

**2 high contrast variants**, `Tapetum Coherence High Contrast` and
`Tapetum Coherence High Contrast Light`, registered as `hc-black` and `hc-light`.
Pure black and pure white grounds, every border drawn in the contrast colour VS
Code uses for high contrast, and a palette rebuilt to clear APCA Lc 78 rather
than being a lifted version of the normal one. The light variant clears both
Lc 78 and WCAG 7 to 1 at the same time. Before this there was no high contrast
theme in the collection at all, which meant anyone who needs one could not use
Tapetum.

**APCA contrast, measured and enforced.** WCAG 2 computes relative luminance,
a model built for black text on white paper. It overestimates how legible light
text is on a dark background, which is exactly what a code editor does. The
project now measures APCA Lc alongside WCAG and holds a floor per role: Lc 55
for keywords, functions and strings, Lc 45 for types, numbers, tags and every
terminal colour. `tools/apca-check.mjs` verifies the implementation against the
published reference values and 6 properties of the model.

**A regression harness.** `tools/snapshot.mjs` records every colour, rule and
semantic selector of all 58 themes and reports, key by key, what changed and in
which themes. A change to one derivation that silently alters 40 themes now
shows up as a list rather than as a surprise. `tools/contact-sheet.mjs` renders
all 58 themes as rows in a single image so the whole collection can be scanned at
once for an outlier.

**Semantic token coverage measured against the real legend.** VS Code defines 23
semantic token types and 8 modifiers, and installed extensions declare more:
Terraform adds 13 types, Pylance 12, Nix 4. `tools/semantic-legend.mjs` reads all
of them and checks every scheme against the full set, accounting for `superType`
inheritance and the TextMate fallback mapping. Selectors per scheme went from 29
to between 45 and 59.

**Automatic depth ramp.** When a family's 6 syntax colours are too close to tell
bracket nesting levels apart, the generator now derives a dedicated ramp instead:
a hue rotation for colourful families, an equal delta E lightness ladder for the
achromatic ones.

**New verification tools**, all reading the installed VS Code rather than a
hand written list.

- `tools/extract-keys.mjs` derives the full colour key registry from every
  bundled JavaScript file, the workbench stylesheet, the Microsoft themes and the
  bundled extension manifests
- `tools/audit.mjs` checks structure: manifest against files on disk, duplicate
  labels, byte identical themes, that each scheme really produces different
  rules, that declared overrides reached the output, and that the README has not
  fallen behind
- `tools/deep.mjs` checks each theme individually across semantic tokens,
  109 foreground and background sibling pairs, stacked overlays, terminal colours
  over the terminal selection, git decorations, bracket levels, minimap markers
  and diff washes
- `tools/deep-compare.mjs` runs the same checks over every theme Microsoft ships
- `tools/scope-audit.mjs` simulates TextMate precedence over all 7096 real
  grammar scopes and reports rules that never win, rules that are always
  shadowed, and scopes no grammar emits
- `tools/semantic-legend.mjs` reads the semantic token legend out of VS Code and
  the installed extensions and checks each scheme against it
- `tools/apca.mjs` and `tools/apca-check.mjs` measure APCA Lc per theme and
  verify the implementation
- `tools/apca-lift.mjs` raises colours that sit below the APCA floor, with a
  movement budget so a colour is corrected rather than replaced
- `tools/snapshot.mjs` and `tools/contact-sheet.mjs` are the regression harness
- `tools/gif-slim.mjs` reads a GIF block by block and reports its real structure.
  It refuses to drop frames when they are partial, which is the case here, because
  dropping one would lose the pixels it carries and unravel the animation
- `tools/grammar-coverage.mjs` reports scope coverage per language
- `tools/grammar-scopes.mjs` extracts every scope from every grammar, reading
  both the grammars bundled with VS Code and the extensions you have installed,
  so coverage is measured against the languages you actually use
- `tools/png-write.mjs` and `tools/build-strips.mjs` generate the palette strips
- `tools/build-readme.mjs` generates the README from the palettes and the stories
- `tools/vscode-path.mjs` locates the VS Code installation on macOS, Windows and
  Linux, including VSCodium, snap and flatpak

### Fixed

- **Quantum Light shipped with the error and warning colours identical.** Both
  resolved to `#af4900`, so a red squiggle and a yellow one looked the same, as
  did the gutter and Problems icons. Status colours are now assigned so no two
  ever land on the same role.
- **A muted foreground could be lightened when it should have been darkened.**
  The helper picked its direction from the luminance of the surface rather than
  from the polarity of the theme, which produced near white text on a light
  background whenever a surface sat near mid grey.
- **Muted foregrounds were measured against the editor background** rather than
  against the hardest surface they can land on, so `descriptionForeground`,
  `commandCenter.foreground` and `textPreformat` fell below the floor on hover
  surfaces.
- **15 colour keys did nothing.** `hover.background`, `shadow.small`,
  `testing.message.error.decorationForeground` and 12 others do not exist in
  VS Code. Removed.
- **78 real colour keys were never set** and fell back to VS Code defaults.
- **Stratum's depth ramp never reached the generator**, so the one family whose
  entire idea is colour by nesting depth was using its own near monochrome syntax
  colours for bracket levels.
- **Git decorations collided.** Renamed matched untracked in 22 themes. The 7
  slots that must differ are now assigned distinctly, with hue rotation when a
  palette has no spare colour, while keeping the pairs VS Code itself ties
  together.
- **The secondary multi cursor was too dim** to read the character under it.
- **`editor.findMatchForeground` was not legible** over the match background.
- **The Rust lifetime rule never matched anything.** It named
  `storage.modifier.lifetime.rust` and `entity.name.lifetime.rust`, while the
  Rust grammar emits `entity.name.type.lifetime.rust` and
  `punctuation.definition.lifetime.rust`. Every `'a` in Rust code has been
  falling back to the plain foreground since the first release.
- **7 more TextMate scope names were wrong** even for bundled languages, among
  them `punctuation.definition.key-value.yaml`, which the YAML grammar does not
  emit, `beginning.punctuation.definition.quote.markdown` and
  `keyword.other.DDL.sql`, which is too specific to match
  `keyword.other.DDL.create.II.sql`.
- **The scope extractor had a blind spot.** It only read `name` and
  `contentName` fields, missing scopes declared elsewhere in a grammar. Rewritten
  to walk every value, which raised the visible grammar count from 71 to 125 and
  the scope count from 6561 to 7780. Every coverage number before this was
  optimistic.
- **High contrast exposed a bug that affected the whole generator.** Theme
  polarity was decided by comparing the variant name to the string `dark`, so a
  variant called `hcDark` was treated as a light theme and every derived surface
  came out inverted. Input fields were white on white.
- **52 syntax colours and 24 terminal colours were below the APCA floor**, all of
  them in dark themes. Every light theme already passed. 50 of the 52 needed less
  than 8 delta E of movement, which is below the threshold where a colour reads as
  changed. 3 roles are exempt by design and recorded as such: the keyword in
  Effect, Palimpsest and Provenance is dimmed on purpose, because that is the
  point of those schemes.
- **The grammar scheme handled almost no semantic modifiers.** `declaration`,
  `static`, `abstract`, `async` and `documentation` were unstyled, and 7 token
  types including the standard `label` had no rule at all. For comparison, the
  themes shipped with VS Code declare between 0 and 4 semantic selectors and
  handle no modifiers.
- **The terminal had a different background from the panel it sits in**, so a step
  was visible right under the row of panel tabs. VS Code registers
  `terminal.background` with a null default, which means it takes the panel
  background, and the themes shipped with VS Code set the two to the same value.
  Tapetum had tied the terminal to the editor background instead. Fixed in all 58,
  and the audit now fails if the two ever drift more than 1 delta E apart.
- **The seam checker was case sensitive** and matched only keys ending in
  `Background`, so every key ending in `.background` was silently skipped. That is
  why the terminal seam was never reported.
- **The bright terminal colours were lightened by a fixed amount** regardless of
  what they landed on. On a light theme that pushes them toward the background.
  Each one now stops at the largest step that still clears 3.2 to 1 on the real
  terminal background, and the APCA floor for terminal colours is measured there
  too rather than against the editor.
- **Every branch pill in the Source Control graph was unreadable, in all 58
  themes.** VS Code draws `scmGraph.historyItemRefColor` as the pill background
  and writes the label in `scmGraph.historyItemHoverLabelForeground`, which
  defaults to the panel background. Tapetum had the two the other way round, so a
  light theme produced a black pill with black text and a dark theme a pale pill
  with pale text. The worst measured 1.00 to 1, meaning fully invisible. All 174
  pills now clear 4.5 to 1 and the three ref colours are at least 12 delta E apart.
- **The graph curves used syntax colours**, which in the near monochrome families
  made the branches indistinguishable. They now follow the bracket depth ramp,
  which is guaranteed to be distinct in every theme.
- **The remote indicator in the status bar could read as success or as error.**
  It was tied to the theme accent, which comes out green in Persistence and
  Noctiluca and red in Cochineal, Riso and Effect, on a chip that also says
  Disconnected. 21 of 58 were affected. The indicator now falls back to the
  theme's info colour, and to a blue if that is green too, so no theme can claim a
  state the label contradicts.
- **No rule is dead any more.** Before this pass, 2 rules never won for any real
  scope. Microsoft's own themes carry between 7 and 21 such rules each.
- Contrast raised on `statusBar.noFolderForeground`, the testing error badge,
  `notificationCenterHeader.foreground` and `editorBracketMatch.foreground`.
- Diff inserted and removed washes are now separated by at least 10 delta E,
  raising the wash strength when a palette's added and deleted colours are close.
- The terminal selection no longer drowns the ANSI colours.

**Screenshots for 2 more families.** Cochineal and Passepartout now have their
own captures in both variants, bringing the number of families shown in the
README to 6.

**Two recordings of the whole collection**, one dark and one light, that scroll
the theme picker while VS Code applies each theme live. They sit after every
family and before the section on colouring schemes, so the page is readable
before 20 MB of animation starts loading.

### Changed

- Display name is now **Tapetum Theme**. The extension identity,
  `tuguidragos.tapetum`, and every theme label are unchanged, so no one loses
  their selected theme.
- The README title is now taken from the manifest `displayName`, so the listing,
  the repository and the extension all read **Tapetum Theme**. The audit fails if
  they ever drift apart.
- The 28 palette strip images and the tool that generated them are gone. Real
  screenshots and the colour tables carry the same information without the
  invented graphics.
- README rewritten and now generated. The 6 families that carry screenshots come
  first, in the order Quantum, Cochineal, Fraunhofer, Persistence, Anodise,
  Passepartout. Every family has its story and a full colour table covering all of
  its variants. The reading order is declared separately from the palette order,
  so rearranging the page never touches a theme file.
- The colour key registry is derived from the installed editor on every run
  instead of being a stored list, so it cannot fall behind a VS Code release.
- Indent guide levels 2 to 6 now follow the bracket depth ramp, so nesting reads
  the same way in the gutter as it does in the code.
- The release workflow runs `analyze`, `audit`, `deep`, the snapshot comparison and the APCA self check before packaging, so a
  broken theme cannot reach either registry. The grammar coverage check is
  skipped when VS Code is not installed, which is the case on a build runner.
- The developer tooling runs on macOS, Windows and Linux. It used to have the
  macOS application path written into three files. It now locates VS Code,
  VSCodium and Insiders per platform, including snap and flatpak, and accepts a
  `VSCODE_APP` override.
- This changelog is checked by `tools/audit.mjs`, which fails if the manifest
  version has no entry, if the newest entry is not the manifest version, or if a
  family is missing from it.

## [0.1.0]

First release. 8 themes, 4 families in dark and light, drawn from emission
spectra, oscilloscope phosphors, anodised titanium and solar absorption lines.
Hand placed colours, measured contrast, all 729 known colour keys covered.

- **Quantum**, the emission lines of heated gases
- **Fraunhofer**, the absorption lines in sunlight
- **Persistence**, oscilloscope phosphor decay
- **Anodise**, interference colours on anodised titanium

# MD3 Redesign — Plan

Status: **Approved 2026-10-02. All phases implemented** on branch `feature/md3-redesign` (not yet verified in a browser, see *Verification*). See `REPO_MAP.md` for the discovery facts this plan relies on.

## Decisions (2026-10-02)
* **MD3 is the default, with no setting to turn it off** (answers Q1). The `data-md3` scope still exists, but only to keep the dashboard and wizard isolated.
* All other open questions were delegated to my judgement. I'm using the recommendations in §5: Q2 (a) with fallback (c); Q3 a local setting is **not** added (MD3 is always on, so the spotlight is always shown); Q4 (a); Q5 top app bar; Q6 sectioned layout with section shortcuts (implemented as a non-sticky chip row: sticky positioning breaks inside the page's `overflow-x` containers); Q7 scroller unchanged; Q8 full static look, costly effects off on TV; Q10 manual screenshots.
* **Multiple themes** (Q9): all 6 existing themes are mapped to MD3, and 3 new MD3-native dark themes are added: **Ember**, **Forest** and **Orchid**. Runtime seed picking is not added.
* **No local production builds** (user instruction); CI `build:es-check` remains the ES5 gate.

## Implementation notes (deviations from the original draft)
* The MD3 SCSS layer lives in **`src/styles/md3/`** rather than `src/themes/_md3/`. webpack turns every directory under `src/themes` into a theme entry, so partials there would emit stray CSS files. Themes include it with `@use '../../styles/md3' with ($theme: '<id>')`.
* **No generated TS palette for MUI.** Inside the scope, `styles/md3/_roots.scss` remaps the existing `--jf-palette-*` variables (and their `*Channel` variants) to MD3 roles. MUI components and every legacy theme rule pick up MD3 colors automatically, and the MUI `palette` objects (and so the dashboard) are untouched. `src/themes/md3/overrides.ts` only adds scoped shape/type/elevation overrides.
* The MD3 medium (500) weight uses a Latin-only **"Noto Sans Medium" alias face** read through `--md-sys-typescale-font-medium`. Adding a real 500 face to "Noto Sans" would have changed the dashboard's MUI button text.
* The scope-guard test (`src/styles/md3/md3Scope.test.ts`) landed in R1, together with the first scoped styles.
* `@material/material-color-utilities` is pinned to **0.3.0** because 0.4.0 ships a broken ESM import.

## Progress checklist
- [x] Phase 1: Discovery (`docs/redesign/REPO_MAP.md`)
- [x] Phase 2: Plan (this document)
- [x] R0: Safety net (scope hook, token generator)
- [x] R1: Tokens and theme foundation (+ Ember, Forest, Orchid themes; scope-guard test)
- [x] R2: Navigation shell (MD3 navigation bar on compact screens; top bar, drawer and tabs restyled)
- [x] R3: Cards and rails
- [x] R4: Home (spotlight hero, large library tiles, tonal library buttons)
- [x] R5: Item details (faded full-bleed backdrop, chips, MD3 actions, section shortcuts)
- [x] R6: Video OSD and now-playing bar
- [x] R7: Search, library browsing, favorites, list
- [x] R8: Dialogs, menus, form controls, login, settings
- [x] R9: Hardening (fallback and contrast tests, toast offset, full verification run); MD3 is on by default

## Implementation summary

### Where things live
| What | Where |
|---|---|
| Color role generator (build time) | `scripts/generate-md3-tokens.mjs` → `src/styles/md3/_palettes.generated.scss` |
| Tokens (shape, type, motion, elevation, state) | `src/styles/md3/_tokens.scss` |
| Helpers (`md.color`, `md.shape`, `md.type`, `md.tv`, `md.dir`, …) | `src/styles/md3/_functions.scss` |
| `--md-sys-*` properties and the `--jf-palette-*` remap | `src/styles/md3/_roots.scss` |
| Scoped component styles | `src/styles/md3/components/_{base,navigation,cards,home,details,player,library,forms,dialogs}.scss` |
| Expressive refinements (ambient color, glass, springs, shape morph, page fade) | `src/styles/md3/components/_expressive.scss` (loaded last), `md.glass` / `md.shape-morph` in `_functions.scss`, `glass()` in `src/themes/md3/overrides.ts` |
| Scoped MUI overrides | `src/themes/md3/overrides.ts` (merged in `src/themes/index.ts`) |
| Scope switch | `src/hooks/useMd3Scope.ts` (modern and legacy `AppLayout`; wizard opts out) |
| New components | `apps/modern/components/AppNavigationBar.tsx`, `components/homesections/sections/spotlight.ts`, `components/itemDetails/sectionNav.ts` |
| New themes | `src/themes/{ember,forest,orchid}` + `src/config.json` |
| Medium weight font | `src/styles/noto-sans/medium-500-normal.scss`, `src/styles/fonts.noto.scss` |
| New string | `HeaderSpotlight` (`src/strings/en-us.json`) |
| Accent colors (presets on top of any theme, synced to the account) | `ACCENTS` in the generator → `$accent-schemes`, `src/styles/md3/components/_accents.scss`, `src/scripts/accent.ts`, `src/hooks/useAccent.ts`, `UserSettings.accent` (`appAccent` in the server display preferences, cached locally), pickers in `apps/modern/features/preferences/components/AccentPicker.tsx` and `components/displaySettings` |

To add an accent: add it to `ACCENTS` in the generator and in `src/scripts/accent.ts` (with a translated name), then regenerate.

To add a theme: add its seed to `THEMES` in the generator, run `node scripts/generate-md3-tokens.mjs`, create `src/themes/<id>/{theme.scss,index.ts}`, register it in `src/themes/index.ts`, `src/themes/styles.d.ts` and `src/config.json`.

### Verification
| Check | Result |
|---|---|
| `npm run build:check` (tsc) | ✅ pass |
| `npm test` | ✅ 17 files, **342 tests** (baseline: 12 files, 164 tests) |
| `npm run lint` | ✅ 0 errors, 83 warnings (identical to baseline; all pre-existing) |
| `npm run stylelint` | ✅ pass |
| Production build / `es-check` | ⏭️ not run locally (user instruction). CI `build:es-check` must pass before merge. |
| Visual check in a browser / TV / RTL / dashboard screenshots (§3.1) | ⚠️ **Not done.** There was no Jellyfin server or browser available in this session. All phases still need a manual pass using the §3.1 matrix. |

The automated guards cover what could be verified without a browser:
* `src/styles/md3/md3Scope.test.ts`: every MD3 component rule is under `[data-md3]` (dashboard isolation). Every `var(--md-sys-*)` declaration has a static fallback (old TV browsers). Every theme includes the MD3 layer.
* `src/styles/md3/palettes.test.ts`: WCAG AA contrast for the text/container pairs used, in all 9 themes.
* `src/hooks/useMd3Scope.test.ts`, `spotlight.test.ts`, `sectionNav.test.ts`: behavior of the new code.

### Known limitations and follow-ups
* **No visual QA yet** (see above). Expect spacing and alignment tweaks, especially on the details page (many item types), the switch control, and the legacy TV header.
* Server branding CSS or user custom CSS that targets the same classes may now lose to the scoped MD3 rules (one extra attribute selector of specificity), or need `!important`. Existing `--jf-palette-*` overrides on `:root` are overridden inside the scope.
* Purple Haze and Blue Radiance keep their background images, but legacy surfaces are now opaque MD3 containers rather than the themes' translucent overlays.
* The new themes (Ember, Forest, Orchid) also appear in the admin's *dashboard theme* picker, because the theme list is shared. The default dashboard theme is unchanged.
* The JS scroller animation (`lib/scroller`) still uses its original easing (Q7).
* Glass surfaces use `backdrop-filter`. They fall back to opaque tonal surfaces where it is unsupported and in the TV layout. Heavy use can cost GPU time on low-end desktops, so glass is limited to bars, menus, dialogs, sheets and a few buttons over artwork.
* Runtime dynamic color (seed from artwork or a user-picked seed) is not implemented.

---

## 1. Technical approach

### Facts that drive the decision
1. **Two rendering stacks.** Most of what a user sees (home rails, details, login, OSD, settings pages, dialogs, cards) is **legacy HTML strings with v0 custom elements**, even inside the modern app. Only the modern shell, library pages, display preferences, and search fields are React/MUI.
2. **Old TV browsers.** The targets include Chrome 27, 38, and 47 (no CSS custom properties), and JS must pass an ES5 check. The legacy app (TV layout) runs on those devices.
3. **One MUI `ThemeProvider` and one set of global legacy CSS** is shared with the dashboard and wizard. Only the color scheme is already split (`theme` vs `dashboardTheme`).
4. **Custom CSS compatibility.** Server branding CSS and user CSS target legacy class names and `--jf-palette-*` variables.

### Options evaluated

| Option | Fit for legacy screens | Fit for React screens | Old-TV support | Dashboard isolation | Cost / risk |
|---|---|---|---|---|---|
| **A. Extend the MUI theme with MD3 tokens** | ❌ Does nothing for legacy HTML. Legacy screens would still need a CSS layer. | ✅ Good. Map MD3 roles onto `palette`, `shape`, `typography`, `transitions`; add `styleOverrides` and `variants` (for example `variant="tonal"` buttons). MUI v6 is MD2 at heart, so MD3 behavior (state layers, tonal elevation, MD3 shape) must be hand-built in overrides. | n/a (modern only) | ⚠️ Overrides are global unless scoped. | Medium |
| **B. Google `@material/web`** | ❌ Lit + Custom Elements v1 + Shadow DOM clashes with the v0 `webcomponents.js` polyfill and the `is="emby-*"` customized built-ins. Shadow DOM breaks the focus manager's DOM queries (`querySelectorAll(focusableQuery)`) and custom CSS hooks. | ⚠️ Usable from React only through wrappers. | ❌ No Shadow DOM or CE v1 on Chrome 27/38; modern ES output would need to join the Babel allow-list, and polyfills would be heavy. | ✅ Isolated, but only because it would not be used in shared code. | **High.** The project README also states it is in maintenance mode (verify before relying on this). **Rejected.** |
| **C. Custom CSS-variable token layer + targeted component restyles/rewrites** | ✅ Works directly on the existing classes and elements; keeps D-pad focus behavior and custom-CSS hooks. | ✅ The same tokens feed the MUI theme (A as a sub-part). | ✅ SCSS emits static fallbacks next to `var()` (the pattern the repo already uses). | ✅ All MD3 rules sit under one scope selector (see §4). | Medium. This is the most work, but it is incremental and every step can ship. |

### Recommendation: **C, with A for the React screens**
* **One source of truth:** MD3 tokens generated from seed colors at **build/dev time** into SCSS maps and a TS object. Legacy SCSS and the MUI theme both read from it.
* **Legacy screens:** restyle through SCSS partials keyed on existing class names. Templates change only where needed for structure (hero, detail header, chips), keeping the existing class names on elements so custom CSS keeps working. Legacy JS changes stay limited to presentation (markup strings, class toggles), with no data-flow or playback changes.
* **React screens:** MD3 component overrides on the existing MUI theme, **scoped with an Emotion parent selector** (`'[data-md3] &'`) so the dashboard is unaffected. New components (navigation bar, hero) are written in React only where the host screen is already React (the modern shell). Home and details stay legacy-rendered so the legacy/TV app also benefits.
* **Dynamic color:** `@material/material-color-utilities` is used only as a **devDependency** in a Node generator script, so runtime cost is zero and nothing changes for ES5. Runtime dynamic color (for example a seed taken from a backdrop) is deferred; it would be an optional, lazy-loaded, modern-app-only addition later.
* **Old TVs:** color rules live in the per-theme SCSS layer (as today), so each compiled `theme.css` carries correct static fallbacks for that theme. Shape and motion tokens used in component SCSS get static fallbacks through a mixin. Effects that are costly or unsupported (blur, large scale transforms, gradient masks) are gated by `@supports`, `.layout-tv`, and the existing `browser.slow` checks.

---

## 2. Design token spec

### Location
```
scripts/generate-md3-tokens.mjs          # Node script, uses @material/material-color-utilities (devDependency)
src/themes/_md3/
  _tokens.scss                           # type, shape, elevation, motion, state-layer tokens (theme-independent)
  _palettes.generated.scss               # GENERATED: per-theme color-role maps (dark + light schemes)
  _functions.scss                        # md.color(), md.prop() fallback-emitting mixins, md.type() mixin
  _roots.scss                            # emits --md-sys-* custom properties on :root for the active theme
  _scope.scss                            # the scope selector constant ([data-md3])
  components/*.scss                      # scoped MD3 component rules (buttons, cards, chips, nav, OSD, …)
src/themes/md3/
  tokens.generated.ts                    # GENERATED: same roles for MUI
  muiOverrides.ts                        # scoped MUI component overrides
```
Each `src/themes/<id>/theme.scss` adds `@use '../_md3' with ($seed: …, $mode: …)`, so every theme.css carries its own MD3 roles and static fallbacks. Generated files are committed so builds stay deterministic, and the generator only reruns when a seed changes.

CSS variable naming follows the MD3 convention: `--md-sys-color-*`, `--md-sys-typescale-*`, `--md-sys-shape-corner-*`, `--md-sys-elevation-level*`, `--md-sys-motion-*`. Existing `--jf-palette-*` and `--jf-card-borderRadius` stay defined so existing custom CSS keeps working.

### Seeds per existing theme
User theme selection is preserved: every existing theme is mapped to MD3 roles rather than replaced.

| Theme | Mode | Seed | Notes |
|---|---|---|---|
| dark (default) | dark | `#00a4dc` (current primary) | Dark-first baseline. Neutrals from the seed's neutral palette. |
| light | light | `#00a4dc` | |
| blueradiance, purplehaze, appletv, wmc | per theme | current `$primary-main` / brand color of each theme | Keep background images and signature overrides; MD3 surfaces become translucent where the theme already is. |

Exact hex values are produced by the generator (scheme variant: **TonalSpot**, the MD3 default), recorded in `_palettes.generated.scss`, and reviewed in R1. I am not hand-picking tones.

### Color roles and tone mapping (MD3 standard)
| Role | Dark tone | Light tone |
|---|---|---|
| primary / on-primary | P80 / P20 | P40 / P100 |
| primary-container / on-primary-container | P30 / P90 | P90 / P10 |
| secondary / on-secondary | S80 / S20 | S40 / S100 |
| secondary-container / on-secondary-container | S30 / S90 | S90 / S10 |
| tertiary / on-tertiary | T80 / T20 | T40 / T100 |
| tertiary-container / on-tertiary-container | T30 / T90 | T90 / T10 |
| error / on-error | E80 / E20 | E40 / E100 |
| error-container / on-error-container | E30 / E90 | E90 / E10 |
| surface / on-surface | N6 / N90 | N98 / N10 |
| surface-dim / surface-bright | N6 / N24 | N87 / N98 |
| surface-container-lowest / low / (default) / high / highest | N4 / N10 / N12 / N17 / N22 | N100 / N96 / N94 / N92 / N90 |
| on-surface-variant | NV80 | NV30 |
| outline / outline-variant | NV60 / NV30 | NV50 / NV80 |
| inverse-surface / inverse-on-surface / inverse-primary | N90 / N20 / P40 | N20 / N95 / P80 |
| scrim / shadow | N0 / N0 | N0 / N0 |

Additional app roles, derived and not part of MD3: `star` (keeps `starIcon`), `scrim-gradient` (hero/detail fade: `surface` at 0→100% alpha), `played-indicator` (= primary).

**State layers:** hover 0.08, focus 0.10, pressed 0.10, dragged 0.16 (opacity of the `on-*` color over the container). **TV focus** gets a stronger treatment than MD3's default: a 3px `secondary` focus ring plus the existing scale (on non-slow devices), because the 10-foot UI needs it.

### Type scale
Font stays **Noto Sans** (CJK subsets intact; Roboto is not added). Sizes are in rem so the existing TV font sizing (`fonts.sized.scss`, 20px minimum) keeps working.

| Token | Size / line height (px @16) | Weight | Tracking |
|---|---|---|---|
| display-large / medium / small | 57/64 · 45/52 · 36/44 | 400 | -0.25 · 0 · 0 |
| headline-large / medium / small | 32/40 · 28/36 · 24/32 | 400 | 0 |
| title-large / medium / small | 22/28 · 16/24 · 14/20 | 400 · 500 · 500 | 0 · 0.15 · 0.1 |
| body-large / medium / small | 16/24 · 14/20 · 12/16 | 400 | 0.5 · 0.25 · 0.4 |
| label-large / medium / small | 14/20 · 12/16 · 11/16 | 500 | 0.1 · 0.5 · 0.5 |

⚠️ Only Noto Sans **400 and 700** are bundled. See open question Q4 about weight 500.

### Shape scale
`none` 0 · `extra-small` 4px · `small` 8px · `medium` 12px · `large` 16px · `extra-large` 28px · `full` 9999px.
Usage: cards = medium, chips and text fields = small, buttons = full, dialogs = extra-large, menus = extra-small, hero and library tiles = large. `--jf-card-borderRadius` is redefined to `var(--md-sys-shape-corner-medium)` inside the scope, so custom themes that set it still win.

### Elevation (tonal first)
| Level | Surface used (tonal) | Shadow (only where MD3 requires: menus, dialogs on scrims, FAB, hovered cards) |
|---|---|---|
| 0 | surface | none |
| 1 | surface-container-low | 0 1px 2px rgb(0 0 0 / .3), 0 1px 3px 1px rgb(0 0 0 / .15) |
| 2 | surface-container | 0 1px 2px …, 0 2px 6px 2px … |
| 3 | surface-container-high | 0 1px 3px …, 0 4px 8px 3px … |
| 4 | surface-container-high | 0 2px 3px …, 0 6px 10px 4px … |
| 5 | surface-container-highest | 0 4px 4px …, 0 8px 12px 6px … |

On `.layout-tv`, shadows are dropped and only tonal surfaces and focus rings are used (cheaper to paint).

### Motion
| Token | Value |
|---|---|
| easing-standard | `cubic-bezier(0.2, 0, 0, 1)` |
| easing-standard-decelerate / accelerate | `cubic-bezier(0, 0, 0, 1)` / `cubic-bezier(0.3, 0, 1, 1)` |
| easing-emphasized (CSS approximation) | `cubic-bezier(0.2, 0, 0, 1)` |
| easing-emphasized-decelerate / accelerate | `cubic-bezier(0.05, 0.7, 0.1, 1)` / `cubic-bezier(0.3, 0, 0.8, 0.15)` |
| duration short1–4 | 50 / 100 / 150 / 200 ms |
| duration medium1–4 | 250 / 300 / 350 / 400 ms |
| duration long1–4 | 450 / 500 / 550 / 600 ms |
| duration extra-long1–4 | 700 / 800 / 900 / 1000 ms |

New: `@media (prefers-reduced-motion: reduce)` sets durations to ~0 and disables hover scaling and hero auto-advance. The JS scroller speed (`lib/scroller`) is **not** changed in R1. Changing it is a behavior change, so it gets its own decision (Q7).

### MUI mapping (`src/themes/md3`)
MD3 roles are exposed as `theme.vars.md.*` (custom palette extension, typed in `styles.d.ts`). Overrides are scoped under `[data-md3] &` for `MuiButton` (filled/tonal/outlined/text + new `tonal` variant), `MuiIconButton`, `MuiChip`, `MuiAppBar`, `MuiToolbar`, `MuiDrawer`, `MuiMenu`/`MuiMenuItem`, `MuiDialog`, `MuiTabs`/`MuiTab`, `MuiTextField`/`MuiFilledInput`/`MuiSelect`, `MuiSwitch`, `MuiSlider`, `MuiTooltip`, `MuiSnackbarContent`, `MuiPaper` (tonal elevation), and `MuiBottomNavigation`. **`palette.*` values are not changed**, so dashboard MUI components keep their current colors.

---

## 3. Phased rollout

Every phase: lint, stylelint, `build:check`, tests, plus the manual check matrix (§3.1). **No production build locally, at the user's request**; CI's `build:es-check` is the ES5 gate. One commit (or a small series) per phase; I stop after each phase for your confirmation.

### 3.1 Manual check matrix (run each phase)
Modern desktop (≥1200px) · modern mobile (≤600px) · TV layout (`layout=tv`) using keyboard arrows as D-pad · RTL (Arabic) · light theme · one custom theme (purplehaze) · **dashboard `/dashboard`, `/dashboard/users`, `/metadata`, `/configurationpage`, `/wizard`: before/after screenshots must match.**

### R0: Safety net (no visual change)
* **New:** `scripts/generate-md3-tokens.mjs`; `src/themes/_md3/_scope.scss`; `src/utils/md3Scope.ts` (sets/removes `data-md3` on `<html>`); a scope-guard unit test that compiles `src/themes/_md3/components/*.scss` with `sass` and asserts **every selector starts with the scope selector**; a unit test for the scope toggle.
* **Change:** `apps/modern/AppLayout.tsx` and `apps/legacy/AppLayout.tsx` (add/remove the scope; the legacy layout gets an `isWizard`-style opt-out because the wizard reuses it), `apps/dashboard/AppLayout.tsx` (explicitly clears it on mount), `package.json` (devDependency `@material/material-color-utilities`).
* ~~**Flag:**~~ Superseded: MD3 is always on for the user app (see Decisions).
* **Risk:** low. **Verify:** tests pass; attribute present on user routes, absent on dashboard and wizard (including when navigating back and forth).

### R1: Tokens and theme foundation
* **New:** `_md3/_tokens.scss`, `_functions.scss`, `_roots.scss`, `_palettes.generated.scss`, `themes/md3/tokens.generated.ts`, `themes/md3/muiOverrides.ts`.
* **Change:** each `src/themes/*/theme.scss` (`@use` the MD3 layer with its seed), `themes/index.ts` / `_base/theme.ts` (merge scoped overrides and `md` vars), `themes/styles.d.ts`. Within the scope, base surfaces/text colors are remapped (`html`, `.backgroundContainer`, `.skinHeader`, `.paperList`, `.visualCardBox`, `.formDialogHeader/Footer`, `.toast`, scrollbars), plus focus colors and the `prefers-reduced-motion` block.
* **Risk:** medium (global surfaces). **Verify:** matrix; contrast spot-check of `on-*`/container pairs (≥4.5:1 body text) on dark and light; dashboard unchanged.

### R2: Navigation shell
* **Modern app:**
  * Compact (<600px): new `apps/modern/components/AppNavigationBar.tsx`, an MD3 navigation bar (Home, Libraries menu, Favorites, Search) using existing string keys. It must stack above `nowPlayingBar` (offset handling) and hide on `/video`.
  * Medium+: restyle the top app bar (`AppToolbar`, `UserViewNav`, `UserViewsMenu`) as an MD3 small top app bar with tonal-on-scroll. A navigation rail is optional; see Q5.
  * Drawer → MD3 navigation drawer styling.
  * `components/toolbar/*` is shared with the dashboard, so it is styled only through the scoped overrides, with no prop or behavior changes.
* **Legacy app:** `librarybrowser.scss` header/drawer/tab rules (`.skinHeader`, `.mainDrawer`, `.navMenuOption`, `.emby-tab-button`) restyled under scope as MD3 top bar, drawer, and primary tabs. `libraryMenu.js` is not restructured.
* **Risk:** medium (layout offsets, `noHeaderRight`/`withTabs` padding hacks, D-pad from header into content). **Verify:** matrix; D-pad up/down between header tabs and the first rail on TV.

### R3: Cards and rails
* **Change:**
  * `components/cardbuilder/card.scss` and `_md3/components/_cards.scss`: medium shape, tonal placeholder (`defaultCardBackground*` → container roles), overlay play button as a filled tonal FAB, progress bar in primary, indicators as MD3 badges (`indicators.scss`).
  * Hover (fine pointer only): 1.04 scale + level-2 elevation using emphasized easing. TV keeps `show-focus`/`show-animation` with the ring treatment.
  * `emby-scroller.scss`: `scroll-snap-type: x proximity` and `scroll-padding` on the **native-scroll path only**. The transform (TV) path is unaffected by construction. `emby-scrollbuttons` become MD3 icon buttons.
  * Section titles use the `title-large` style with an MD3 "see all" text button.
  * React `components/cardbuilder/Card/*` gets the same visuals through shared class names (it already renders the legacy class names).
* **No change** to `cardBuilder.js` data logic or `utils/builder.ts` class output (its tests must stay green unchanged).
* **Risk:** medium (cards are everywhere; the dashboard imports `card.scss`, which is why the rules live in the scoped partial and `card.scss` itself only swaps literals for tokens with identical fallback values). **Verify:** matrix; large-library scroll smoothness check on mobile; builder tests unchanged.

### R4: Home
* **Hero / spotlight** (new): `components/homesections/sections/spotlight.ts` + `_md3/components/_hero.scss`.
  * Full-bleed backdrop with gradient fade to `surface`, logo image (falls back to title text in `display-small`), 2–3 line overview, filled **Play** + tonal **More info** buttons. Uses existing `playbackManager.play` and `appRouter.showItem`; no new playback logic.
  * Items come from an **existing** API query (see Q2). Up to 5 items with manual paging dots; auto-advance only on desktop/mobile and never on TV, slow devices, or reduced motion.
  * Rendered above the configured sections (not as a `homesectionN` value, to avoid writing new enum values into server-stored display preferences), controlled by a new local user setting (Q3).
  * Strings: reuse `Play` and `ButtonInfo` (both exist). The only new key is `HeaderSpotlight` (accessible name of the hero region), added to `en-us.json` only. There is no `Libraries` key today, so the R2 navigation bar either reuses `HeaderMyMedia` or adds one key.
* **Library tiles:** `SmallLibraryTiles` restyled as large tonal tiles (backdrop shape, large shape, title-medium label). `LibraryButtons` becomes MD3 tonal buttons.
* **Rails:** Continue Watching / Next Up / Recently Added use R3 styling. Per-library rows already exist via `LatestMedia`.
* **Change:** `homesections.js` (insert hero container), `homesections.scss`, `apps/modern/routes/home.tsx` (only if the hero needs the header to be transparent over it).
* **Risk:** medium-high (first-screen performance, D-pad entry point now the hero's Play button, autoFocus on TV). **Verify:** matrix; TV autofocus lands on Play; Lighthouse-style manual check that the hero backdrop is the only eager image.

### R5: Item details
* Restyle `itemDetails/index.html` regions with `librarybrowser.scss` overrides under scope:
  * `.itemBackdrop` gets a full-bleed MD3 gradient overlay (replaces the hard-coded `rgba(32,32,32,…)` in `apps/modern/AppOverrides.scss`, scoped).
  * `.detailLogo` / title.
  * `itemMiscInfo` rendered as **assist chips** (year, rating, runtime, ends-at), genres as filter-style chips linking to existing genre routes.
  * `.mainDetailButtons`: Play as a filled button with label; secondary actions as tonal icon buttons (same elements and class names, keeping `title`/`aria-label`).
  * Track selectors as MD3 filled selects.
* **Sections vs tabs:** see Q6. Default proposal: keep the vertical sections (Episodes/Seasons, Next Up, Cast & Crew, More Like This, Extras) as MD3-styled sections with R3 rails, and add a **sticky MD3 secondary tab bar of in-page anchors** on desktop/mobile only (TV keeps linear D-pad flow). This avoids restructuring the 2.2k-line controller.
* **Change:** `itemDetails/index.html` (wrapper elements and chip containers), presentation-only parts of `itemDetails/index.js` (markup strings for misc info/genres), `components/mediainfo/mediainfo.js` (chip class names) — **all class names kept**, new ones added.
* **Risk:** high (largest legacy screen, many item types: movie, series, season, episode, person, album, artist, playlist, program, recording). **Verify:** matrix across ≥8 item types; D-pad from Play to sections.

### R6: Video OSD and now-playing bar
* `styles/videoosd.scss`, `_md3/components/_osd.scss`:
  * Scrim gradients top and bottom; MD3 top app bar (already MUI, scoped overrides).
  * Seek bar as an MD3 slider (`emby-slider.scss` under scope: track, active track, handle, value label/chapter bubble).
  * Transport buttons as standard/filled-tonal icon buttons (play/pause filled, large), with the existing `title`/`aria-label` and shortcut hints kept.
  * Up-next dialog, skip-intro button, and stats panel restyled.
* `nowPlayingBar.scss`: MD3 bottom sheet look on surface-container, plus stacking with the R2 navigation bar.
* The `dir="ltr"` on the seek row is kept.
* **No changes** to `playback/video/index.js` logic beyond class names, if any.
* **Risk:** medium (fullscreen, mobile safe areas, TV remote OK/back). **Verify:** matrix + subtitles visibility + chapter thumbnails + keyboard shortcuts (J/K/L, Shift+N/P).

### R7: Search, library browsing, favorites, list
* Search: `SearchFields.tsx` / `searchfields.scss` as an MD3 search bar (full shape, leading icon); suggestions as chips; results via R3 rails.
* Modern library pages: `LibraryToolbar` and filter/sort/view buttons styled as MD3 chips and segmented/icon buttons via scoped overrides; `AlphabetPicker`, `Pagination`.
* Legacy `movies/*`, `shows/*`, `music/*`, `list.html`, and `alphaPicker` restyled through shared classes.
* **Risk:** medium (filter menus are legacy dialogs; done properly in R8). **Verify:** matrix; filters/sort still apply; paging works.

### R8: Dialogs, menus, form controls, login, settings
* `dialoghelper.scss`, `formdialog.scss`, `actionSheet.scss` (MD3 dialog: extra-large shape, surface-container-high, headline-small title, text-button actions; menus at extra-small shape, level 2).
* `toast.scss` as an MD3 snackbar.
* `emby-button`, `emby-input`, `emby-select`, `emby-textarea`, `emby-checkbox`, `emby-radio`, `emby-toggle`, `emby-collapse` restyled **only under scope** (the dashboard and plugin config pages use the same elements, so element SCSS files get token swaps with identical fallbacks only).
* Login / user select: user avatars as large circular tiles, MD3 filled fields, filled sign-in button.
* Settings menu and preference pages, both the modern React ones (MUI overrides) and the legacy HTML ones.
* **Risk:** medium-high (dialogs opened from user pages vs dashboard pages share code; the scope attribute decides). **Verify:** matrix; open the same dialog (for example the action sheet) on a user page and on a dashboard page and compare.

### R9: Hardening and default-on decision
Light theme polish, all 6 themes reviewed, RTL pass, TV pass on a slow-flagged device (or `browser.slow` forced), reduced-motion pass, contrast audit, focus-visible audit, custom-CSS smoke test with a popular community theme. Then you decide whether the flag defaults on (Q1).

---

## 4. Dashboard isolation strategy

1. **One scope attribute.** `data-md3` lives on `<html>`, so it also covers portals, MUI menus and dialogs, legacy dialogs appended to `<body>`, and `renderComponent` roots. It is set by the user `AppLayout`s and removed by the dashboard `AppLayout` and on wizard routes. Because both apps are route-level layouts, a single effect keyed on the location handles transitions in both directions.
2. **All MD3 rules are scoped.**
   * SCSS: `#{$md3-scope} .cardBox { … }` in `src/themes/_md3/components/*`.
   * MUI: `'[data-md3] &': { … }` inside `styleOverrides`.
   * **`palette` and existing component defaults are not modified**, so dashboard MUI rendering is byte-identical.
3. **Shared element SCSS outside the scope** (for example `card.scss`, `emby-button.scss`): only literal→token swaps whose **fallback equals the current literal**, and whose token value outside the scope equals the old value. The old-value variables are defined on `:root`, and the MD3 values only under the scope.
4. **Shared React components** used by the dashboard (`components/toolbar/*`, `OffsetAppBar`, `ResponsiveDrawer`, `UserAvatar`, `ListItemLink`, `Page`, `DrawerHeaderLink`, `Button`/`LinkButton`): no prop, markup, or behavior changes. New looks come from scoped overrides; anything structurally new is a **new component** used only by `apps/modern`.
5. **Automated guard.** The R0 scope-guard test fails CI if any rule in `src/themes/_md3/components` is unscoped.
6. **Manual guard.** Before/after screenshots of dashboard, metadata editor, plugin config page, and wizard every phase.
7. **Wizard.** It reuses `apps/legacy/AppLayout`, which gets an opt-out, so the wizard stays untouched. If you want the wizard to adopt MD3 later, it is a one-line change. (Flagged, as the brief asked.)
8. **Dashboard theme picker.** No new theme ids are added in the default plan, so the dashboard theme list is unchanged. The `--md-sys-*` variables do exist in every theme.css but are unused outside the scope.

---

## 5. Risks and open questions

### Risks
| Risk | Mitigation |
|---|---|
| Custom CSS (branding/user) loses specificity battles because scoped rules add one attribute selector | Keep scoped selectors as shallow as possible; document in release notes; `--jf-*` variables still honored; R9 smoke test with community themes. |
| Old TVs (Chrome 27–47): no `var()`, `gap`, `aspect-ratio`, `:focus-visible`, or `backdrop-filter` | Color rules live in per-theme SCSS with static fallbacks; stylelint + `eslint-plugin-compat` stay on; no `gap` without margin fallbacks; effects are behind `@supports`; CI `es-check` (not run locally per your instruction). |
| D-pad paths change when layout geometry changes (hero, chips, tab bar) | The hero gets a `focuscontainer-x` row; TV skips anchor tabs; manual TV pass each phase. |
| Bottom navigation bar collides with `nowPlayingBar` and `env(safe-area-inset-bottom)` | Explicit stacking offsets in R2/R6; check on iOS Safari. |
| Details page breadth (many item types) | R5 check matrix across item types; changes are additive classes. |
| Performance: hero images, hover elevation on big grids | Hero is the only eager image; `will-change` only on hover; shadows off on TV; reduced motion respected. |
| Upstream churn (Weblate commits daily; the modern app evolves fast) | Small phases, rebase often, no renames of shared files. |
| Local runs skip the production build | Rely on CI `build:es-check`; mention it in each phase summary. |

### Open questions for you
1. **Rollout flag:** should MD3 sit behind an opt-in setting during development (my recommendation: an app setting toggle in Display preferences labelled as experimental, default off, flipped on in R9)? Or should it be on by default from R1?
2. **Hero content source:** which existing query should feed the spotlight? (a) recently added movies + series with backdrops, (b) resume items, (c) random unplayed items from the user's libraries, (d) favorites. I'd pick (a) with a fallback to (c).
3. **Hero placement setting:** OK to add a new *local* user setting `enableHomeSpotlight` (default on when MD3 is on) instead of a new `homesectionN` value, which would be written to server-side display preferences and might confuse other clients?
4. **Font weight 500:** MD3 titles and labels use 500. Options: (a) add Noto Sans 500 for the Latin subset only (small download; CJK falls back to synthesized or 400), (b) map 500→700, (c) map 500→400 with tracking. I'd pick (a).
5. **Navigation on large screens:** keep the restyled top app bar (lower risk, matches today's UX), or add an MD3 navigation rail on ≥ 900px?
6. **Details page:** sectioned layout with sticky in-page anchor tabs (my proposal), or real tabs (Episodes / Cast & Crew / More Like This) that hide inactive content (more controller work, bigger D-pad risk)?
7. **Scroller easing:** may I change the JS scroller animation (`lib/scroller`) to MD3 emphasized easing/duration? It is a small behavior change touching TV scrolling.
8. **TV / legacy app scope:** should the legacy app (TV layout and `*-legacy` modes) get the full MD3 look, or only tokens/colors while the full cinematic treatment (hero auto-advance, hover elevation, blur) stays on the modern app? I'd give it the full static look but none of the costly effects.
9. **New themes:** do you also want a new "Material You" theme with a user-chosen seed color (generated at runtime, so it would need `material-color-utilities` in the browser bundle, about 1 MB unpacked before tree-shaking), or is mapping the 6 existing themes enough for now?
10. **Visual regression tooling:** OK with manual screenshots, or should R0 add Playwright screenshot tests? That is a heavy devDependency and needs a running server, so I recommend against it for now.

---

**Stopping here.** I will not change source files until you approve this plan (edits welcome) and answer or delegate the open questions.

# jellyfin-web — Repository Map for the MD3 Redesign

Discovery snapshot taken at commit `52a0fab12e` (master, package version 13.0.0) on 2026-10-02.
Everything below was verified by reading the source. File paths are relative to the repo root.

---

## 1. Architecture overview

### Build tooling
| Concern | Tool / config |
|---|---|
| Bundler | webpack 5 (`webpack.common.js`, `webpack.dev.js`, `webpack.prod.js`, `webpack.analyze.js`) |
| JS transpile | Babel (`babel.config.js`, preset-env + preset-react) for `src/**/*.{js,jsx}` **and an explicit allow-list of `node_modules` packages** (`webpack.common.js` ~L190–245). Any new runtime dependency that ships modern syntax must be added to that list. |
| TS | `ts-loader` with `transpileOnly`; type checking is separate (`tsc --noEmit`). `tsconfig.json` targets **ES5**, `lib: ES2015`. |
| CSS | Sass (`sass` / optional `sass-embedded`) → `postcss-preset-env` + `autoprefixer` (both driven by `package.json#browserslist`) → `cssnano` (prod; `mergeLonghand` disabled so fallback declarations survive, see `cssnano.config.js`). |
| Themes | Every `src/themes/*/theme.scss` is a **separate webpack entry** (`THEMES_BY_ID`, `webpack.common.js` L36–47) emitted as `themes/<id>/theme.css` by `MiniCssExtractPlugin`, and loaded at runtime with a `<link>` tag. |
| Output check | `es-check` with `ecmaVersion: es5` over `dist/**/*.js` (`.escheckrc`). |
| Tests | Vitest + jsdom (`vite.config.ts`), 12 test files. |
| Node | `.nvmrc` = 24; `engines.node >= 24`. (Local machine: Node 26.5.0, npm 12.0.1.) |

### Frameworks
The app is a **hybrid**:

* **Legacy layer**: plain JS "controllers" plus HTML view templates (`*.html` loaded with `html-loader`, `${Key}` placeholders translated at load time). Rendered through `components/viewManager/ViewManagerPage.tsx` → `viewManager.js` → `viewContainer.js`. It uses **v0 Custom Elements** (`is="emby-button"`, `is="emby-scroller"`, …) built on `Object.create(HTMLButtonElement.prototype)` + `createdCallback`/`attachedCallback`, polyfilled by `webcomponents.js@0.7` (`webcomponents-lite`). It does **not** use Shadow DOM.
* **React 18 layer**: React Router 6 (`createHashRouter`), TanStack Query 5, **MUI 6.5.0** (Emotion). Some React pages still mount legacy controllers inside them (for example, modern `home.tsx` hosts the legacy `hometab.js`/`favorites.js` controllers).
* Bridge: `utils/reactUtils.tsx#renderComponent` mounts React components inside legacy views with a replica of the root context (it uses its own `ThemeProvider` with `disableStyleSheetGeneration`).

### App "experiences" (`src/apps/`)
| App | Path | Purpose | Layout component |
|---|---|---|---|
| **modern** | `src/apps/modern` | React/MUI user UI (top app bar, drawer on small screens, MUI library pages) | `apps/modern/AppLayout.tsx` |
| **legacy** | `src/apps/legacy` | Original user UI (legacy header `scripts/libraryMenu.js`, legacy library pages). Also **hosts most shared user screens' controllers** (home tabs, details, login, settings pages, video OSD) that the modern app reuses. | `apps/legacy/AppLayout.tsx` |
| **dashboard** | `src/apps/dashboard` | Admin dashboard + metadata editor + plugin config pages | `apps/dashboard/AppLayout.tsx` |
| **wizard** | `src/apps/wizard` | First-run setup wizard | **reuses `apps/legacy/AppLayout`** |

### How routing chooses an experience
`src/RootAppRouter.tsx`:

```ts
...(layoutManager.modern ? MODERN_APP_ROUTES : LEGACY_APP_ROUTES),
...DASHBOARD_APP_ROUTES,
...WIZARD_APP_ROUTES,
```

`layoutManager.modern` (`src/components/layoutManager.js`) is `true` unless the layout is one of
`LegacyLayoutModes = { 'desktop-legacy', 'mobile-legacy', 'tv' }` (`src/constants/layoutMode.ts`). So:

| Layout setting | App rendered | `html` class |
|---|---|---|
| auto (non-TV), `desktop`, `mobile`, `modern` | **modern** | `layout-desktop` / `layout-mobile` |
| auto on a TV browser, `tv` | **legacy** | `layout-tv` |
| `desktop-legacy`, `mobile-legacy` | **legacy** | `layout-desktop` / `layout-mobile` |

The router is created once at startup, so changing the layout means reloading the page.

`RootAppLayout` (in `RootAppRouter.tsx`) wraps **all** apps (user, dashboard, wizard) in a single MUI `ThemeProvider` (`themes/index.ts`), plus `<Backdrop />` and `<AppHeader />`. The legacy header DOM (`.skinHeader`, `.mainDrawer`) always exists; it is hidden with `display:none` for modern and dashboard paths.

Route tables:
* Modern: `apps/modern/routes/routes.tsx`, `asyncRoutes/{user,public}.ts`, `legacyRoutes/{user,public}.ts`, special `video/index.tsx`.
* Legacy: `apps/legacy/routes/routes.tsx`, `asyncRoutes/*`, `legacyRoutes/*`.
* Dashboard: `apps/dashboard/routes/routes.tsx` (`/dashboard/*`, `/metadata`, `/configurationpage`), `_asyncRoutes.ts`, `_legacyRoutes.ts`.
* Wizard: `apps/wizard/routes/routes.tsx` (`/wizard/*`).
* Helpers: `components/router/AsyncRoute.tsx` (lazy imports by `AppType`), `components/router/LegacyRoute.tsx` (`ViewManagerPage`).

---

## 2. Component inventory (user-facing screens)

Legend: **M** = used by the modern app, **L** = used by the legacy app (TV + `*-legacy`).

| Screen | Route | Files that render it | Shared elements used |
|---|---|---|---|
| Server select / add server | `/selectserver`, `/addserver` (M+L) | `apps/legacy/controllers/session/selectServer/index.{html,js}`, `session/addServer/index.{html,js}` | cardBuilder-style cards, `emby-input`, `emby-button` |
| **Login / user select** | `/login` (M+L) | `apps/legacy/controllers/session/login/index.{html,js}`, `login.scss` | user cards (`card show-animation`), `emby-input`, `emby-checkbox`, `emby-button.raised.button-submit` |
| Forgot password | `/forgotpassword` (React), `/forgotpasswordpin` (legacy) | `apps/legacy/routes/session/forgotPassword/index.tsx`, `controllers/session/resetPassword/*` | `Page`, `emby-input` |
| Quick connect | `/quickconnect` | `apps/legacy/routes/quickConnect/index.tsx`, `quickConnect.scss` | |
| **Home** (M) | `/home` | `apps/modern/routes/home.tsx` (React shell + `maintabsmanager` tabs) → `apps/legacy/controllers/hometab.js` / `favorites.js` → `components/homesections/homesections.js` + `sections/{libraryTiles,libraryButtons,resume,nextUp,recentlyAdded,liveTv,activeRecordings}.ts` | `emby-scroller`, `emby-itemscontainer`, `cardBuilder.getCardsHtml`, `emby-tabs` |
| **Home** (L) | `/home` | `apps/legacy/controllers/home.{html,js}` + the same `hometab.js` / `favorites.js` / `homesections` | same |
| Favorites | home tab 2 | `apps/legacy/controllers/favorites.js`, `components/favoriteitems.js` | cardBuilder, scroller |
| **Library browsing** (M) | `/movies`, `/tv`, `/music`, `/livetv`, `/books`, `/homevideos`, `/musicvideos`, `/boxsets`, `/playlists`, `/mixed` | `apps/modern/routes/<type>/index.tsx` → `features/libraries/components/LibraryPage.tsx`, `PageTabContent.tsx`, `ItemsView.tsx`, `SuggestionsSectionView.tsx`, `GenresView.tsx`, `UpcomingView.tsx`, `GuideView.tsx`, `ProgramsSectionView.tsx`, toolbar `LibraryToolbar.tsx` + filter/sort/view buttons; tabs defined in `features/libraries/constants/views/*.ts` | **React** `components/cardbuilder/Card/*` (`Cards.tsx`), `components/listview/List/*`, `elements/emby-scroller/Scroller.tsx`, `ItemsContainer.tsx`, `components/common/SectionContainer.tsx`, MUI |
| **Library browsing** (L) | `/movies`, `/tv`, `/music`, `/livetv` | `apps/legacy/controllers/movies/*`, `shows/*`, `music/*`, `livetv/*` (+ `.html`) | `emby-tabs`, cardBuilder, listview, alphaPicker, filter/sort menus |
| Generic list | `/list` (M+L) | `apps/legacy/controllers/list.{html,js}` | cardBuilder, listview, alphaPicker |
| **Item details** | `/details` (M+L) | `apps/legacy/controllers/itemDetails/index.{html,js}` (2.2k lines). Styles mostly in `styles/librarybrowser.scss` (`.itemBackdrop`, `.detailLogo`, `.detailRibbon`, `.detailPagePrimaryContainer`, …) plus `apps/modern/AppOverrides.scss` (mobile backdrop gradient). | `emby-button.detailButton`, `emby-playstatebutton`, `emby-ratingbutton`, `emby-select` track pickers, cardBuilder (episodes, similar, extras), `peoplecardbuilder.js`, `chaptercardbuilder.js`, `listview`, `mediainfo`, `itemContextMenu.js` |
| *(unused)* | — | `apps/modern/features/details/components/buttons/*.tsx` — React detail buttons that nothing imports yet (WIP). | |
| **Search** | `/search` (M+L) | `apps/legacy/routes/search.tsx` → `apps/legacy/features/search/components/{SearchFields,SearchSuggestions,SearchResults,SearchResultsRow}.tsx`, `searchfields.scss` | `SearchResultsRow` wraps legacy `cardBuilder` + `emby-scroller` |
| **Video player + OSD** (M) | `/video` | `apps/modern/routes/video/index.tsx` (MUI top bar via `components/toolbar/AppToolbar`) + legacy `apps/legacy/controllers/playback/video/index.{html,js}` (bottom controls) | `emby-slider` (seek/volume), `paper-icon-button-light`, `styles/videoosd.scss`, `components/upnextdialog`, `playback/skipbutton`, `playerstats`, `subtitlesync`, `iconosd` / `volumeosd` / `brightnessosd` |
| **Video player + OSD** (L) | `/video` | legacy controller only (route `type: 'video-osd'`) | same |
| Now playing bar (audio) | global | `components/nowPlayingBar/nowPlayingBar.{js,scss}` | `emby-slider`, `paper-icon-button-light` |
| Queue / remote control | `/queue` | `apps/legacy/controllers/playback/queue/*`, `components/remotecontrol/*` | listview, slider |
| Lyrics | `/lyrics` | `apps/legacy/controllers/lyrics.*`, `styles/lyrics.scss` | |
| Book / comics / PDF / photo players | n/a | `src/plugins/{bookPlayer,comicsPlayer,pdfPlayer,photoPlayer}` | |
| **User settings menu** | `/mypreferencesmenu` (M+L) | `apps/legacy/routes/user/settings/index.tsx` (React, `LinkButton` list). The modern app hides some entries via `apps/modern/AppOverrides.scss`. | `elements/emby-button/LinkButton` |
| Display prefs (M) | `/mypreferencesdisplay` | `apps/modern/routes/user/display/index.tsx` + `features/preferences/components/*` (MUI forms, **theme + dashboard theme selectors**) | MUI `Select`, `TextField`, `Switch` |
| Display prefs (L) | `/mypreferencesdisplay` | `apps/legacy/controllers/user/display/*` → `components/displaySettings/*` | `emby-select`, `emby-checkbox` |
| Home / playback / subtitles / controls prefs | `/mypreferences{home,playback,subtitles,controls}` | `apps/legacy/controllers/user/*` → `components/homeScreenSettings`, `playbackSettings`, `subtitlesettings` | `emby-select`, `emby-checkbox`, `emby-input`, `emby-slider`, `emby-collapse` |
| Profile | `/userprofile` | `apps/legacy/routes/user/userprofile.tsx` | |
| **Navigation shell** (M) | all | `apps/modern/AppLayout.tsx`, `components/AppToolbar/*` (Search / SyncPlay / RemotePlay buttons, `userViews/UserViewNav.tsx`, `UserViewsMenu.tsx`), `components/drawers/{AppDrawer,MainDrawerContent,DrawerHeaderLink}.tsx`, shared `components/toolbar/{AppToolbar,UserMenuButton,AppUserMenu,ServerButton}.tsx`, `components/OffsetAppBar.tsx`, `components/ResponsiveDrawer.tsx` | MUI `AppBar`/`Toolbar`/`Drawer`/`Menu` |
| **Navigation shell** (L) | all | `scripts/libraryMenu.js` (869 lines; builds `.skinHeader` and `.mainDrawer` HTML), `lib/navdrawer/*`, `components/maintabsmanager.js`, `elements/emby-tabs` | `headroom.js` |
| Dialogs / menus | global | `components/dialogHelper/dialogHelper.{js,scss}`, `components/actionSheet/*`, `components/formdialog.scss`, `prompt`, `confirm`, `alert.js`, `toast`, `itemContextMenu.js`, `playmenu.js`, `sortmenu`, `filtermenu`, `filterdialog`, `viewSettings`. React: `ConfirmDialog.tsx`, `InputDialog.tsx`, `SimpleAlert.tsx` (used only by the dashboard). | |
| Cards | global | Legacy `components/cardbuilder/cardBuilder.js` (1.27k lines, HTML strings) + `utils/builder.ts` (class names, tested) + `card.scss` (885 lines); React `components/cardbuilder/Card/*` | `indicators`, `userdatabuttons`, `blurhash`, `images/imageLoader` |
| Backdrop | global | `components/Backdrop.tsx`, `components/backdrop/backdrop.{js,scss}` (fixed `.backdropContainer`, rotates on non-TV) | |

### Shared `emby-*` custom elements (`src/elements/`)
`emby-button` (+ `paper-icon-button-light`, React `Button`, `LinkButton`), `emby-checkbox`, `emby-collapse`, `emby-input`, `emby-itemrefreshindicator`, `emby-itemscontainer`, `emby-playstatebutton`, `emby-programcell`, `emby-progressbar`, `emby-progressring`, `emby-radio`, `emby-ratingbutton`, `emby-scrollbuttons`, `emby-scroller`, `emby-select`, `emby-slider`, `emby-tabs`, `emby-textarea`, `emby-toggle`. Each has a co-located `.scss`. React wrappers sit next to them (`CheckBoxElement.tsx`, `SelectElement.tsx`, `Scroller.tsx`, `ItemsContainer.tsx`, …).

---

## 3. Styling inventory

### Global styles (imported once in `src/index.jsx`)
`styles/site.scss`, `styles/livetv.scss`, **`styles/dashboard.scss`** (admin styles shipped to every user), `styles/detailtable.scss`, **`styles/librarybrowser.scss`** (1,490 lines: header, drawer, tabs, details page, padding helpers). Fonts are loaded on demand: `fonts.scss` + `fonts.noto.scss` (default), `fonts.sized.scss` (TV, non-Android). `ios.scss` loads only on iOS. Helpers: `_mixins.scss`, `flexstyles.scss`, `scrollstyles.scss`, `rtl.scss`.

### Per-component styles
Co-located `.scss` imported by the JS/TSX module (for example `card.scss`, `listview.scss`, `videoosd.scss`, `nowPlayingBar.scss`, `dialoghelper.scss`, `actionSheet.scss`, `formdialog.scss`, `emby-*/*.scss`). They are bundled through `style-loader` / `MiniCssExtractPlugin` and are **global, unscoped CSS**. App overrides: `apps/modern/AppOverrides.scss`, `apps/dashboard/AppOverrides.scss`.

### Themes (`src/themes/`)
Two parallel systems, kept in sync by hand:

1. **SCSS themes** emitted as `themes/<id>/theme.css`:
   * `_base/_palette.scss` holds the default palette constants.
   * `_base/_theme.scss` (~600 lines) holds `!default` variables (`$background-default`, `$primary-main`, `$surface-overlay`, `$card-borderRadius`, `$appBar-gradient`, …) and **all the color rules for legacy classes**. Every color is written `var(--jf-palette-…, $scss-fallback)`, and some properties are duplicated (`background-color: $x; background-color: rgba(var(--…Channel) / …)`) so browsers without custom properties still work.
   * Theme files: `dark`, `light`, `appletv`, `blueradiance` (+`bg.jpg`), `purplehaze` (+`bg.jpg`, 294 lines, uses `backdrop-filter` under `@supports`), `wmc`. Each `@use '../_base/theme' with (...)` and adds its own rules.
2. **MUI theme** in `themes/index.ts`: `createTheme({ cssVariables: { cssVarPrefix: 'jf', colorSchemeSelector: '[data-theme="%s"]' }, colorSchemes: { appletv, blueradiance, dark, light, purplehaze, wmc } })`, with shared `DEFAULT_THEME_OPTIONS` (typography and component overrides) in `_base/theme.ts`. Per-scheme TS files: `themes/<id>/index.ts`. Helpers: `utils.ts#buildCustomColorScheme`; type augmentation in `styles.d.ts` (`starIcon` palette, custom scheme names).

MUI emits `--jf-palette-*` CSS variables under `[data-theme="<id>"]`. The SCSS themes read those variables, so the MUI scheme is the runtime source of truth and SCSS supplies the fallbacks.

### How a theme is chosen and applied at runtime
1. The theme list comes from `config.json#themes` (`id`, `name`, `color`, `default`), read through `scripts/settings/webSettings` and `hooks/useThemes.ts`.
2. User settings `theme` and `dashboardTheme` (`scripts/settings/userSettings.js` L426–464) are exposed by `hooks/useUserTheme.ts` (fallback `'dark'`).
3. `components/ThemeCss.tsx` is rendered by each `AppLayout`; the dashboard renders `<ThemeCss dashboard />`. It sets `<link href="themes/<id>/theme.css">` and calls `scripts/themeManager.setTheme(id)`.
4. `themeManager` sets `document.documentElement[data-theme]`, updates `<meta id="themeColor">`, and fires `EventType.THEME_CHANGE`.
5. `themes/themeStorageManager.ts` (a custom MUI `StorageManager`) subscribes to that event, which re-selects the MUI color scheme.

**The dashboard already has an independent color scheme** (`dashboardTheme`), but it shares the same MUI theme object, typography, and component overrides, and the same global legacy CSS.

### Customer customization surface (must keep working)
`components/CustomCss.tsx` injects the server **branding Custom CSS** and the per-user custom CSS on user pages (modern and legacy layouts; not the dashboard). Community themes target legacy class names (`.cardBox`, `.skinHeader`, `.detailRibbon`, `.itemBackdrop`, `.emby-button`, …) and the `--jf-palette-*` / `--jf-card-borderRadius` variables. **Renaming these classes or variables would break existing user themes.**

### Hard-coded values that would block a token system
* Colors outside `src/themes` (count of hex/rgba literals): `videoosd.scss` 28, `card.scss` 24, `dashboard.scss` 16, `indicators.scss` 15, `emby-slider.scss` 13, `emby-toggle.scss` 12, `slideshow/style.scss` 12, `librarybrowser.scss` 11, `guide/programs.scss` 8, and about 30 more files with 1–6 each. Hard-coded colors in TSX/JS: `components/indicators/useIndicator.tsx`, `modern/.../FilterButton.tsx`, subtitle appearance helpers (functional, so leave them alone), and some dashboard files.
* `_base/_theme.scss` itself hard-codes the guide program category colors, scrollbar colors, and `.programCell-active`.
* Per-theme hard-coded `.defaultCardBackground1..5` colors (placeholder card backgrounds).
* Shape: `border-radius` is used about 90 times outside themes; only cards are tokenized (`--jf-card-borderRadius`, default `0.2em`). Inputs/selects use `0.2em`, and other radii are ad hoc.
* Elevation: box-shadow literals in `card.scss` (L160, 247, 277) and dialogs.
* Motion: about 70 `transition:`/`animation:` declarations with literal durations/easings (`200ms ease-out` cards, `800ms ease-in` backdrop, scroller `transform ${speed}ms ease-out` set from JS). **No `prefers-reduced-motion` handling anywhere.**
* Typography: about 120 `font-size` declarations; `h1/h2/h3` set in `fonts.scss` and mirrored in MUI `typography`. Only **Noto Sans 400 and 700** are bundled (`styles/noto-sans/*`), with CJK subsets; there is no 500 weight.
* z-index: 68 literal declarations.
* Breakpoints: legacy uses em-based `@media` (for example `50em`, `62.5em`, `80em`, `120em`, …); the modern app uses MUI px breakpoints (600/900/1200/1536) duplicated as SCSS variables in both `AppOverrides.scss` files.

---

## 4. Existing MUI usage

* **Version**: `@mui/material` / `@mui/icons-material` **6.5.0**, `@mui/x-date-pickers` 7.29.4, `material-react-table` 3.2.1 (dashboard tables), with Emotion 11. `theme.vars` / CSS-variables mode is enabled (prefix `jf`).
* **No MD3 support**: MUI v6 implements Material Design 2. There is no native MD3 color-role, tonal-elevation, or shape-scale system, so MD3 has to be layered on through `palette` extensions, `components.styleOverrides`/`variants`, and custom CSS variables.
* **Where it is used** (files importing `@mui/*`): `apps/dashboard` 79, `apps/modern` 59, shared `components/**` about 40 (`common/*`, `cardbuilder/Card/*`, `listview/List/*`, `mediainfo/*`, `toolbar/*`, `ConfirmDialog`, `InputDialog`, `ResponsiveDrawer`, `UserAvatar`, …), `elements/*` React wrappers (6), `themes` (6), `RootAppRouter.tsx`, `utils/reactUtils.tsx`.
* **Shared with the dashboard**: yes. There is one `ThemeProvider` at the root (`RootAppRouter.tsx`), so `DEFAULT_THEME_OPTIONS.components` (for example `MuiButton` defaulting to `variant: 'contained'`, `MuiTextField` defaulting to `variant: 'filled'`) applies to both. Shared React components the dashboard renders: `components/toolbar/AppToolbar` (+ `UserMenuButton`, `AppUserMenu`, `ServerButton`), `OffsetAppBar`, `ResponsiveDrawer`, `UserAvatar`, `ListItemLink`, `Page`, `LoadingComponent`, `apps/modern/components/drawers/DrawerHeaderLink` (imported by the dashboard drawer!), `elements/emby-button/{Button,LinkButton}`, `SectionTitleContainer`, `CheckBoxElement`, `SelectElement`, `MarkdownBox`, `Image`.

---

## 5. Dashboard boundary

### Files owned exclusively by the dashboard (do not touch)
* `src/apps/dashboard/**` (AppLayout, AppOverrides.scss, components, features, routes, controllers).
* `src/components/dashboard/**` (`users/*` forms).
* Admin-only legacy components: `mediaLibraryCreator`, `mediaLibraryEditor`, `libraryoptionseditor`, `directorybrowser`, `channelMapper`, `tvproviders`, `tunerPicker.js`, `accessSchedule`, `imageOptionsEditor`, `scripts/taskbutton.js`, `scripts/editorsidebar.js`, `styles/metadataeditor.scss`.
* `src/styles/dashboard.scss` (although it is loaded globally; some rules such as `.content-primary`, `.localUsers`, `.wizardContent` also affect user and wizard pages).
* `apps/legacy/controllers/edititemmetadata.{html,js}`: the file lives under legacy but is **routed by the dashboard** (`/metadata`, inside the dashboard AppLayout).

### Dashboard routes
`/dashboard`, `/dashboard/*` (28 async routes + `livetv/guide`, `livetv/tuner` legacy), `/metadata`, `/configurationpage` (`ServerContentPage` renders **server-supplied plugin HTML** that relies on legacy classes and `emby-*` elements). All are guarded by `ConnectionRequired level='admin'`.

### Runtime markers available for scoping
* `body.dashboardDocument` is added and removed by `apps/dashboard/AppLayout.tsx` (covers `/dashboard`, `/metadata`, and `/configurationpage`).
* Dashboard legacy pages also have `.type-interior`.
* The dashboard theme is set independently via `dashboardTheme` → `html[data-theme]`.
* `RootAppLayout` computes `isNewLayoutPath` from `DASHBOARD_APP_PATHS`.

### Shared code the dashboard depends on (changes must be scoped)
| Shared module | Dashboard dependency |
|---|---|
| `themes/**` (MUI theme + SCSS theme files) | colors, typography, component overrides |
| `elements/emby-button`, `emby-select`, `emby-checkbox`, `emby-input`, `emby-textarea`, `emby-toggle`, `emby-collapse`, `emby-itemrefreshindicator`, `paper-icon-button-light` | legacy dashboard pages, plugin config pages, metadata editor |
| `components/dialogHelper`, `actionSheet`, `prompt`, `confirm`, `toast`, `loading`, `formdialog.scss`, `refreshdialog`, `imageeditor`, `metadataEditor` | admin dialogs |
| `components/cardbuilder/card.scss`, `components/indicators/indicators.scss`, `styles/flexstyles.scss` | imported by dashboard pages |
| `components/toolbar/*`, `OffsetAppBar`, `ResponsiveDrawer`, `UserAvatar`, `ListItemLink`, `Page`, `LoadingComponent`, `apps/modern/components/drawers/DrawerHeaderLink` | dashboard shell |
| `styles/librarybrowser.scss`, `site.scss` (globals) | layout helpers (`padded-*`, `.content-primary`, page structure) |

### Wizard
The wizard renders inside **`apps/legacy/AppLayout`** with the **user** theme (`ThemeCss` without `dashboard`), and uses `emby-*` elements and `dashboard.scss` `.wizardContent` styles. Any change to the legacy AppLayout or to global legacy element styles reaches the wizard unless it is scoped.

---

## 6. Constraints

### TV / remote (D-pad) focus navigation
* `components/focusManager.js` does **geometric spatial navigation**: `nav()` compares `getBoundingClientRect` boxes. Visibility is tested with `offsetParent !== null` and a non-zero rect. Focus containers are marked by classes (`focuscontainer`, `focuscontainer-x`, `focuscontainer-y`, `focuscontainer-left/right/up/down`) and `.focusable`. **Layout changes change D-pad paths**, and new interactive elements must be real focusable tags or `.focusable`.
* `scripts/keyboardNavigation.js` maps arrows, back, and media keys (uses `keyCode`); `scripts/inputManager.js` dispatches commands (`pageup`, `end`, …); `components/autoFocuser.js` focuses the first item on page load in TV mode.
* `emby-scroller` with `data-centerfocus` keeps focused cards centered. `lib/scroller/index.js` (919 lines) uses **CSS-transform scrolling on TV** (and when `requireAnimation`) and native scrolling otherwise, so **CSS `scroll-snap` has no effect on the transform path**.
* Focus visuals: TV cards get `show-focus` (thick outline) and `show-animation` (`scale(1.07)`) only if `!browser.slow && !browser.edge` (`cardBuilder.js` L46, `utils/builder.ts` L97–98, covered by `builder.test.ts`). `emby-button` adds `show-focus` on TV. Theme `:focus` rules use `--jf-palette-secondary-main`.

### Keyboard navigation (desktop)
Native focus order is used, plus `keyboardNavigation`. MUI components follow their own semantics. The `jsx-a11y` ESLint plugin is enabled for TSX.

### RTL
* `lib/globalize/index.js` sets `dir` on `<html>` and `<body>` for `ar`, `fa`, `ur`, `he`.
* Styles use `[dir="rtl"] &` / `[dir="ltr"] &` blocks (for example `emby-scroller.scss`), and `styles/rtl.scss` mirrors directional icons.
* The transform scroller has an RTL branch for TV (`lib/scroller` L274). The OSD seek row is forced `dir="ltr"`.
* MUI is not configured with `direction: 'rtl'` or an RTL Emotion cache. Modern React screens rely on flex and the logical behavior of MUI components.

### i18n
* 108 locale files in `src/strings/*.json`; `en-us.json` has about 1,942 keys and is the source of truth (Weblate syncs the others).
* JS uses `globalize.translate('Key', ...args)`; HTML templates use `${Key}` placeholders.
* **New UI text requires new keys in `src/strings/en-us.json` only** (other locales come from Weblate).

### Accessibility
* About 447 `aria-*` attributes across templates and components. Icon-only buttons rely on `title` + `aria-label` (for example the OSD buttons) and `aria-hidden` on `.material-icons` spans.
* There is no reduced-motion, forced-colors, or contrast media-query handling today.

### Browser / TV client targets
* `browserslist` includes **Chrome 27, 38, 47, 53, 56, 63**, **Edge 18**, **iOS > 10**, Firefox ESR, plus the last 2 versions of evergreen browsers. These old Chrome versions cover old Tizen and webOS TVs.
* **CSS custom properties need Chrome ≥ 49**, which is why every theme rule carries an SCSS fallback.
* `backdrop-filter`, `aspect-ratio`, `gap` for flexbox (Chrome 84), `:focus-visible` (Chrome 86), `inset`, and `clamp()` are unavailable on part of the target list.
* JS must transpile to ES5 (es-check gate in CI).
* `@material/web` (Lit, Custom Elements v1 + Shadow DOM, modern ES) **does not fit** these targets or the existing v0 custom-element polyfill.

### Performance-sensitive areas
* `browser.slow` disables backdrop animation and focus transforms. `browser.tv` disables backdrop rotation.
* Card HTML is built from strings for large libraries; `emby-itemscontainer` supports virtual-ish lazy loading through `imageLoader.lazyChildren` and `lazyLoader`.
* `backdrop-filter` is used only behind `@supports` (purplehaze) and in `iconosd.scss`.
* The home page loads up to 10 sections at once (11 on TV).
* The Noto CJK font subsets are large; adding a weight multiplies the download.

---

## 7. Test, lint, and build commands — baseline

Baseline run on 2026-10-02 after `npm ci --no-audit --no-fund` (1,768 packages, exit 0, deprecation warnings only).

| Command | What it does | Baseline result |
|---|---|---|
| `npm run build:check` | `tsc --noEmit` | ✅ pass (exit 0, no errors) |
| `npm test` | `vitest --watch=false` | ✅ pass: **12 files, 164 tests** (about 71 s) |
| `npm run lint` | `eslint` (flat config `eslint.config.mjs`) | ✅ exit 0: **0 errors, 83 warnings** (pre-existing; for example `sonarjs/fixme-tag`, `@typescript-eslint/no-deprecated`). About 4 min locally. |
| `npm run stylelint` | `stylelint "src/**/*.{css,scss}"` | ✅ pass (exit 0, no output) |
| `npm run build:production` / `npm run build:es-check` | webpack prod build (+ ES5 check of `dist/**/*.js`) | ⏭️ **Not run, at the user's request.** The production build is excluded from local verification for this project. CI still runs `build:es-check` (`.github/workflows/__quality_checks.yml`). |
| `npm run serve` / `npm start` | webpack dev server | not run (interactive) |
| `npm run build:development` | dev build | not run |

CI (`__quality_checks.yml`) runs this matrix: `build:es-check`, `lint`, `stylelint`, `build:check`, `test`.

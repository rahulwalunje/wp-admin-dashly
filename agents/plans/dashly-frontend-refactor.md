---
name: Dashly frontend refactor
overview: Split the 656-line App.js into focused components, consolidate save/flash state, and fix two latent bugs in MenuOrganizer.
todos:
  - id: phase-1-extract-leaves
    content: "Extract ColorField, MiniPreview, PresetCard into components/"
    status: completed
  - id: phase-2-extract-tabs
    content: "Extract per-tab bodies into tabs/ files"
    status: completed
  - id: phase-3-extract-actions
    content: "Extract sidebar ActionsPanel and move its local state into it"
    status: completed
  - id: phase-4-status-cleanup
    content: "Fold savedFlash into status, remove setTimeout leak"
    status: completed
  - id: phase-5-menu-fixes
    content: "Fix togglePinned ordering and Fragment-key warning in MenuOrganizer"
    status: completed
---

# Dashly frontend refactor

**Complexity:** Medium

## Context

`wp-admin-dashly/src/App.js` has grown to 656 lines — past the 500-line hard ceiling in `CLAUDE.md`. It bundles the top-level data-loading shell, three sub-components (`ColorField`, `MiniPreview`, `PresetCard`), six tab bodies, and a dual-mode sidebar action panel into one function with 14 `useState` calls. The result is hard to read but not actually buggy at the App level.

Two real bugs sit in `MenuOrganizer.js`: `togglePinned` computes the pinned/unpinned boundary from a stale `prev.pinned.length` inside a nested setter, and the `.map` at line 248 returns a bare `<>` Fragment with the `key` placed on a child instead of the iterated element.

Scope: pure presentational refactor (no behavior changes) plus the two MenuOrganizer fixes and one setTimeout leak. No new dependencies, no API changes, no styling changes.

## Decisions

- **Keep `useImperativeHandle` coupling between App and MenuOrganizer.** The exploration considered lifting menu state into App or moving menu actions into the menu tab itself. Both have real downsides (App grows again, or the sidebar action UI becomes inconsistent across tabs). The current ref-based handoff is small (two methods) and works. Revisit if menu actions grow.
- **Tab bodies become components, not a registry/config object.** Each tab gets its own file under `src/tabs/`. A registry would be a speculative abstraction for one consumer.
- **No BC concerns.** This refactor only touches React component internals. No PHP signatures, hook names, REST shapes, `fl-` CSS classes, JS globals, or stored data shapes change. CSS class names rendered into the DOM (`wpad-*`) remain identical so styles in `index.css` keep working untouched.
- **Phase 5 (MenuOrganizer fixes) ships in this PR rather than separately.** They're small, in files we're already touching, and worth fixing while paged in.

## Execution Strategy

**Agents needed:** One.

The phases are sequential but small, each well-specified, and share context (App.js state model). Splitting across agents would force re-reading the same file repeatedly. Total predicted churn is ~10 new files and ~400 net lines moved (not added).

## Reading List

1. `wp-admin-dashly/src/App.js` — current monolith; the source for everything being moved in phases 1–4
2. `wp-admin-dashly/src/MenuOrganizer.js` — phase 5 changes, plus understand the `useImperativeHandle` contract App relies on
3. `wp-admin-dashly/src/index.css` — confirm no class names are renamed; existing `wpad-*` selectors must stay
4. `wp-admin-dashly/CLAUDE.md` (if present) and root `CLAUDE.md` size limits — function 30 / file 300 (hard 500)

## Implementation

### Phase 1: Extract leaf components (Complexity: L)

**Objective:** Move the three sub-components defined at the bottom of App.js into their own files.

**Steps:**
1. Create `src/components/ColorField.js` — copy the function from App.js:550–594 verbatim. Default export.
2. Create `src/components/MiniPreview.js` — copy from App.js:599–621.
3. Create `src/components/PresetCard.js` — copy from App.js:626–656.
4. In App.js, replace the in-file definitions with `import` statements at the top.

**Files:**
- `src/components/ColorField.js` (new, ~50 lines)
- `src/components/MiniPreview.js` (new, ~30 lines)
- `src/components/PresetCard.js` (new, ~40 lines)
- `src/App.js` — remove three function definitions, add three imports

**Verification:** `npm run build` succeeds. Open the settings page; color picker, preset cards, and mini-preview render and behave identically.

### Phase 2: Extract tab bodies (Complexity: L)

**Objective:** Each tab's JSX becomes a small component that receives the slice of state and updaters it needs.

**Steps:**
1. Create `src/tabs/PresetsTab.js` — props: `{ presets, customPresets, activePreset, onApply, onDelete }`. Renders the two preset grids.
2. Create `src/tabs/ColorsTab.js` — props: `{ colors, onUpdate }`. Renders the four `ColorField` rows.
3. Create `src/tabs/TypographyTab.js` — props: `{ typography, fontOptions, onUpdate }`.
4. Create `src/tabs/LayoutTab.js` — props: `{ layout, onUpdate }`.
5. Create `src/tabs/GeneralTab.js` — props: `{ enabled, onChange }`.
6. (Menu tab stays inline — it's already a single `<MenuOrganizer />` call with refs/callbacks.)
7. In App.js, replace the inline tab JSX with `<PresetsTab .../>` etc. The `tab.name === '...'` branches become a small switch or a lookup object.

**Files:**
- `src/tabs/PresetsTab.js` (new, ~50 lines)
- `src/tabs/ColorsTab.js` (new, ~50 lines)
- `src/tabs/TypographyTab.js` (new, ~40 lines)
- `src/tabs/LayoutTab.js` (new, ~30 lines)
- `src/tabs/GeneralTab.js` (new, ~30 lines)
- `src/App.js` — tab body block (lines 250–375) shrinks to a switch + 5 component calls

**Verification:** Each tab renders, controls update prefs, live preview still mirrors changes, dirty badge appears when expected.

### Phase 3: Extract `ActionsPanel` (Complexity: M)

**Objective:** Move the sidebar's dual-mode (menu vs settings) action UI and its local state out of App.

**Steps:**
1. Create `src/components/ActionsPanel.js`. Props: `{ mode, isDirty, status, onSave, onDiscard, onReset, onSaveAsPreset, menuRef, menuDirty, menuSaving }` — exact API to be finalized as the code is moved.
2. Move `confirmReset`, `showSavePreset`, `savePresetName`, `savingPreset` `useState` calls into `ActionsPanel`. They are used only inside this UI.
3. The menu-mode branch (App.js:394–441) and settings-mode branch (App.js:442–540) become two render paths inside `ActionsPanel`, switched on `mode === 'menu'`.
4. App.js renders `<ActionsPanel mode={ activeTab === 'menu' ? 'menu' : 'settings' } ... />`.
5. **Size watch:** if ActionsPanel exceeds ~200 lines, split into `MenuActions.js` and `SettingsActions.js` and have ActionsPanel be a 10-line dispatcher. Decide based on the actual line count after extraction.

**Files:**
- `src/components/ActionsPanel.js` (new, ~150 lines — split if larger)
- Possibly `src/components/MenuActions.js` and `src/components/SettingsActions.js` if split is needed
- `src/App.js` — ~150 lines of JSX + 4 useState calls removed

**Verification:** Save / Discard / Reset / Save-as-preset flows all work in both menu and non-menu tabs. `confirmReset` resets when switching tabs (currently handled by `onSelect` in the TabPanel — preserve that wiring; if confirmReset moves into ActionsPanel, App must call a reset method on a ref or pass the active tab as a prop and use a `useEffect`).

### Phase 4: Consolidate status, remove timeout leak (Complexity: L)

**Objective:** Fold `savedFlash` into `status`; eliminate the unhandled `setTimeout` in `flashSaved`.

**Steps:**
1. Remove the `savedFlash` useState and the `flashSaved` callback.
2. Compute the flash inline: `const showSaved = !status.error && status.savedAt > 0 && Date.now() - status.savedAt < 3000;`. To make the Notice disappear after 3s without user interaction, use a `useEffect` keyed on `status.savedAt` that schedules a no-op state bump (or a simple `useState` mirror) and **returns a cleanup that clears the timeout**.
3. Update the two call sites that previously called `flashSaved()` (after Save and after MenuOrganizer save success) to instead set `status.savedAt = Date.now()`. The `handleSave` already does this; the menu success path needs `setStatus( s => ({ ...s, savedAt: Date.now() }) )` in `onSaveEnd`.

**Files:**
- `src/App.js` — drop one useState, one callback; tweak two effect/render sites

**Verification:** "Saved!" notice appears for ~3s after Save in both menu and non-menu modes. No console warnings. Unmounting the page during the flash window does not throw.

### Phase 5: MenuOrganizer fixes (Complexity: L)

**Objective:** Fix two real bugs.

**Steps:**
1. **Fragment-key fix** (MenuOrganizer.js:248–262): replace `<> ... </>` inside `.map` with `<Fragment key={ slug }>` (import `Fragment` from `@wordpress/element`). Move the inner `key="pinned-divider"` off the divider div since the fragment now carries the key. Alternative: render dividers in a separate pre-pass instead of conditional inside `.map` — pick whichever reads cleaner.
2. **`togglePinned` clarity** (MenuOrganizer.js:150–163): rewrite so the new pinned set and new sortOrder are computed from the same `prev` snapshot. Sketch:
   ```js
   setPrefs( ( prev ) => {
       const wasPinned = prev.pinned.includes( slug );
       const nextPinned = wasPinned
           ? prev.pinned.filter( ( s ) => s !== slug )
           : [ ...prev.pinned, slug ];
       setSortOrder( ( prevOrder ) => {
           const without = prevOrder.filter( ( s ) => s !== slug );
           // After toggle, pinned items occupy positions [0, nextPinned.length).
           // Insert at the boundary when unpinning, prepend when pinning.
           if ( wasPinned ) {
               return [ ...without.slice( 0, nextPinned.length ), slug, ...without.slice( nextPinned.length ) ];
           }
           return [ slug, ...without ];
       } );
       return { ...prev, pinned: nextPinned };
   } );
   ```
   Verify against current behavior with a quick manual test (pin A, pin B, unpin A — order should be `[B, ...others, A's old neighbors]`).

**Files:**
- `src/MenuOrganizer.js` — two small fixes

**Verification:** Pin/unpin items in various orders; pinned block stays at top, divider renders once between pinned and unpinned, no React key warnings in console.

## Testing

There is no test infrastructure in `wp-admin-dashly` (per CLAUDE.md: "No test setup? Don't bootstrap a test framework as part of unrelated work — call it out instead"). Verify manually:

1. `npm run build` (or watch) compiles without errors and without new lint warnings.
2. Load the Dashly settings page in WP admin:
   - All six tabs render and function (presets apply, colors update, font/size changes, radius slider, menu drag/pin/hide/relabel, general toggle).
   - Live preview mirrors every change.
   - "Unsaved changes" badge appears and clears correctly.
   - Save → "Saved!" notice appears for ~3s.
   - Discard reverts state.
   - Reset-to-defaults confirms and resets.
   - Save-as-preset adds a custom preset; delete removes it.
   - Menu tab: drag reorder, pin/unpin, hide/show, rename — all save and survive reload.
3. Open browser console: no React key warnings, no `setState on unmounted component` warnings.
4. Compare DOM class names before/after — `wpad-*` selectors unchanged so `index.css` works untouched.

## Risks / Open Questions

- **`confirmReset` scope when extracting ActionsPanel.** Today App.js resets `confirmReset` on tab switch (`onSelect` in TabPanel). When the state moves into ActionsPanel, the panel needs to know the active tab to reset on change — either via a prop + `useEffect`, or by having App pass a `key={ activeTab }` to force-remount. Prop is cleaner; key-remount is one line. Defer the call until implementation.
- **Phase 3 size estimate.** ActionsPanel could exceed 200 lines once it absorbs the save-as-preset form and confirm-reset UI. The plan calls for a split if that happens — implementer should measure and decide rather than pre-splitting.

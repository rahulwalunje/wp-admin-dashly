---
name: WP Admin Dashly — Phase 2 Menu Organization
overview: Per-user admin menu reorder, hide, relabel, and pin — built on top of the Phase 1 preferences foundation.
todos:
  - id: phase0
    content: "Verify Phase 1 is working (browser test all controls, persistence, two-user isolation)"
    status: pending
  - id: phase1-decisions
    content: "Confirm Phase 2 design decisions (dnd-kit, diff-storage, admin_menu filter)"
    status: completed
  - id: phase2-backend
    content: "Backend: menu introspection endpoint + menu-preferences REST routes + admin_menu hook customizer"
    status: pending
  - id: phase3-frontend
    content: "Frontend: MenuOrganizer React component + Menu tab in App.js"
    status: pending
  - id: phase4-verify
    content: "Verify Phase 2: reorder, hide, relabel, pin — persistence + two-user isolation"
    status: pending
---

# WP Admin Dashly — Phase 2 Menu Organization

**Complexity:** High (cross-cutting: new REST routes, new PHP class, new React component, DnD library)

## Context

Phase 1 (color, font, layout personalization) is built and in the plugin directory at
`wp-content/plugins/wp-admin-dashly/`. The build artifacts exist (`build/index.asset.php`).
Phase 1 must be verified working before Phase 2 begins.

Phase 2 adds per-user admin menu customization: drag-to-reorder, hide/show toggles, custom
labels per item, and pinning favorites to the top. Settings are stored per-user in user_meta
(key: `wpad_menu_preferences`), isolated from other users exactly like Phase 1 preferences.

## Decisions

- **DnD library:** `@dnd-kit` — react-beautiful-dnd was deprecated April 2024; dnd-kit is
  actively maintained, accessible, and has no peer-dependency conflicts with `@wordpress/scripts`.
- **Menu storage:** Diff-against-default (order[], hidden[], labels{}, pinned[]) — full
  ordered arrays break silently when a plugin adds/removes a menu item; diff is additive and
  survives WP upgrades and plugin changes gracefully.
- **Hide method:** `admin_menu` hook (server-side, priority 9999) — truly removes the item,
  survives direct-URL attempts (no capability = redirect), and is cleaner than CSS hiding.
  CSS-only hiding is bypassable and leaves items accessible by URL.

## Execution Strategy

**Agents:** One agent, iterative. Each phase is testable before the next starts.
Run `php -l` on every changed PHP file. Run `npm run build` after every JS change.
Show file-by-file diffs; confirm before large refactors.

---

## Phase 0 — Verify Phase 1 (Complexity: Low)

**Objective:** Confirm the plugin is activated and all Phase 1 controls work correctly in the
browser before building on top of them.

**Steps:**
1. Confirm plugin is active in WP admin (`/wp-admin/plugins.php`)
2. Open "Admin Dashly" settings page (`/wp-admin/admin.php?page=wp-admin-dashly`)
3. Test each control:
   - Four color pickers (accent, sidebar bg, sidebar text, admin bar) — verify live preview
     updates `#wpadminbar` and `#adminmenu` in real time
   - Font family picker — verify font loads (check Network tab for Google Fonts if non-system)
   - Font size slider (12–18px)
   - Border radius slider (0–20px)
   - Master switch (disable/enable all styling)
4. Save → reload → confirm all settings persist
5. Apply each preset (Default, Midnight, Minimal) and verify the UI + preview updates
6. Log in as a second WP user → confirm they see the default styles (not the first user's)
7. Fix anything broken

**Common failure points to watch:**
- REST 401/403 → `X-WP-Nonce` header missing or `wp_rest` nonce not localized correctly
- CSS not applying → specificity fight; may need `!important` on some properties targeting
  `#wpadminbar`, `#adminmenu`, `#adminmenu li.wp-has-submenu`
- Google Fonts not loading → check `font-display: swap` and CORS headers; fallback gracefully
- `build/` missing → run `npm run build` from the plugin root

**Verification:** All controls update the live admin chrome, settings persist across reload,
two users have independent settings.

---

## Phase 1 — Design Decisions (Complexity: Low)

**Objective:** Lock in the three open decisions before writing code. Save rationale.

**Steps:**
1. Confirm DnD library choice: `@dnd-kit` (packages: `@dnd-kit/core`, `@dnd-kit/sortable`,
   `@dnd-kit/utilities`)
2. Confirm storage schema (diff-against-default):
   ```json
   {
     "order": ["slug-a", "slug-b"],
     "hidden": ["slug-c"],
     "labels": { "slug-a": "My Custom Label" },
     "pinned": ["slug-b"]
   }
   ```
3. Confirm hide method: `admin_menu` hook at priority 9999 via `remove_menu_page()` /
   `remove_submenu_page()`
4. Save decisions to `agents/decisions/menu-organization-tradeoffs.md`

**Verification:** Decisions documented and confirmed by user.

---

## Phase 2 — Backend (Complexity: Medium)

**Objective:** Expose the server's actual menu structure via REST, and store/apply per-user
menu preferences.

### Steps

1. **New REST route — `GET /wp-admin-dashly/v1/menu`**
   - Must run inside an `admin_init` context (so `$menu`/`$submenu` are populated)
   - Returns canonical menu items: slug, label, icon, position, capability, children[]
   - Register in `class-wpad-rest-controller.php`

2. **New REST routes — `/wp-admin-dashly/v1/menu-preferences`**
   - `GET` — returns current user's `wpad_menu_preferences` (or empty diff if not set)
   - `POST` — validates and saves the diff; sanitize slugs, labels (sanitize_text_field),
     enforce arrays for order/hidden/pinned

3. **Extend `class-wpad-defaults.php`**
   - Add `get_menu_preference_defaults()` — returns empty diff schema
   - Add `sanitize_menu_preferences( $raw )` — validates slugs against the actual menu,
     strips unknown keys

4. **New class — `class-wpad-menu-customizer.php`**
   - Hook: `admin_menu` at priority 9999
   - Reads current user's `wpad_menu_preferences`
   - Applies: `remove_menu_page()` for hidden items, position re-sort via `$menu` array
     manipulation, relabeling via direct `$menu[$pos][0]` update, pinned items moved to top
   - Must not affect other users

5. **Register new class in `class-wpad-plugin.php`**

6. **PHP lint all changed files:** `php -l includes/class-*.php`

### Files Affected

- `includes/class-wpad-rest-controller.php` — add `/menu` and `/menu-preferences` routes
- `includes/class-wpad-defaults.php` — add menu defaults + sanitizer
- `includes/class-wpad-plugin.php` — instantiate `WPAD_Menu_Customizer`
- `includes/class-wpad-menu-customizer.php` — **new file**

**Verification:** `curl` the `/menu` endpoint (with nonce) and confirm it returns the WP
admin menu structure. POST a diff to `/menu-preferences` and confirm it saves to user_meta.
Hard-reload WP admin and confirm hidden items are gone.

---

## Phase 3 — Frontend (Complexity: Medium)

**Objective:** Add a "Menu" tab to the settings UI with a drag-sortable, hide/show, relabel,
and pin-able list of admin menu items.

### Steps

1. **Install dnd-kit:**
   ```bash
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```

2. **New file — `src/MenuOrganizer.js`**
   - Fetches canonical menu from `/menu` endpoint on mount
   - Fetches user's menu prefs from `/menu-preferences`
   - Merges: apply user order/hidden/labels/pinned onto canonical list
   - Renders:
     - `<DndContext>` + `<SortableContext>` from @dnd-kit/sortable
     - Each item: drag handle, eye toggle (hide/show), inline label edit, pin star
     - Pinned items float to top section, separated by a divider
   - On change: builds updated diff, calls `saveMenuPrefs()` (debounced or on explicit Save)

3. **Extend `src/api.js`:**
   - `getMenu()` — GET `/menu`
   - `getMenuPrefs()` — GET `/menu-preferences`
   - `saveMenuPrefs( diff )` — POST `/menu-preferences`

4. **Extend `src/App.js`:**
   - Add "Menu" tab alongside existing tabs
   - Lazy-load `MenuOrganizer` (only fetch menu data when tab is active)

5. **Live preview note:** Menu changes cannot live-preview (the editor is in the admin menu
   itself). Show a `<Notice status="info">Reload the page to see menu changes.</Notice>`
   after saving.

6. **`npm run build` after each JS change**

### Files Affected

- `src/MenuOrganizer.js` — **new file**
- `src/api.js` — add 3 menu API functions
- `src/App.js` — add Menu tab, import MenuOrganizer
- `package.json` / `package-lock.json` — dnd-kit dependencies

**Verification:** Menu tab renders the current user's admin menu. Drag to reorder, toggle
hide, edit a label, pin an item → save → reload → changes persist. Second user sees their
own (default) menu.

---

## Phase 4 — Verify Phase 2 (Complexity: Low)

**Objective:** Full acceptance test of Phase 2 features.

**Steps:**
1. Reorder menu items → save → reload → confirm order matches
2. Hide an item → save → reload → item absent from admin menu
3. Try accessing hidden item's direct URL → confirm redirect (not just hidden)
4. Edit a label → save → reload → label updated in admin menu
5. Pin an item → save → reload → item appears pinned at top
6. Log in as second user → confirm they see default unmodified menu
7. Deactivate plugin → confirm admin menu returns to default (customizer hook unregistered)
8. Reactivate → confirm saved preferences are restored

**Verification:** All 8 checks pass. No JS console errors. No PHP errors in debug.log.

---

## Testing Reference

```bash
# PHP lint
php -l includes/class-wpad-menu-customizer.php
php -l includes/class-wpad-rest-controller.php
php -l includes/class-wpad-defaults.php
php -l includes/class-wpad-plugin.php

# JS build
cd wp-admin-dashly && npm run build

# Quick REST test (replace NONCE and COOKIE from browser DevTools)
curl -s \
  -H "X-WP-Nonce: <nonce>" \
  -H "Cookie: <wp_cookie>" \
  http://localhost/wp-json/wp-admin-dashly/v1/menu | jq .
```

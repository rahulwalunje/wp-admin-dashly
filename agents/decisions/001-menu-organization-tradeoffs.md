# Decision: Phase 2 Menu Organization — Key Design Choices

Date: 2026-05-01
Status: Decided

## Context

Phase 2 adds per-user admin menu customization (reorder, hide, relabel, pin). Three
architectural choices had meaningful tradeoffs and were discussed before implementation.

---

## Decision 1: Drag-and-Drop Library

**Chosen:** `@dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)

### Options Considered

1. **@dnd-kit** — Modern, actively maintained, accessible (ARIA), no peer-dependency
   conflicts with `@wordpress/scripts`. Modular — only pull in what's needed.
2. **react-beautiful-dnd** — Familiar API, but deprecated by Atlassian in April 2024.
   No longer receives bug fixes or security patches.

### Decision

`@dnd-kit`. react-beautiful-dnd is effectively dead; building on it now creates a
maintenance burden with no path forward. dnd-kit is the community-endorsed successor.

### Consequences

- `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` required before Phase 3
- Slightly more verbose setup than react-beautiful-dnd (manual sensor config), but
  better long-term and already well-documented

---

## Decision 2: Menu Preference Storage Format

**Chosen:** Diff-against-default

```json
{
  "order":  ["slug-a", "slug-b"],
  "hidden": ["slug-c"],
  "labels": { "slug-a": "My Custom Label" },
  "pinned": ["slug-b"]
}
```

Stored in user_meta key: `wpad_menu_preferences`

### Options Considered

1. **Diff-against-default** — Store only what the user changed. `order` is the desired
   position sequence; `hidden` is a list of slugs to remove; `labels` overrides display
   names; `pinned` floats items to the top.
2. **Full ordered array** — Store every menu item in the user's desired order.

### Decision

Diff-against-default. A full ordered array breaks silently whenever WordPress core or
a plugin adds/removes a menu item between saves. A diff is additive: new items appear
in their default positions and unknown slugs in the diff are simply ignored, so the
menu degrades gracefully across WP and plugin upgrades.

### Consequences

- The `/menu` endpoint must return the canonical menu on every request so the frontend
  can merge the diff onto it at render time
- Sanitizer must validate slugs against the live menu, stripping stale entries

---

## Decision 3: Hide Method

**Chosen:** `admin_menu` hook (server-side) via `remove_menu_page()` / `remove_submenu_page()`

### Options Considered

1. **`admin_menu` hook at priority 9999** — Truly removes the item from WordPress's
   internal menu registry. Direct URL access is denied (capability check redirects).
   Clean, no markup residue.
2. **CSS `display: none`** — Client-side only. Item is visually hidden but still
   accessible by direct URL. Screen readers and keyboard navigation can still reach it.
   Bypassable by anyone who knows the URL.

### Decision

`admin_menu` hook. CSS hiding is not real access control — it only hides the link.
Server-side removal ensures the item is truly gone for that user. Combined with WP's
capability checks, direct URL access will redirect as expected.

### Consequences

- The customizer must hook into `admin_menu` at priority 9999 (after all plugins
  have registered their items) to ensure the full menu is available before filtering
- Hook must be per-user (read current user's prefs inside the callback); must not
  affect other users

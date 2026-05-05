---
name: Extract Custom_Presets Storage Class
overview: Move custom-preset user-meta access out of REST_Controller into a dedicated Custom_Presets class that mirrors the existing Preferences pattern.
todos:
  - id: create-class
    content: "Create includes/class-wpad-custom-presets.php with get/save/delete static methods"
    status: completed
  - id: wire-loader
    content: "require_once the new class in wp-admin-dashly.php"
    status: completed
  - id: refactor-controller
    content: "Replace inline user-meta access in REST_Controller with Custom_Presets calls; relocate MAX limit constant"
    status: completed
  - id: verify
    content: "Manually verify the four custom-preset paths (load, save, hit limit, delete) and confirm no public surfaces changed"
    status: pending
---

# Extract Custom_Presets Storage Class

**Complexity:** Low

## Context

`REST_Controller` currently does its own `get_user_meta` / `update_user_meta` calls against the `wpad_custom_presets` key in three places ([class-wpad-rest-controller.php:227](includes/class-wpad-rest-controller.php:227), [:248](includes/class-wpad-rest-controller.php:248), [:260](includes/class-wpad-rest-controller.php:260)). The main `wpad_preferences` blob is already encapsulated by `Preferences` ([class-wpad-preferences.php](includes/class-wpad-preferences.php)). The asymmetry is exactly the duplicate-abstraction smell flagged in exploration: same shape of code, three call sites, two storage patterns for related per-user data.

This refactor introduces a `WPAdminDashly\Custom_Presets` class that owns the `wpad_custom_presets` user-meta key and exposes the three operations REST needs: get-for-user, save-named-preset (with limit check), delete-by-id. `REST_Controller` becomes a thin routing layer for this concern. No REST shapes, meta keys, or visible behavior change.

## Decisions

- **Mirror the `Preferences` pattern (static methods, single user-meta key per class).** — Already established in the codebase; introducing a different pattern (e.g., instances, repository interface) would itself be a duplicate abstraction. Static methods are how this codebase persists per-user data.
- **Keep `MAX_CUSTOM_PRESETS = 25` as a class constant on `Custom_Presets`, not on `REST_Controller`.** — The limit is a property of the storage, not of the API surface. REST returns the user-facing error, but the cap belongs with the data.
- **Return `WP_Error` from `save()` on limit hit; do not throw.** — Matches the existing convention in `Preferences::save_for_user()`. REST controller passes errors through unchanged.
- **No DB migration, no meta-key rename.** — `wpad_custom_presets` stays as-is. `uninstall.php:18` already references it; nothing to change there.
- **BC surface preserved:** REST routes (`POST /custom-presets`, `DELETE /custom-presets/{id}`), request bodies, response shapes (`{ id, custom_presets }` and `{ custom_presets }`), error codes (`missing_name`, `preset_limit_reached`, `not_found`), and the `wpad_custom_presets` user-meta key are all unchanged.

## Execution Strategy

**Agents needed:** One.

Scope is small (one new ~80-line file, edits to two existing files), well-specified, with no cross-cutting risk. A single agent pass is appropriate.

## Reading List

1. [includes/class-wpad-preferences.php](includes/class-wpad-preferences.php) — the pattern to mirror (static `get_for_user` / `save_for_user`, returning `WP_Error` on failure, sanitization done inside the storage class).
2. [includes/class-wpad-rest-controller.php:188-262](includes/class-wpad-rest-controller.php:188) — the three methods being slimmed down: `save_custom_preset`, `delete_custom_preset`, `get_custom_presets_for_user`. Note the current ID generation (`'custom_' . sanitize_title( $name ) . '_' . time()`) and limit check.
3. [wp-admin-dashly.php:30-37](wp-admin-dashly.php:30) — where new class files get `require_once`'d. Order matters: `Defaults` and `Preferences` must load before `Custom_Presets` (for `Preferences::sanitize` reuse).
4. [uninstall.php](uninstall.php) — confirms the meta key being preserved; no changes needed but verify the key string still matches.

## Implementation

### Steps

1. **Create `includes/class-wpad-custom-presets.php`.**
   New class `WPAdminDashly\Custom_Presets` with:
   - `const MAX_PRESETS = 25;` (renamed from `MAX_CUSTOM_PRESETS` to drop the redundant prefix inside the class).
   - `const META_KEY = 'wpad_custom_presets';` — single source of truth for the meta key string.
   - `public static function get_for_user( $user_id ): array` — replaces `REST_Controller::get_custom_presets_for_user()`. Returns `[]` when meta is missing or non-array.
   - `public static function save( $user_id, string $name, array $raw_preferences )` — sanitizes name (`sanitize_text_field`), validates non-empty, calls `Preferences::sanitize()` on the prefs, enforces the limit, generates the ID with the same `'custom_' . sanitize_title( $name ) . '_' . time()` formula, persists, and returns `[ 'id' => $id, 'custom_presets' => $presets ]`. Returns `WP_Error` for `missing_name` or `preset_limit_reached`.
   - `public static function delete( $user_id, string $id )` — returns `[ 'custom_presets' => $presets ]` on success, `WP_Error( 'not_found', ... )` if the ID isn't present.

2. **Wire the loader.**
   Add `require_once WPAD_PLUGIN_DIR . 'includes/class-wpad-custom-presets.php';` in `wp-admin-dashly.php` between the `Preferences` and `REST_Controller` requires (so it's available when REST handlers run).

3. **Slim down `REST_Controller`.**
   - Delete `MAX_CUSTOM_PRESETS` constant and `get_custom_presets_for_user()` method.
   - `get_presets()`: replace `$this->get_custom_presets_for_user( get_current_user_id() )` with `Custom_Presets::get_for_user( get_current_user_id() )`.
   - `save_custom_preset()`: collapse the body to: read `name` and `preferences` from request, call `Custom_Presets::save( $user_id, $name, $preferences )`, return its result (passing `WP_Error` through `is_wp_error` check, otherwise `rest_ensure_response`). The error messages and codes move into `Custom_Presets::save()` so REST stays thin.
   - `delete_custom_preset()`: collapse to `Custom_Presets::delete( get_current_user_id(), $request->get_param( 'id' ) )` with the same `is_wp_error` / `rest_ensure_response` pattern.

4. **Verify file sizes.** After the change, `class-wpad-rest-controller.php` should drop from 344 → ~270 lines (back under the 300-line ceiling). New `class-wpad-custom-presets.php` should land at ~80 lines.

### Files Affected

- `includes/class-wpad-custom-presets.php` — **new**, ~80 lines.
- `includes/class-wpad-rest-controller.php` — remove `MAX_CUSTOM_PRESETS` const, remove `get_custom_presets_for_user()`, simplify `save_custom_preset()` and `delete_custom_preset()`, update `get_presets()` call site. Net -~70 lines.
- `wp-admin-dashly.php` — add one `require_once` line.

### Files NOT changed (intentional)

- `uninstall.php` — meta key string unchanged.
- `class-wpad-preferences.php` — sanitizer is reused as-is via `Preferences::sanitize()`.
- `class-wpad-defaults.php` — out of scope for this slice.
- Any JS — REST shapes are identical.

## Testing

No automated test suite exists in this plugin. Manual verification path:

1. **Load presets tab** → built-in + custom presets render. Network: `GET /wp-admin-dashly/v1/presets` returns the same `{ presets, custom_presets, font_families }` shape as before.
2. **Save current settings as a custom preset** with a name like "Test 1" → success response `{ id: 'custom_test-1_<timestamp>', custom_presets: { ... } }`. Reload page; preset persists and appears under "Your presets".
3. **Hit the limit:** with 25 custom presets saved, try to save a 26th → 400 with `preset_limit_reached` code and the same translated message.
4. **Empty name:** submit blank name → 400 with `missing_name`.
5. **Delete:** remove a custom preset → 200 with `{ custom_presets }`. Try deleting a non-existent ID via curl → 404 `not_found`.
6. **DB check:** `wp user meta get <id> wpad_custom_presets` shows the same array shape pre and post refactor.

## Risks / Open Questions

- None. The change is mechanical and the public surface is fully preserved. `Preferences::sanitize()` is already being called on stored preset preferences in the current code, so no behavior shifts there either.

---

## Self-critique

- **Architectural seams:** Adds one new class file. Justified — it's not a new layer, it's the same storage pattern `Preferences` already uses, applied consistently. No new dependency, no new pattern.
- **Phase discipline:** No future-proofing. I considered also extracting `Menu_Preferences` in this plan but deferred — that's a separate slice per the "one area at a time" rule.
- **BC surface:** REST routes, payloads, error codes, meta-key string, and `uninstall.php` cleanup all preserved. Documented in Decisions.
- **Size prediction:** New file ~80 lines (well under 300). REST controller drops back under the soft ceiling. No file approaches the limits.

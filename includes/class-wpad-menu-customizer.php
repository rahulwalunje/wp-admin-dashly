<?php
/**
 * Applies per-user menu preferences to the WordPress admin menu.
 *
 * Hooked to admin_menu at priority 9999 so it runs after all plugins have
 * registered their items. Only affects the currently logged-in user.
 *
 * @package WPAdminDashly
 */

namespace WPAdminDashly;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Menu_Customizer {

	/**
	 * Apply the current user's menu diff to the global $menu / $submenu.
	 * Called on admin_menu at priority 9999.
	 */
	public function apply() {
		if ( ! is_user_logged_in() ) {
			return;
		}

		$prefs = get_user_meta( get_current_user_id(), 'wpad_menu_preferences', true );
		if ( ! is_array( $prefs ) ) {
			return;
		}

		$hidden = isset( $prefs['hidden'] ) && is_array( $prefs['hidden'] ) ? $prefs['hidden'] : array();
		$labels = isset( $prefs['labels'] ) && is_array( $prefs['labels'] ) ? $prefs['labels'] : array();
		$order  = isset( $prefs['order'] ) && is_array( $prefs['order'] ) ? $prefs['order'] : array();
		$pinned = isset( $prefs['pinned'] ) && is_array( $prefs['pinned'] ) ? $prefs['pinned'] : array();

		$this->apply_hidden( $hidden );
		$this->apply_labels( $labels );
		$this->apply_order( $order, $pinned );
	}

	/**
	 * Remove hidden menu items using remove_menu_page().
	 * This truly removes capability, so direct URL access is also blocked.
	 *
	 * @param string[] $hidden Slugs to hide.
	 */
	private function apply_hidden( $hidden ) {
		foreach ( $hidden as $slug ) {
			remove_menu_page( sanitize_text_field( $slug ) );
		}
	}

	/**
	 * Replace menu labels for items that have a custom label saved.
	 *
	 * @param array $labels Map of slug => custom label.
	 */
	private function apply_labels( $labels ) {
		global $menu;

		if ( empty( $labels ) || ! is_array( $menu ) ) {
			return;
		}

		foreach ( $menu as $pos => $item ) {
			$slug = $item[2];
			if ( isset( $labels[ $slug ] ) ) {
				// Strip existing notification bubbles before replacing the label.
				$menu[ $pos ][0] = esc_html( $labels[ $slug ] );
			}
		}
	}

	/**
	 * Re-sort $menu according to the user's saved order array, with pinned
	 * items moved to the very top.
	 *
	 * WP stores menu items as $menu[ $position ] = $item_array. We rebuild
	 * the position keys so the order matches what the user set.
	 *
	 * @param string[] $order  Ordered list of slugs (full user-defined order).
	 * @param string[] $pinned Slugs to pin to the top.
	 */
	private function apply_order( $order, $pinned ) {
		global $menu;

		if ( empty( $order ) && empty( $pinned ) ) {
			return;
		}

		if ( ! is_array( $menu ) ) {
			return;
		}

		// Index existing items by slug for quick lookup.
		$by_slug = array();
		foreach ( $menu as $item ) {
			if ( ! empty( $item[2] ) ) {
				$by_slug[ $item[2] ] = $item;
			}
		}

		$new_menu   = array();
		$position   = 2; // Start after the WP Dashboard separator.

		// Pinned items first.
		foreach ( $pinned as $slug ) {
			if ( isset( $by_slug[ $slug ] ) ) {
				$new_menu[ $position ] = $by_slug[ $slug ];
				unset( $by_slug[ $slug ] );
				$position += 2;
			}
		}

		// Add separator after pinned block if there were any.
		if ( ! empty( $pinned ) ) {
			$new_menu[ $position ] = array( '', 'read', 'separator-wpad-pinned', '', 'wp-menu-separator' );
			$position             += 2;
		}

		// User-ordered items next (skip already-placed pinned items).
		foreach ( $order as $slug ) {
			if ( isset( $by_slug[ $slug ] ) ) {
				$new_menu[ $position ] = $by_slug[ $slug ];
				unset( $by_slug[ $slug ] );
				$position += 2;
			}
		}

		// Remaining items that weren't in the saved order (new plugins, etc.).
		foreach ( $by_slug as $item ) {
			$new_menu[ $position ] = $item;
			$position             += 2;
		}

		$menu = $new_menu; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
	}
}

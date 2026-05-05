<?php
/**
 * Admin settings page registration & React mount.
 *
 * @package WPAdminDashly
 */

namespace WPAdminDashly;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Admin_Page {

	const MENU_SLUG = 'wp-admin-dashly';

	/**
	 * Snapshot of $menu / $submenu captured BEFORE our customizer runs.
	 * Populated by capture_raw_menu() hooked at admin_menu priority 100.
	 */
	private $raw_menu    = array();
	private $raw_submenu = array();

	/**
	 * Snapshot the global $menu/$submenu before our Menu_Customizer modifies them.
	 * Hooked to admin_menu at priority 100 (customizer runs at 9999).
	 */
	public function capture_raw_menu() {
		global $menu, $submenu;
		$this->raw_menu    = is_array( $menu )    ? $menu    : array();
		$this->raw_submenu = is_array( $submenu ) ? $submenu : array();
	}

	public function register_menu() {
		add_menu_page(
			__( 'Admin Dashly', 'wp-admin-dashly' ),       // Page title.
			__( 'Admin Dashly', 'wp-admin-dashly' ),       // Menu title.
			'read',                                        // Any logged-in user.
			self::MENU_SLUG,
			array( $this, 'render_page' ),
			'dashicons-art',
			81
		);
	}

	public function render_page() {
		// React mounts here. Anything inside is a fallback for the no-JS case.
		?>
		<div class="wrap">
			<div id="wpad-root">
				<p><?php esc_html_e( 'Loading WP Admin Dashly…', 'wp-admin-dashly' ); ?></p>
			</div>
		</div>
		<?php
	}

	public function enqueue_assets( $hook_suffix ) {
		// Only on our own page.
		if ( 'toplevel_page_' . self::MENU_SLUG !== $hook_suffix ) {
			return;
		}

		$asset_file = WPAD_PLUGIN_DIR . 'build/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			// Build hasn't been run yet. Show a friendly notice instead of a blank screen.
			add_action(
				'admin_notices',
				static function () {
					echo '<div class="notice notice-error"><p>';
					echo esc_html__( 'WP Admin Dashly: assets not built. Run "npm install && npm run build" inside the plugin directory.', 'wp-admin-dashly' );
					echo '</p></div>';
				}
			);
			return;
		}

		$asset = include $asset_file;

		wp_enqueue_script(
			'wpad-app',
			WPAD_PLUGIN_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		// CSS bundle (emitted by @wordpress/scripts when there are imported .css/.scss files).
		$css_file = WPAD_PLUGIN_DIR . 'build/index.css';
		if ( file_exists( $css_file ) ) {
			wp_enqueue_style(
				'wpad-app',
				WPAD_PLUGIN_URL . 'build/index.css',
				array( 'wp-components' ),
				$asset['version']
			);
		}

		// Pass bootstrap data to the React app.
		wp_localize_script(
			'wpad-app',
			'WPAD_BOOT',
			array(
				'restNamespace' => WPAD_REST_NAMESPACE,
				'restUrl'       => esc_url_raw( rest_url( WPAD_REST_NAMESPACE ) ),
				'nonce'         => wp_create_nonce( 'wp_rest' ),
				'currentUser'   => array(
					'id'           => get_current_user_id(),
					'display_name' => wp_get_current_user()->display_name,
				),
				// $menu and $submenu are populated at this point (admin_enqueue_scripts
				// fires after admin_menu). Pass them directly so the React app doesn't
				// need a separate REST round-trip that would find them empty.
				'adminMenu'     => $this->build_menu_for_js(),
			)
		);

		// Set translations (no-op if no .mo files yet; future-proof).
		wp_set_script_translations( 'wpad-app', 'wp-admin-dashly' );
	}

	/**
	 * Serialize the current user's visible admin menu into a flat array
	 * suitable for JSON / wp_localize_script.
	 *
	 * Must be called from admin_enqueue_scripts (after admin_menu) so that
	 * the global $menu and $submenu are already populated.
	 *
	 * @return array
	 */
	private function build_menu_for_js() {
		// Use the pre-customization snapshot so hidden items are still included —
		// the user needs to see them in the organizer to be able to re-enable them.
		$menu    = $this->raw_menu;
		$submenu = $this->raw_submenu;

		$items = array();

		if ( empty( $menu ) ) {
			return $items;
		}

		foreach ( $menu as $position => $item ) {
			// Skip separators — they carry 'wp-menu-separator' in their CSS class (index 4).
			if ( isset( $item[4] ) && false !== strpos( $item[4], 'wp-menu-separator' ) ) {
				continue;
			}

			// Skip items with an empty slug or empty capability.
			if ( empty( $item[2] ) || empty( $item[1] ) ) {
				continue;
			}

			// Skip items the current user cannot access.
			if ( ! current_user_can( $item[1] ) ) {
				continue;
			}

			$slug  = $item[2];
			// Remove notification bubbles with their content first (e.g. "Comments <span>5</span>"),
			// then strip any remaining tags. Order matters: wp_strip_all_tags removes tags but
			// keeps inner text, so the regex must run on the raw string first.
			$label = preg_replace( '/<span[^>]*>.*?<\/span>/si', '', $item[0] );
			$label = trim( wp_strip_all_tags( $label ) );
			$icon  = isset( $item[6] ) ? $item[6] : '';

			$children = array();
			if ( isset( $submenu[ $slug ] ) && is_array( $submenu[ $slug ] ) ) {
				foreach ( $submenu[ $slug ] as $sub_item ) {
					if ( empty( $sub_item[1] ) || ! current_user_can( $sub_item[1] ) ) {
						continue;
					}
					$children[] = array(
						'slug'  => $sub_item[2],
						'label' => wp_strip_all_tags( $sub_item[0] ),
					);
				}
			}

			$items[] = array(
				'slug'     => $slug,
				'label'    => $label,
				'icon'     => $icon,
				'position' => (int) $position,
				'children' => $children,
			);
		}

		return $items;
	}
}

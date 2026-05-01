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
			)
		);

		// Set translations (no-op if no .mo files yet; future-proof).
		wp_set_script_translations( 'wpad-app', 'wp-admin-dashly' );
	}
}

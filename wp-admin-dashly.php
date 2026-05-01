<?php
/**
 * Plugin Name: WP Admin Dashly
 * Plugin URI: https://www.wpbeaverbuilder.com/			
 * Description: Personalize your WordPress admin — colors, fonts, layout, and menu organization, saved per user.
 * Version: 1.0.0
 * Author: The Rahul Walunje
 * Author URI: https://www.wpbeaverbuilder.com/
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wp-admin-dashly
 *
 * @package WPAdminDashly
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

// Plugin constants.
define( 'WPAD_VERSION', '1.0.0' );
define( 'WPAD_PLUGIN_FILE', __FILE__ );
define( 'WPAD_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WPAD_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'WPAD_USER_META_KEY', 'wpad_preferences' );
define( 'WPAD_REST_NAMESPACE', 'wp-admin-dashly/v1' );

// Load includes.
require_once WPAD_PLUGIN_DIR . 'includes/class-wpad-defaults.php';
require_once WPAD_PLUGIN_DIR . 'includes/class-wpad-preferences.php';
require_once WPAD_PLUGIN_DIR . 'includes/class-wpad-rest-controller.php';
require_once WPAD_PLUGIN_DIR . 'includes/class-wpad-admin-page.php';
require_once WPAD_PLUGIN_DIR . 'includes/class-wpad-style-injector.php';
require_once WPAD_PLUGIN_DIR . 'includes/class-wpad-plugin.php';

// Boot the plugin.
add_action(
	'plugins_loaded',
	static function () {
		WPAdminDashly\Plugin::instance()->init();
	}
);

// Activation hook — nothing destructive, just a safe touchpoint.
register_activation_hook(
	__FILE__,
	static function () {
		// Reserved for future use (e.g., DB migrations).
		if ( ! get_option( 'wpad_installed_at' ) ) {
			update_option( 'wpad_installed_at', time() );
		}
	}
);

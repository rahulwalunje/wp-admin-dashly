<?php
/**
 * Main plugin class. Wires hooks to subsystems.
 *
 * @package WPAdminDashly
 */

namespace WPAdminDashly;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Plugin {

	private static $instance = null;

	/** @var Admin_Page */
	public $admin_page;

	/** @var REST_Controller */
	public $rest_controller;

	/** @var Style_Injector */
	public $style_injector;

	/** @var Menu_Customizer */
	public $menu_customizer;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->admin_page      = new Admin_Page();
		$this->rest_controller = new REST_Controller();
		$this->style_injector  = new Style_Injector();
		$this->menu_customizer = new Menu_Customizer();
	}

	public function init() {
		// Load text domain for translations.
		load_plugin_textdomain( 'wp-admin-dashly', false, dirname( plugin_basename( WPAD_PLUGIN_FILE ) ) . '/languages' );

		// Snapshot the raw menu before our customizer modifies it (priority 100 < 9999).
		// This gives the React organizer the full list including hidden items.
		add_action( 'admin_menu', array( $this->admin_page, 'capture_raw_menu' ), 100 );

		// Per-user menu customization — runs at priority 9999, after all plugins register items.
		add_action( 'admin_menu', array( $this->menu_customizer, 'apply' ), 9999 );

		// Admin menu + assets.
		add_action( 'admin_menu', array( $this->admin_page, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this->admin_page, 'enqueue_assets' ) );

		// REST routes.
		add_action( 'rest_api_init', array( $this->rest_controller, 'register_routes' ) );

		// Google Fonts must be enqueued before head renders.
		add_action( 'admin_enqueue_scripts', array( $this->style_injector, 'enqueue_fonts' ), 5 );
		// CSS blob printed in admin head.
		add_action( 'admin_head', array( $this->style_injector, 'print_inline_css' ), 999 );
		// Admin bar color on the public frontend for logged-in users.
		add_action( 'wp_head', array( $this->style_injector, 'print_frontend_css' ), 999 );
	}
}

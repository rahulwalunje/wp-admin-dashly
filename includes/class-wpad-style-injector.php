<?php
/**
 * Injects the current user's CSS into every admin page so styles apply
 * across all of /wp-admin (not just our settings screen).
 *
 * @package WPAdminDashly
 */

namespace WPAdminDashly;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Style_Injector {

	public function enqueue_fonts() {
		$prefs = $this->get_active_prefs();
		if ( ! $prefs ) {
			return;
		}

		$font_key  = isset( $prefs['typography']['font_family'] ) ? $prefs['typography']['font_family'] : 'system';
		$fonts     = Defaults::get_font_families();
		$font_meta = isset( $fonts[ $font_key ] ) ? $fonts[ $font_key ] : $fonts['system'];

		if ( ! empty( $font_meta['google_url'] ) ) {
			wp_enqueue_style(
				'wpad-google-font-' . $font_key,
				$font_meta['google_url'],
				array(),
				WPAD_VERSION
			);
		}
	}

	/**
	 * Outputs the admin bar color on the frontend for logged-in users.
	 * Hooked to wp_head so the toolbar matches the user's saved preference.
	 */
	public function print_frontend_css() {
		$prefs = $this->get_active_prefs();
		if ( ! $prefs ) {
			return;
		}

		$admin_bar_bg = esc_attr( $prefs['colors']['admin_bar_bg'] );
		$font_key     = isset( $prefs['typography']['font_family'] ) ? $prefs['typography']['font_family'] : 'system';
		$fonts        = Defaults::get_font_families();
		$font_stack   = isset( $fonts[ $font_key ] ) ? $fonts[ $font_key ]['stack'] : $fonts['system']['stack'];

		echo "\n<style id=\"wpad-frontend-styles\">\n";
		echo "#wpadminbar { background: " . $admin_bar_bg . " !important; }\n";
		echo "#wpadminbar, #wpadminbar * { font-family: " . esc_attr( $font_stack ) . "; }\n";
		echo "</style>\n";
	}

	public function print_inline_css() {
		$prefs = $this->get_active_prefs();
		if ( ! $prefs ) {
			return;
		}

		$font_key  = isset( $prefs['typography']['font_family'] ) ? $prefs['typography']['font_family'] : 'system';
		$fonts     = Defaults::get_font_families();
		$font_meta = isset( $fonts[ $font_key ] ) ? $fonts[ $font_key ] : $fonts['system'];

		echo "\n<style id=\"wpad-injected-styles\">\n" . self::build_css( $prefs, $font_meta ) . "\n</style>\n";
	}

	/**
	 * Returns the active preferences for the current user, or null if styling
	 * should not be applied (logged out or feature disabled).
	 */
	private function get_active_prefs() {
		if ( ! is_user_logged_in() ) {
			return null;
		}
		$prefs = Preferences::get_for_user( get_current_user_id() );
		if ( empty( $prefs['enabled'] ) ) {
			return null;
		}
		return $prefs;
	}

	/**
	 * Build the CSS string from a preferences array.
	 *
	 * @param array $prefs     Preferences.
	 * @param array $font_meta Font metadata (with 'stack' key).
	 * @return string
	 */
	public static function build_css( $prefs, $font_meta ) {
		$accent       = esc_attr( $prefs['colors']['accent'] );
		$sidebar_bg   = esc_attr( $prefs['colors']['sidebar_bg'] );
		$sidebar_text = esc_attr( $prefs['colors']['sidebar_text'] );
		$admin_bar_bg = esc_attr( $prefs['colors']['admin_bar_bg'] );
		$radius       = (int) $prefs['layout']['border_radius'];
		$font_size    = (int) $prefs['typography']['font_size'];
		$font_stack   = $font_meta['stack'];

		$css = ":root {
	--wpad-accent: {$accent};
	--wpad-sidebar-bg: {$sidebar_bg};
	--wpad-sidebar-text: {$sidebar_text};
	--wpad-admin-bar-bg: {$admin_bar_bg};
	--wpad-radius: {$radius}px;
	--wpad-font-size: {$font_size}px;
}

/* Base font across admin */
body.wp-admin,
body.wp-admin .wp-core-ui,
body.wp-admin #wpadminbar,
body.wp-admin #adminmenu {
	font-family: {$font_stack};
}

/* Font size — applied broadly so WP's own per-element rules don't win */
body.wp-admin,
body.wp-admin p,
body.wp-admin li,
body.wp-admin td,
body.wp-admin th,
body.wp-admin label,
body.wp-admin input,
body.wp-admin textarea,
body.wp-admin select,
body.wp-admin .button,
body.wp-admin #adminmenu a,
body.wp-admin #wpadminbar {
	font-size: var(--wpad-font-size) !important;
}

/* Top admin bar */
#wpadminbar {
	background: var(--wpad-admin-bar-bg) !important;
}

/* Side admin menu */
#adminmenuback,
#adminmenuwrap,
#adminmenu {
	background: var(--wpad-sidebar-bg) !important;
}
#adminmenu a,
#adminmenu div.wp-menu-name,
#adminmenu .wp-submenu a {
	color: var(--wpad-sidebar-text) !important;
}
#adminmenu li.menu-top:hover,
#adminmenu li.opensub > a.menu-top,
#adminmenu li > a.menu-top:focus {
	background: var(--wpad-accent) !important;
	color: #fff !important;
}
#adminmenu li.menu-top:hover div.wp-menu-name,
#adminmenu li.menu-top:hover .wp-menu-image::before,
#adminmenu li > a.menu-top:focus div.wp-menu-name {
	color: #fff !important;
}
#adminmenu li.current a.menu-top,
#adminmenu li.wp-has-current-submenu a.wp-has-current-submenu,
.folded #adminmenu li.current.menu-top,
#adminmenu li.wp-has-current-submenu .wp-submenu .wp-submenu-head {
	background: var(--wpad-accent) !important;
	color: #fff !important;
}
#adminmenu li.current a.menu-top div.wp-menu-name,
#adminmenu li.current a.menu-top .wp-menu-image::before,
#adminmenu li.wp-has-current-submenu a.wp-has-current-submenu div.wp-menu-name,
#adminmenu li.wp-has-current-submenu .wp-menu-image::before {
	color: #fff !important;
}

/* Submenu */
#adminmenu .wp-submenu {
	background: var(--wpad-sidebar-bg) !important;
	filter: brightness(0.92);
}
#adminmenu .wp-submenu a:hover,
#adminmenu .wp-submenu a:focus,
#adminmenu .wp-submenu li.current a {
	color: var(--wpad-accent) !important;
}

/* Buttons & focused inputs */
.wp-core-ui .button-primary {
	background: var(--wpad-accent) !important;
	border-color: var(--wpad-accent) !important;
	color: #fff !important;
	border-radius: var(--wpad-radius) !important;
}
.wp-core-ui .button-primary:hover,
.wp-core-ui .button-primary:focus {
	filter: brightness(0.92);
}
.wp-core-ui .button {
	border-radius: var(--wpad-radius) !important;
}

/* Generic radius pass on common surfaces */
.postbox,
.notice,
.wp-admin .card,
.wp-admin input[type=text],
.wp-admin input[type=email],
.wp-admin input[type=url],
.wp-admin input[type=search],
.wp-admin input[type=number],
.wp-admin input[type=password],
.wp-admin select,
.wp-admin textarea,
.wp-list-table {
	border-radius: var(--wpad-radius) !important;
}

/* Focus rings use accent */
.wp-core-ui input:focus,
.wp-core-ui textarea:focus,
.wp-core-ui select:focus {
	border-color: var(--wpad-accent) !important;
	box-shadow: 0 0 0 1px var(--wpad-accent) !important;
}
";

		return $css;
	}
}

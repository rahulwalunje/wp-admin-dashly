<?php
/**
 * REST API controller.
 *
 * Routes:
 *   GET    /wp-admin-dashly/v1/preferences        — current user's prefs
 *   POST   /wp-admin-dashly/v1/preferences        — save current user's prefs
 *   DELETE /wp-admin-dashly/v1/preferences        — reset current user's prefs
 *   GET    /wp-admin-dashly/v1/presets            — built-in presets and font list
 *   GET    /wp-admin-dashly/v1/menu               — current WP admin menu structure
 *   GET    /wp-admin-dashly/v1/menu-preferences   — current user's menu diff
 *   POST   /wp-admin-dashly/v1/menu-preferences   — save current user's menu diff
 *
 * @package WPAdminDashly
 */

namespace WPAdminDashly;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class REST_Controller {

	public function register_routes() {
		register_rest_route(
			WPAD_REST_NAMESPACE,
			'/preferences',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_preferences' ),
					'permission_callback' => array( $this, 'permission_logged_in' ),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'save_preferences' ),
					'permission_callback' => array( $this, 'permission_logged_in' ),
					'args'                => array(
						'enabled'    => array( 'type' => 'boolean' ),
						'colors'     => array( 'type' => 'object' ),
						'typography' => array( 'type' => 'object' ),
						'layout'     => array( 'type' => 'object' ),
						'preset'     => array( 'type' => 'string' ),
					),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'reset_preferences' ),
					'permission_callback' => array( $this, 'permission_logged_in' ),
				),
			)
		);

		register_rest_route(
			WPAD_REST_NAMESPACE,
			'/presets',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_presets' ),
					'permission_callback' => array( $this, 'permission_logged_in' ),
				),
			)
		);

		register_rest_route(
			WPAD_REST_NAMESPACE,
			'/custom-presets',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'save_custom_preset' ),
					'permission_callback' => array( $this, 'permission_logged_in' ),
					'args'                => array(
						'name'        => array(
							'type'     => 'string',
							'required' => true,
						),
						'preferences' => array( 'type' => 'object' ),
					),
				),
			)
		);

		register_rest_route(
			WPAD_REST_NAMESPACE,
			'/custom-presets/(?P<id>[a-zA-Z0-9_-]+)',
			array(
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_custom_preset' ),
					'permission_callback' => array( $this, 'permission_logged_in' ),
				),
			)
		);

		register_rest_route(
			WPAD_REST_NAMESPACE,
			'/menu',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_menu' ),
					'permission_callback' => array( $this, 'permission_logged_in' ),
				),
			)
		);

		register_rest_route(
			WPAD_REST_NAMESPACE,
			'/menu-preferences',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_menu_preferences' ),
					'permission_callback' => array( $this, 'permission_logged_in' ),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'save_menu_preferences' ),
					'permission_callback' => array( $this, 'permission_logged_in' ),
					'args'                => array(
						'order'  => array( 'type' => 'array' ),
						'hidden' => array( 'type' => 'array' ),
						'labels' => array( 'type' => 'object' ),
						'pinned' => array( 'type' => 'array' ),
					),
				),
			)
		);
	}

	/**
	 * Permission check: any logged-in user can read/write their own preferences.
	 * REST cookie nonce ('X-WP-Nonce') is verified automatically by WordPress when a
	 * logged-in user makes a same-origin request.
	 */
	public function permission_logged_in() {
		return is_user_logged_in();
	}

	public function get_preferences( \WP_REST_Request $request ) {
		$prefs = Preferences::get_for_user( get_current_user_id() );
		return rest_ensure_response( $prefs );
	}

	public function save_preferences( \WP_REST_Request $request ) {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			$body = $request->get_params();
		}

		$result = Preferences::save_for_user( get_current_user_id(), $body );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}

	public function reset_preferences( \WP_REST_Request $request ) {
		$prefs = Preferences::reset_for_user( get_current_user_id() );
		return rest_ensure_response( $prefs );
	}

	public function get_presets( \WP_REST_Request $request ) {
		$builtin = Defaults::get_presets();
		$custom  = $this->get_custom_presets_for_user( get_current_user_id() );

		// Custom presets are returned in a separate key so the UI can distinguish them.
		return rest_ensure_response(
			array(
				'presets'        => $builtin,
				'custom_presets' => $custom,
				'font_families'  => Defaults::get_font_families(),
			)
		);
	}

	/**
	 * POST /custom-presets — save current preferences as a named user preset.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	const MAX_CUSTOM_PRESETS = 25;

	public function save_custom_preset( \WP_REST_Request $request ) {
		$body = $request->get_json_params();
		$name = isset( $body['name'] ) ? sanitize_text_field( $body['name'] ) : '';

		if ( empty( $name ) ) {
			return new \WP_Error( 'missing_name', __( 'Preset name is required.', 'wp-admin-dashly' ), array( 'status' => 400 ) );
		}

		$preferences = isset( $body['preferences'] ) && is_array( $body['preferences'] ) ? $body['preferences'] : array();

		// Reuse the same sanitizer as regular preferences.
		$preferences = Preferences::sanitize( $preferences );

		$user_id = get_current_user_id();
		$presets = $this->get_custom_presets_for_user( $user_id );

		if ( count( $presets ) >= self::MAX_CUSTOM_PRESETS ) {
			return new \WP_Error(
				'preset_limit_reached',
				sprintf(
					/* translators: %d: maximum number of presets allowed */
					__( 'You can save up to %d custom presets.', 'wp-admin-dashly' ),
					self::MAX_CUSTOM_PRESETS
				),
				array( 'status' => 400 )
			);
		}

		// Generate a stable slug from name + timestamp suffix to avoid collisions.
		$id = 'custom_' . sanitize_title( $name ) . '_' . time();

		$presets[ $id ] = array(
			'name'        => $name,
			'description' => __( 'Custom preset', 'wp-admin-dashly' ),
			'preferences' => $preferences,
		);

		update_user_meta( $user_id, 'wpad_custom_presets', $presets );

		return rest_ensure_response( array( 'id' => $id, 'custom_presets' => $presets ) );
	}

	/**
	 * DELETE /custom-presets/{id} — remove a user's custom preset.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_custom_preset( \WP_REST_Request $request ) {
		$id      = $request->get_param( 'id' );
		$user_id = get_current_user_id();
		$presets = $this->get_custom_presets_for_user( $user_id );

		if ( ! isset( $presets[ $id ] ) ) {
			return new \WP_Error( 'not_found', __( 'Preset not found.', 'wp-admin-dashly' ), array( 'status' => 404 ) );
		}

		unset( $presets[ $id ] );
		update_user_meta( $user_id, 'wpad_custom_presets', $presets );

		return rest_ensure_response( array( 'custom_presets' => $presets ) );
	}

	/**
	 * Returns the custom presets array for the given user, always as an array.
	 *
	 * @param int $user_id
	 * @return array
	 */
	private function get_custom_presets_for_user( $user_id ) {
		$presets = get_user_meta( $user_id, 'wpad_custom_presets', true );
		return is_array( $presets ) ? $presets : array();
	}

	/**
	 * GET /menu — returns the current WP admin menu structure for this user.
	 * $menu and $submenu are populated after admin_menu fires; the REST request
	 * runs inside wp-admin context so they are available.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_menu( \WP_REST_Request $request ) {
		global $menu, $submenu;

		$items = array();

		if ( ! is_array( $menu ) ) {
			return rest_ensure_response( $items );
		}

		foreach ( $menu as $position => $item ) {
			// Skip separators (CSS class at index 4 contains 'wp-menu-separator').
			if ( isset( $item[4] ) && false !== strpos( $item[4], 'wp-menu-separator' ) ) {
				continue;
			}
			if ( empty( $item[2] ) || empty( $item[1] ) || ! current_user_can( $item[1] ) ) {
				continue;
			}

			$slug  = $item[2]; // menu slug / URL
			$label = preg_replace( '/<span[^>]*>.*?<\/span>/si', '', $item[0] );
			$label = trim( wp_strip_all_tags( $label ) );
			$icon     = isset( $item[6] ) ? $item[6] : '';
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

		return rest_ensure_response( $items );
	}

	/**
	 * GET /menu-preferences — current user's menu diff.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_menu_preferences( \WP_REST_Request $request ) {
		$prefs = get_user_meta( get_current_user_id(), 'wpad_menu_preferences', true );
		if ( ! is_array( $prefs ) ) {
			$prefs = Defaults::get_menu_preference_defaults();
		}
		return rest_ensure_response( $prefs );
	}

	/**
	 * POST /menu-preferences — save current user's menu diff.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function save_menu_preferences( \WP_REST_Request $request ) {
		$body      = $request->get_json_params();
		$sanitized = Defaults::sanitize_menu_preferences( is_array( $body ) ? $body : array() );
		update_user_meta( get_current_user_id(), 'wpad_menu_preferences', $sanitized );
		return rest_ensure_response( $sanitized );
	}
}

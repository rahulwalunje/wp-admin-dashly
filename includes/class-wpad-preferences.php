<?php
/**
 * Per-user preference storage, validation, and sanitization.
 *
 * @package WPAdminDashly
 */

namespace WPAdminDashly;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Preferences {

	/**
	 * Get the merged preferences for a user (defaults + saved).
	 *
	 * @param int $user_id User ID. 0 means current user.
	 * @return array
	 */
	public static function get_for_user( $user_id = 0 ) {
		if ( ! $user_id ) {
			$user_id = get_current_user_id();
		}

		$defaults = Defaults::get_defaults();

		if ( ! $user_id ) {
			return $defaults;
		}

		$saved = get_user_meta( $user_id, WPAD_USER_META_KEY, true );

		if ( ! is_array( $saved ) ) {
			return $defaults;
		}

		return self::deep_merge( $defaults, $saved );
	}

	/**
	 * Save preferences for a user. Sanitizes input first.
	 *
	 * @param int   $user_id      User ID.
	 * @param array $preferences  Raw preferences from request.
	 * @return array|\WP_Error    The sanitized, saved preferences (merged onto defaults), or error.
	 */
	public static function save_for_user( $user_id, $preferences ) {
		if ( ! $user_id ) {
			return new \WP_Error( 'wpad_no_user', __( 'No user.', 'wp-admin-dashly' ), array( 'status' => 401 ) );
		}

		$sanitized = self::sanitize( $preferences );

		update_user_meta( $user_id, WPAD_USER_META_KEY, $sanitized );

		return self::get_for_user( $user_id );
	}

	/**
	 * Reset (delete) preferences for a user.
	 *
	 * @param int $user_id User ID.
	 * @return array Default preferences.
	 */
	public static function reset_for_user( $user_id ) {
		if ( $user_id ) {
			delete_user_meta( $user_id, WPAD_USER_META_KEY );
		}
		return Defaults::get_defaults();
	}

	/**
	 * Sanitize a preferences array. Unknown keys are dropped.
	 *
	 * @param array $input Raw input.
	 * @return array
	 */
	public static function sanitize( $input ) {
		$defaults = Defaults::get_defaults();
		$out      = array();

		// enabled.
		$out['enabled'] = isset( $input['enabled'] ) ? (bool) $input['enabled'] : $defaults['enabled'];

		// colors.
		$out['colors'] = array();
		foreach ( array_keys( $defaults['colors'] ) as $color_key ) {
			$value = isset( $input['colors'][ $color_key ] ) ? $input['colors'][ $color_key ] : $defaults['colors'][ $color_key ];
			$out['colors'][ $color_key ] = self::sanitize_hex_color( $value, $defaults['colors'][ $color_key ] );
		}

		// typography.
		$valid_fonts                = array_keys( Defaults::get_font_families() );
		$font_family                = isset( $input['typography']['font_family'] ) ? (string) $input['typography']['font_family'] : $defaults['typography']['font_family'];
		$out['typography']          = array();
		$out['typography']['font_family'] = in_array( $font_family, $valid_fonts, true ) ? $font_family : $defaults['typography']['font_family'];

		$font_size = isset( $input['typography']['font_size'] ) ? (int) $input['typography']['font_size'] : $defaults['typography']['font_size'];
		$out['typography']['font_size'] = max( 12, min( 18, $font_size ) );

		// layout.
		$radius = isset( $input['layout']['border_radius'] ) ? (int) $input['layout']['border_radius'] : $defaults['layout']['border_radius'];
		$out['layout'] = array(
			'border_radius' => max( 0, min( 20, $radius ) ),
		);

		// preset.
		$valid_presets = array_keys( Defaults::get_presets() );
		$preset        = isset( $input['preset'] ) ? (string) $input['preset'] : $defaults['preset'];
		$out['preset'] = in_array( $preset, $valid_presets, true ) ? $preset : 'custom';
		// Allow 'custom' as a sentinel value too.
		if ( isset( $input['preset'] ) && 'custom' === $input['preset'] ) {
			$out['preset'] = 'custom';
		}

		$out['schema_version'] = $defaults['schema_version'];

		return $out;
	}

	/**
	 * Validate and sanitize a hex color string.
	 *
	 * @param mixed  $value    Input.
	 * @param string $fallback Fallback color.
	 * @return string
	 */
	private static function sanitize_hex_color( $value, $fallback ) {
		if ( ! is_string( $value ) ) {
			return $fallback;
		}
		$value = trim( $value );
		if ( preg_match( '/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $value ) ) {
			return $value;
		}
		return $fallback;
	}

	/**
	 * Recursively merge $override onto $base (only keys that exist in $base).
	 *
	 * @param array $base
	 * @param array $override
	 * @return array
	 */
	private static function deep_merge( $base, $override ) {
		foreach ( $base as $key => $value ) {
			if ( ! array_key_exists( $key, $override ) ) {
				continue;
			}
			if ( is_array( $value ) && is_array( $override[ $key ] ) ) {
				$base[ $key ] = self::deep_merge( $value, $override[ $key ] );
			} else {
				$base[ $key ] = $override[ $key ];
			}
		}
		return $base;
	}
}

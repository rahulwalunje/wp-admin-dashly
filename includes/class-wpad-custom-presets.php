<?php
/**
 * Per-user custom preset storage.
 *
 * Owns the `wpad_custom_presets` user-meta key. Mirrors the static API
 * shape used by Preferences.
 *
 * @package WPAdminDashly
 */

namespace WPAdminDashly;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Custom_Presets {

	const META_KEY    = 'wpad_custom_presets';
	const MAX_PRESETS = 25;

	/**
	 * Returns the user's custom presets, always as an array.
	 *
	 * @param int $user_id User ID.
	 * @return array
	 */
	public static function get_for_user( $user_id ) {
		$presets = get_user_meta( $user_id, self::META_KEY, true );
		return is_array( $presets ) ? $presets : array();
	}

	/**
	 * Save current preferences as a named custom preset for the user.
	 *
	 * @param int    $user_id          User ID.
	 * @param string $name             User-supplied preset name.
	 * @param array  $raw_preferences  Raw preferences payload (will be sanitized).
	 * @return array|\WP_Error  { id, custom_presets } on success.
	 */
	public static function save( $user_id, $name, $raw_preferences ) {
		$name = sanitize_text_field( (string) $name );

		if ( '' === $name ) {
			return new \WP_Error(
				'missing_name',
				__( 'Preset name is required.', 'wp-admin-dashly' ),
				array( 'status' => 400 )
			);
		}

		$preferences = is_array( $raw_preferences ) ? $raw_preferences : array();
		$preferences = Preferences::sanitize( $preferences );

		$presets = self::get_for_user( $user_id );

		if ( count( $presets ) >= self::MAX_PRESETS ) {
			return new \WP_Error(
				'preset_limit_reached',
				sprintf(
					/* translators: %d: maximum number of presets allowed */
					__( 'You can save up to %d custom presets.', 'wp-admin-dashly' ),
					self::MAX_PRESETS
				),
				array( 'status' => 400 )
			);
		}

		// Stable slug from name + timestamp suffix to avoid collisions.
		$id = 'custom_' . sanitize_title( $name ) . '_' . time();

		$presets[ $id ] = array(
			'name'        => $name,
			'description' => __( 'Custom preset', 'wp-admin-dashly' ),
			'preferences' => $preferences,
		);

		update_user_meta( $user_id, self::META_KEY, $presets );

		return array(
			'id'             => $id,
			'custom_presets' => $presets,
		);
	}

	/**
	 * Delete a custom preset by ID.
	 *
	 * @param int    $user_id User ID.
	 * @param string $id      Preset ID.
	 * @return array|\WP_Error  { custom_presets } on success.
	 */
	public static function delete( $user_id, $id ) {
		$presets = self::get_for_user( $user_id );

		if ( ! isset( $presets[ $id ] ) ) {
			return new \WP_Error(
				'not_found',
				__( 'Preset not found.', 'wp-admin-dashly' ),
				array( 'status' => 404 )
			);
		}

		unset( $presets[ $id ] );
		update_user_meta( $user_id, self::META_KEY, $presets );

		return array( 'custom_presets' => $presets );
	}
}

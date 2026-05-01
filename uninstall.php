<?php
/**
 * Fired when the plugin is uninstalled (deleted via WP admin, not deactivated).
 * Removes all per-user data stored by the plugin.
 *
 * @package WPAdminDashly
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// Delete all per-user preference rows and custom preset rows.
$meta_keys = array(
	'wpad_preferences',
	'wpad_custom_presets',
	'wpad_menu_preferences',
);

foreach ( $meta_keys as $key ) {
	$wpdb->delete( $wpdb->usermeta, array( 'meta_key' => $key ), array( '%s' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
}

// Remove the plugin option set on activation.
delete_option( 'wpad_installed_at' );

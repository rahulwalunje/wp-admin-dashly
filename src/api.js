/**
 * Thin wrappers around the WP REST endpoints exposed by REST_Controller.
 * apiFetch automatically uses the X-WP-Nonce that wp_localize_script set
 * up via the wp-api-fetch script's middleware (registered by WP core), so
 * we don't need to pass it manually.
 *
 * We do still call apiFetch.use( apiFetch.createNonceMiddleware( nonce ) )
 * once at startup just to be safe in case the rootURL middleware isn't set.
 */

import apiFetch from '@wordpress/api-fetch';

const boot = window.WPAD_BOOT || {};

// Make sure apiFetch knows our nonce and root URL. WP core usually sets these,
// but this is a small belt-and-braces step.
if ( boot.nonce ) {
	apiFetch.use( apiFetch.createNonceMiddleware( boot.nonce ) );
}

const namespace = `/${ boot.restNamespace || 'wp-admin-dashly/v1' }`;

export function getPreferences() {
	return apiFetch( { path: `${ namespace }/preferences` } );
}

export function savePreferences( prefs ) {
	return apiFetch( {
		path: `${ namespace }/preferences`,
		method: 'POST',
		data: prefs,
	} );
}

export function resetPreferences() {
	return apiFetch( {
		path: `${ namespace }/preferences`,
		method: 'DELETE',
	} );
}

export function getPresets() {
	return apiFetch( { path: `${ namespace }/presets` } );
}

export function saveCustomPreset( name, preferences ) {
	return apiFetch( {
		path: `${ namespace }/custom-presets`,
		method: 'POST',
		data: { name, preferences },
	} );
}

export function deleteCustomPreset( id ) {
	return apiFetch( {
		path: `${ namespace }/custom-presets/${ id }`,
		method: 'DELETE',
	} );
}

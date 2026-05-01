/**
 * Live preview: mirrors the CSS variables that the PHP injector writes,
 * but applies them to document.documentElement in real time as the user
 * tweaks controls. The PHP-emitted <style> tag is ALSO present in the
 * page (it was rendered server-side at page load), but CSS variables
 * cascade so our :root overrides win because they're set inline on the
 * <html> element.
 *
 * On Save the page survives a reload because PHP regenerates the same
 * vars from the saved meta.
 */

const VAR_MAP = {
	'colors.accent':       '--wpad-accent',
	'colors.sidebar_bg':   '--wpad-sidebar-bg',
	'colors.sidebar_text': '--wpad-sidebar-text',
	'colors.admin_bar_bg': '--wpad-admin-bar-bg',
};

function get( obj, path ) {
	return path.split( '.' ).reduce( ( acc, key ) => ( acc == null ? acc : acc[ key ] ), obj );
}

export function applyLivePreview( prefs, fontFamilies ) {
	if ( ! prefs ) return;
	const root = document.documentElement;

	// Colors.
	for ( const [ path, varName ] of Object.entries( VAR_MAP ) ) {
		const value = get( prefs, path );
		if ( typeof value === 'string' ) {
			root.style.setProperty( varName, value );
		}
	}

	// Radius.
	const radius = get( prefs, 'layout.border_radius' );
	if ( typeof radius === 'number' ) {
		root.style.setProperty( '--wpad-radius', `${ radius }px` );
	}

	// Font size.
	const fontSize = get( prefs, 'typography.font_size' );
	if ( typeof fontSize === 'number' ) {
		root.style.setProperty( '--wpad-font-size', `${ fontSize }px` );
	}

	// Font family. We need to set this where the server-side CSS reads it
	// (it doesn't use a CSS var for font-family), so we apply directly to
	// the relevant elements via a dynamic style tag.
	const fontKey   = get( prefs, 'typography.font_family' ) || 'system';
	const fontMeta  = fontFamilies && fontFamilies[ fontKey ];
	const fontStack = fontMeta ? fontMeta.stack : 'inherit';

	let styleEl = document.getElementById( 'wpad-live-font' );
	if ( ! styleEl ) {
		styleEl = document.createElement( 'style' );
		styleEl.id = 'wpad-live-font';
		document.head.appendChild( styleEl );
	}
	styleEl.textContent = `
		body.wp-admin,
		body.wp-admin .wp-core-ui,
		body.wp-admin #wpadminbar,
		body.wp-admin #adminmenu {
			font-family: ${ fontStack };
		}
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
	`;

	// If the chosen font is a Google Font and isn't yet loaded, inject it on the fly.
	if ( fontMeta && fontMeta.google_url ) {
		const linkId = `wpad-live-googlefont-${ fontKey }`;
		if ( ! document.getElementById( linkId ) ) {
			const link = document.createElement( 'link' );
			link.id = linkId;
			link.rel = 'stylesheet';
			link.href = fontMeta.google_url;
			document.head.appendChild( link );
		}
	}
}

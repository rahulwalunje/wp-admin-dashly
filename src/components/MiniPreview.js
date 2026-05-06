import { __ } from '@wordpress/i18n';

/**
 * Mini admin chrome preview.
 */
export default function MiniPreview( { prefs } ) {
	return (
		<div className="wpad-mini-preview" aria-hidden="true">
			<div className="wpad-mini-bar" style={ { background: prefs.colors.admin_bar_bg } } />
			<div className="wpad-mini-body">
				<div className="wpad-mini-side" style={ { background: prefs.colors.sidebar_bg } }>
					<div className="wpad-mini-side-item" style={ { color: prefs.colors.sidebar_text } }>{ __( 'Posts', 'wp-admin-dashly' ) }</div>
					<div className="wpad-mini-side-item wpad-mini-active" style={ { background: prefs.colors.accent, color: '#fff' } }>{ __( 'Pages', 'wp-admin-dashly' ) }</div>
					<div className="wpad-mini-side-item" style={ { color: prefs.colors.sidebar_text } }>{ __( 'Media', 'wp-admin-dashly' ) }</div>
				</div>
				<div className="wpad-mini-content">
					<div className="wpad-mini-card" style={ { borderRadius: `${ prefs.layout.border_radius }px` } }>
						<div className="wpad-mini-line" />
						<div className="wpad-mini-line short" />
						<button className="wpad-mini-btn" style={ { background: prefs.colors.accent, borderRadius: `${ prefs.layout.border_radius }px` } }>
							{ __( 'Save', 'wp-admin-dashly' ) }
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

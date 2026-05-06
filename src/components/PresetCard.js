import { __ } from '@wordpress/i18n';

/**
 * Preset card. Custom presets show a delete button.
 */
export default function PresetCard( { presetKey, preset, active, onApply, isCustom = false, onDelete } ) {
	const c = preset.preferences.colors || {};
	return (
		<div className={ `wpad-preset-card${ active ? ' is-active' : '' }` }>
			<button
				type="button"
				className="wpad-preset-card-body"
				onClick={ () => onApply( presetKey ) }
			>
				<div className="wpad-preset-swatches">
					<span style={ { background: c.sidebar_bg || '#1d2327' } } />
					<span style={ { background: c.accent || '#2271b1' } } />
					<span style={ { background: c.sidebar_text || '#f0f0f1' } } />
					<span style={ { background: c.admin_bar_bg || '#1d2327' } } />
				</div>
				<div className="wpad-preset-label">{ preset.name }</div>
				<div className="wpad-preset-desc">{ preset.description }</div>
			</button>
			{ isCustom && onDelete && (
				<button
					type="button"
					className="wpad-preset-delete"
					aria-label={ __( 'Delete preset', 'wp-admin-dashly' ) }
					onClick={ () => onDelete( presetKey ) }
				>
					&times;
				</button>
			) }
		</div>
	);
}

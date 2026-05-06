import { ToggleControl, PanelRow } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function GeneralTab( { enabled, onChange } ) {
	return (
		<PanelRow>
			<ToggleControl
				label={ __( 'Enable Dashly styling', 'wp-admin-dashly' ) }
				help={ __( 'Turn off to revert to vanilla WP admin styling without losing your saved settings.', 'wp-admin-dashly' ) }
				checked={ enabled }
				onChange={ onChange }
				__nextHasNoMarginBottom
			/>
		</PanelRow>
	);
}

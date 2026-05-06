import { __experimentalVStack as VStack } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ColorField from '../components/ColorField';

export default function ColorsTab( { colors, onUpdate } ) {
	return (
		<VStack spacing={ 2 }>
			<ColorField
				label={ __( 'Accent', 'wp-admin-dashly' ) }
				help={ __( 'Primary buttons, focus rings, active menu items.', 'wp-admin-dashly' ) }
				value={ colors.accent }
				onChange={ ( v ) => onUpdate( 'accent', v ) }
			/>
			<ColorField
				label={ __( 'Sidebar Background', 'wp-admin-dashly' ) }
				value={ colors.sidebar_bg }
				onChange={ ( v ) => onUpdate( 'sidebar_bg', v ) }
			/>
			<ColorField
				label={ __( 'Sidebar Text', 'wp-admin-dashly' ) }
				value={ colors.sidebar_text }
				onChange={ ( v ) => onUpdate( 'sidebar_text', v ) }
			/>
			<ColorField
				label={ __( 'Top Admin Bar', 'wp-admin-dashly' ) }
				value={ colors.admin_bar_bg }
				onChange={ ( v ) => onUpdate( 'admin_bar_bg', v ) }
			/>
		</VStack>
	);
}

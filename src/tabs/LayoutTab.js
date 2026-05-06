import { RangeControl, __experimentalVStack as VStack } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function LayoutTab( { layout, onUpdate } ) {
	return (
		<VStack spacing={ 4 }>
			<RangeControl
				label={ __( 'Corner Roundness', 'wp-admin-dashly' ) }
				help={ __( 'Border radius for buttons, inputs, and cards across admin.', 'wp-admin-dashly' ) }
				value={ layout.border_radius }
				onChange={ ( v ) => onUpdate( 'border_radius', v ) }
				min={ 0 }
				max={ 20 }
				step={ 1 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</VStack>
	);
}

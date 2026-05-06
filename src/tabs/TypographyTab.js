import { SelectControl, RangeControl, __experimentalVStack as VStack } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function TypographyTab( { typography, fontOptions, onUpdate } ) {
	return (
		<VStack spacing={ 4 }>
			<SelectControl
				label={ __( 'Font Family', 'wp-admin-dashly' ) }
				value={ typography.font_family }
				options={ fontOptions }
				onChange={ ( v ) => onUpdate( 'font_family', v ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Base Font Size', 'wp-admin-dashly' ) }
				value={ typography.font_size }
				onChange={ ( v ) => onUpdate( 'font_size', v ) }
				min={ 12 }
				max={ 18 }
				step={ 1 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</VStack>
	);
}

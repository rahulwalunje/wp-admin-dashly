import { useState, useRef } from '@wordpress/element';
import { ColorPicker, Popover, __experimentalHStack as HStack } from '@wordpress/components';

/**
 * Color picker row with a floating Popover — no layout shift.
 */
export default function ColorField( { label, help, value, onChange } ) {
	const [ open, setOpen ] = useState( false );
	const swatchRef         = useRef();

	return (
		<div className="wpad-color-field">
			<HStack alignment="center" justify="space-between">
				<div>
					<div className="wpad-field-label">{ label }</div>
					{ help && <div className="wpad-field-help">{ help }</div> }
				</div>
				<button
					ref={ swatchRef }
					type="button"
					className="wpad-swatch"
					aria-label={ `${ label }: ${ value }` }
					aria-expanded={ open }
					style={ { background: value } }
					onClick={ () => setOpen( ( o ) => ! o ) }
				>
					<span className="wpad-swatch-hex">{ value }</span>
				</button>
			</HStack>

			{ open && (
				<Popover
					anchor={ swatchRef.current }
					placement="bottom-end"
					onClose={ () => setOpen( false ) }
					shift
					flip
				>
					<div className="wpad-color-popover">
						<ColorPicker
							color={ value }
							onChange={ onChange }
							enableAlpha={ false }
							copyFormat="hex"
						/>
					</div>
				</Popover>
			) }
		</div>
	);
}

import { __ } from '@wordpress/i18n';
import PresetCard from '../components/PresetCard';

export default function PresetsTab( { presets, customPresets, activePreset, onApply, onDelete } ) {
	return (
		<div>
			<div className="wpad-preset-grid">
				{ Object.entries( presets ).map( ( [ key, preset ] ) => (
					<PresetCard
						key={ key }
						presetKey={ key }
						preset={ preset }
						active={ activePreset === key }
						onApply={ onApply }
					/>
				) ) }
			</div>

			{ Object.keys( customPresets ).length > 0 && (
				<>
					<div className="wpad-preset-section-label">{ __( 'Your presets', 'wp-admin-dashly' ) }</div>
					<div className="wpad-preset-grid">
						{ Object.entries( customPresets ).map( ( [ key, preset ] ) => (
							<PresetCard
								key={ key }
								presetKey={ key }
								preset={ preset }
								active={ activePreset === key }
								onApply={ onApply }
								onDelete={ onDelete }
								isCustom
							/>
						) ) }
					</div>
				</>
			) }
		</div>
	);
}

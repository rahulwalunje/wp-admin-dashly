import { useState, useEffect } from '@wordpress/element';
import { Button, Flex, FlexBlock, FlexItem } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Sidebar actions for the settings page.
 *
 * Two modes:
 *   - 'menu':     Save/Reset the MenuOrganizer.
 *   - 'settings': Save/Discard/Save-as-preset/Reset the styling prefs.
 *
 * Local-only state (confirmReset, save-preset form) lives here. The reset
 * confirmation is cleared whenever the mode changes — same UX as before.
 */
export default function ActionsPanel( props ) {
	const { mode } = props;
	const [ confirmReset, setConfirmReset ] = useState( false );

	// Clear the confirm-reset prompt when the user switches tabs.
	useEffect( () => {
		setConfirmReset( false );
	}, [ mode ] );

	if ( mode === 'menu' ) {
		return (
			<MenuActions
				{ ...props }
				confirmReset={ confirmReset }
				setConfirmReset={ setConfirmReset }
			/>
		);
	}

	return (
		<SettingsActions
			{ ...props }
			confirmReset={ confirmReset }
			setConfirmReset={ setConfirmReset }
		/>
	);
}

function MenuActions( {
	menuDirty,
	menuSaving,
	onMenuSave,
	onMenuReset,
	confirmReset,
	setConfirmReset,
} ) {
	return (
		<>
			<Flex>
				<FlexBlock>
					<Button
						variant="primary"
						onClick={ onMenuSave }
						isBusy={ menuSaving }
						disabled={ ! menuDirty || menuSaving }
					>
						{ menuSaving ? __( 'Saving…', 'wp-admin-dashly' ) : __( 'Save Changes', 'wp-admin-dashly' ) }
					</Button>
				</FlexBlock>
			</Flex>

			{ ! confirmReset ? (
				<Button
					variant="link"
					onClick={ () => setConfirmReset( true ) }
					isDestructive
				>
					{ __( 'Restore original menu', 'wp-admin-dashly' ) }
				</Button>
			) : (
				<div className="wpad-reset-confirm">
					<span className="wpad-reset-confirm-label">
						{ __( 'Restore the original menu order, visibility and labels?', 'wp-admin-dashly' ) }
					</span>
					<Flex>
						<FlexBlock>
							<Button
								variant="primary"
								isDestructive
								onClick={ () => { setConfirmReset( false ); onMenuReset(); } }
								style={ { width: '100%' } }
							>
								{ __( 'Yes, reset', 'wp-admin-dashly' ) }
							</Button>
						</FlexBlock>
						<FlexItem>
							<Button variant="tertiary" onClick={ () => setConfirmReset( false ) }>
								{ __( 'Cancel', 'wp-admin-dashly' ) }
							</Button>
						</FlexItem>
					</Flex>
				</div>
			) }
		</>
	);
}

function SettingsActions( {
	isDirty,
	saving,
	onSave,
	onDiscard,
	onReset,
	onSavePreset,
	confirmReset,
	setConfirmReset,
} ) {
	const [ showSavePreset, setShowSavePreset ] = useState( false );
	const [ savePresetName, setSavePresetName ] = useState( '' );
	const [ savingPreset, setSavingPreset ]     = useState( false );

	const handleSaveAsPreset = async () => {
		const name = savePresetName.trim();
		if ( ! name ) return;
		setSavingPreset( true );
		try {
			await onSavePreset( name );
			setSavePresetName( '' );
			setShowSavePreset( false );
		} finally {
			setSavingPreset( false );
		}
	};

	return (
		<>
			<Flex>
				<FlexBlock>
					<Button
						variant="primary"
						onClick={ onSave }
						disabled={ ! isDirty || saving }
						isBusy={ saving }
					>
						{ saving ? __( 'Saving…', 'wp-admin-dashly' ) : __( 'Save Changes', 'wp-admin-dashly' ) }
					</Button>
				</FlexBlock>
				<FlexItem>
					<Button variant="tertiary" onClick={ onDiscard } disabled={ ! isDirty || saving }>
						{ __( 'Discard', 'wp-admin-dashly' ) }
					</Button>
				</FlexItem>
			</Flex>

			{ ! showSavePreset ? (
				<Button
					variant="secondary"
					onClick={ () => setShowSavePreset( true ) }
					style={ { width: '100%' } }
				>
					{ __( 'Save as preset…', 'wp-admin-dashly' ) }
				</Button>
			) : (
				<div className="wpad-save-preset-form">
					<input
						type="text"
						className="wpad-preset-name-input"
						placeholder={ __( 'Preset name', 'wp-admin-dashly' ) }
						value={ savePresetName }
						onChange={ ( e ) => setSavePresetName( e.target.value ) }
						onKeyDown={ ( e ) => {
							if ( e.key === 'Enter' ) handleSaveAsPreset();
							if ( e.key === 'Escape' ) { setShowSavePreset( false ); setSavePresetName( '' ); }
						} }
						// eslint-disable-next-line jsx-a11y/no-autofocus
						autoFocus
					/>
					<Flex>
						<FlexBlock>
							<Button
								variant="primary"
								onClick={ handleSaveAsPreset }
								disabled={ ! savePresetName.trim() || savingPreset }
								isBusy={ savingPreset }
								style={ { width: '100%' } }
							>
								{ __( 'Save', 'wp-admin-dashly' ) }
							</Button>
						</FlexBlock>
						<FlexItem>
							<Button
								variant="tertiary"
								onClick={ () => { setShowSavePreset( false ); setSavePresetName( '' ); } }
							>
								{ __( 'Cancel', 'wp-admin-dashly' ) }
							</Button>
						</FlexItem>
					</Flex>
				</div>
			) }

			{ ! confirmReset ? (
				<Button variant="link" onClick={ () => setConfirmReset( true ) } isDestructive>
					{ __( 'Reset to defaults', 'wp-admin-dashly' ) }
				</Button>
			) : (
				<div className="wpad-reset-confirm">
					<span className="wpad-reset-confirm-label">
						{ __( 'Reset all styling to defaults?', 'wp-admin-dashly' ) }
					</span>
					<Flex>
						<FlexBlock>
							<Button
								variant="primary"
								isDestructive
								onClick={ () => { setConfirmReset( false ); onReset(); } }
								isBusy={ saving }
								style={ { width: '100%' } }
							>
								{ __( 'Yes, reset', 'wp-admin-dashly' ) }
							</Button>
						</FlexBlock>
						<FlexItem>
							<Button variant="tertiary" onClick={ () => setConfirmReset( false ) }>
								{ __( 'Cancel', 'wp-admin-dashly' ) }
							</Button>
						</FlexItem>
					</Flex>
				</div>
			) }
		</>
	);
}

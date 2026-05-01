/**
 * WP Admin Dashly — settings UI.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from '@wordpress/element';
import {
	TabPanel,
	Panel,
	PanelBody,
	PanelRow,
	Button,
	ColorPicker,
	RangeControl,
	SelectControl,
	ToggleControl,
	Notice,
	Spinner,
	Card,
	CardBody,
	CardHeader,
	Popover,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
	__experimentalHeading as Heading,
	__experimentalText as Text,
	Flex,
	FlexItem,
	FlexBlock,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { getPreferences, savePreferences, resetPreferences, getPresets, saveCustomPreset, deleteCustomPreset } from './api';
import { applyLivePreview } from './livePreview';

const DEFAULT_PREFS = {
	enabled: true,
	colors: {
		accent: '#2271b1',
		sidebar_bg: '#1d2327',
		sidebar_text: '#f0f0f1',
		admin_bar_bg: '#1d2327',
	},
	typography: { font_family: 'system', font_size: 13 },
	layout: { border_radius: 4 },
	preset: 'default',
	schema_version: 1,
};

export default function App() {
	const [ prefs, setPrefs ]               = useState( DEFAULT_PREFS );
	const [ initialPrefs, setInitialPrefs ] = useState( DEFAULT_PREFS );
	const [ presets, setPresets ]           = useState( {} );
	const [ customPresets, setCustomPresets ] = useState( {} );
	const [ fontFamilies, setFontFamilies ] = useState( {} );
	const [ status, setStatus ]             = useState( { loading: true, saving: false, error: null, savedAt: 0 } );
	const [ confirmReset, setConfirmReset ] = useState( false );
	const [ savePresetName, setSavePresetName ] = useState( '' );
	const [ showSavePreset, setShowSavePreset ] = useState( false );
	const [ savingPreset, setSavingPreset ]     = useState( false );

	// Initial load.
	useEffect( () => {
		Promise.all( [ getPreferences(), getPresets() ] )
			.then( ( [ savedPrefs, presetsResp ] ) => {
				setPrefs( savedPrefs );
				setInitialPrefs( savedPrefs );
				setPresets( presetsResp.presets || {} );
				setCustomPresets( presetsResp.custom_presets || {} );
				setFontFamilies( presetsResp.font_families || {} );
				setStatus( ( s ) => ( { ...s, loading: false } ) );
				applyLivePreview( savedPrefs, presetsResp.font_families );
			} )
			.catch( ( err ) => {
				setStatus( { loading: false, saving: false, error: err.message || 'Failed to load preferences', savedAt: 0 } );
			} );
	}, [] );

	// Live preview on every pref change.
	useEffect( () => {
		if ( ! status.loading ) {
			applyLivePreview( prefs, fontFamilies );
		}
	}, [ prefs, fontFamilies, status.loading ] );

	// Warn before leaving with unsaved changes.
	const isDirty = useMemo( () => JSON.stringify( prefs ) !== JSON.stringify( initialPrefs ), [ prefs, initialPrefs ] );
	useEffect( () => {
		const handler = ( e ) => {
			if ( isDirty ) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		window.addEventListener( 'beforeunload', handler );
		return () => window.removeEventListener( 'beforeunload', handler );
	}, [ isDirty ] );

	// --- Updaters ---

	const updateColor = useCallback( ( key, value ) => {
		setPrefs( ( p ) => ( { ...p, preset: 'custom', colors: { ...p.colors, [ key ]: value } } ) );
	}, [] );

	const updateTypography = useCallback( ( key, value ) => {
		setPrefs( ( p ) => ( { ...p, preset: 'custom', typography: { ...p.typography, [ key ]: value } } ) );
	}, [] );

	const updateLayout = useCallback( ( key, value ) => {
		setPrefs( ( p ) => ( { ...p, preset: 'custom', layout: { ...p.layout, [ key ]: value } } ) );
	}, [] );

	const applyPreset = useCallback( ( presetKey ) => {
		const preset = presets[ presetKey ] || customPresets[ presetKey ];
		if ( ! preset ) return;
		setPrefs( ( p ) => ( {
			...p,
			...preset.preferences,
			colors:     { ...p.colors, ...( preset.preferences.colors || {} ) },
			typography: { ...p.typography, ...( preset.preferences.typography || {} ) },
			layout:     { ...p.layout, ...( preset.preferences.layout || {} ) },
			preset:     presetKey,
		} ) );
	}, [ presets, customPresets ] );

	// --- Actions ---

	const handleSave = async () => {
		setStatus( ( s ) => ( { ...s, saving: true, error: null } ) );
		try {
			const saved = await savePreferences( prefs );
			setPrefs( saved );
			setInitialPrefs( saved );
			setStatus( { loading: false, saving: false, error: null, savedAt: Date.now() } );
		} catch ( err ) {
			setStatus( ( s ) => ( { ...s, saving: false, error: err.message || 'Save failed' } ) );
		}
	};

	const handleReset = async () => {
		setStatus( ( s ) => ( { ...s, saving: true, error: null } ) );
		try {
			const defaults = await resetPreferences();
			setPrefs( defaults );
			setInitialPrefs( defaults );
			setStatus( { loading: false, saving: false, error: null, savedAt: Date.now() } );
		} catch ( err ) {
			setStatus( ( s ) => ( { ...s, saving: false, error: err.message || 'Reset failed' } ) );
		}
	};

	const handleDiscard = () => setPrefs( initialPrefs );

	const handleSaveAsPreset = async () => {
		const name = savePresetName.trim();
		if ( ! name ) return;
		setSavingPreset( true );
		try {
			const resp = await saveCustomPreset( name, prefs );
			setCustomPresets( resp.custom_presets || {} );
			setSavePresetName( '' );
			setShowSavePreset( false );
		} catch ( err ) {
			setStatus( ( s ) => ( { ...s, error: err.message || 'Failed to save preset' } ) );
		} finally {
			setSavingPreset( false );
		}
	};

	const handleDeleteCustomPreset = async ( id ) => {
		try {
			const resp = await deleteCustomPreset( id );
			setCustomPresets( resp.custom_presets || {} );
		} catch ( err ) {
			setStatus( ( s ) => ( { ...s, error: err.message || 'Failed to delete preset' } ) );
		}
	};

	// --- Render ---

	if ( status.loading ) {
		return (
			<div className="wpad-loading">
				<Spinner />{ __( 'Loading your preferences…', 'wp-admin-dashly' ) }
			</div>
		);
	}

	const fontOptions = Object.entries( fontFamilies ).map( ( [ key, meta ] ) => ( {
		value: key,
		label: meta.label,
	} ) );

	const tabs = [
		{ name: 'presets',    title: __( 'Presets', 'wp-admin-dashly' ),    className: 'wpad-tab' },
		{ name: 'colors',     title: __( 'Colors', 'wp-admin-dashly' ),     className: 'wpad-tab' },
		{ name: 'typography', title: __( 'Typography', 'wp-admin-dashly' ), className: 'wpad-tab' },
		{ name: 'layout',     title: __( 'Layout', 'wp-admin-dashly' ),     className: 'wpad-tab' },
		{ name: 'general',    title: __( 'General', 'wp-admin-dashly' ),    className: 'wpad-tab' },
	];

	return (
		<div className="wpad-app">
			<header className="wpad-header">
				<Flex align="center" justify="space-between">
					<FlexBlock>
						<Heading level={ 1 }>{ __( 'WP Admin Dashly', 'wp-admin-dashly' ) }</Heading>
						<Text variant="muted">
							{ __( 'Personalize your admin. Changes apply only to your account.', 'wp-admin-dashly' ) }
						</Text>
					</FlexBlock>
					{ isDirty && (
						<FlexItem>
							<span className="wpad-dirty-badge">{ __( 'Unsaved changes', 'wp-admin-dashly' ) }</span>
						</FlexItem>
					) }
				</Flex>
			</header>

			{ status.error && (
				<Notice status="error" isDismissible={ false } className="wpad-notice">
					{ status.error }
				</Notice>
			) }
			{ status.savedAt > 0 && ! isDirty && ! status.error && (
				<Notice status="success" isDismissible={ false } className="wpad-notice">
					{ __( 'Saved!', 'wp-admin-dashly' ) }
				</Notice>
			) }

			<div className="wpad-grid">
				<div className="wpad-main">
					<TabPanel
						className="wpad-tabs"
						tabs={ tabs }
					>
						{ ( tab ) => (
							<div className="wpad-tab-content">
								{ tab.name === 'presets' && (
									<div>
										<div className="wpad-preset-grid">
											{ Object.entries( presets ).map( ( [ key, preset ] ) => (
												<PresetCard
													key={ key }
													presetKey={ key }
													preset={ preset }
													active={ prefs.preset === key }
													onApply={ applyPreset }
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
															active={ prefs.preset === key }
															onApply={ applyPreset }
															onDelete={ handleDeleteCustomPreset }
															isCustom
														/>
													) ) }
												</div>
											</>
										) }
									</div>
								) }

								{ tab.name === 'colors' && (
									<VStack spacing={ 2 }>
										<ColorField
											label={ __( 'Accent', 'wp-admin-dashly' ) }
											help={ __( 'Primary buttons, focus rings, active menu items.', 'wp-admin-dashly' ) }
											value={ prefs.colors.accent }
											onChange={ ( v ) => updateColor( 'accent', v ) }
										/>
										<ColorField
											label={ __( 'Sidebar Background', 'wp-admin-dashly' ) }
											value={ prefs.colors.sidebar_bg }
											onChange={ ( v ) => updateColor( 'sidebar_bg', v ) }
										/>
										<ColorField
											label={ __( 'Sidebar Text', 'wp-admin-dashly' ) }
											value={ prefs.colors.sidebar_text }
											onChange={ ( v ) => updateColor( 'sidebar_text', v ) }
										/>
										<ColorField
											label={ __( 'Top Admin Bar', 'wp-admin-dashly' ) }
											value={ prefs.colors.admin_bar_bg }
											onChange={ ( v ) => updateColor( 'admin_bar_bg', v ) }
										/>
									</VStack>
								) }

								{ tab.name === 'typography' && (
									<VStack spacing={ 4 }>
										<SelectControl
											label={ __( 'Font Family', 'wp-admin-dashly' ) }
											value={ prefs.typography.font_family }
											options={ fontOptions }
											onChange={ ( v ) => updateTypography( 'font_family', v ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<RangeControl
											label={ __( 'Base Font Size', 'wp-admin-dashly' ) }
											value={ prefs.typography.font_size }
											onChange={ ( v ) => updateTypography( 'font_size', v ) }
											min={ 12 }
											max={ 18 }
											step={ 1 }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</VStack>
								) }

								{ tab.name === 'layout' && (
									<VStack spacing={ 4 }>
										<RangeControl
											label={ __( 'Corner Roundness', 'wp-admin-dashly' ) }
											help={ __( 'Border radius for buttons, inputs, and cards across admin.', 'wp-admin-dashly' ) }
											value={ prefs.layout.border_radius }
											onChange={ ( v ) => updateLayout( 'border_radius', v ) }
											min={ 0 }
											max={ 20 }
											step={ 1 }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</VStack>
								) }

								{ tab.name === 'general' && (
									<PanelRow>
										<ToggleControl
											label={ __( 'Enable Dashly styling', 'wp-admin-dashly' ) }
											help={ __( 'Turn off to revert to vanilla WP admin styling without losing your saved settings.', 'wp-admin-dashly' ) }
											checked={ prefs.enabled }
											onChange={ ( v ) => setPrefs( ( p ) => ( { ...p, enabled: v } ) ) }
											__nextHasNoMarginBottom
										/>
									</PanelRow>
								) }
							</div>
						) }
					</TabPanel>
				</div>

				<aside className="wpad-side">
					<Card>
						<CardHeader>
							<Heading level={ 3 }>{ __( 'Live Preview', 'wp-admin-dashly' ) }</Heading>
						</CardHeader>
						<CardBody>
							<Text variant="muted" size="small">
								{ __( 'The admin chrome around this page updates as you tweak controls.', 'wp-admin-dashly' ) }
							</Text>
							<MiniPreview prefs={ prefs } />
						</CardBody>
					</Card>

					<div className="wpad-actions">
						<Flex>
							<FlexBlock>
								<Button
									variant="primary"
									onClick={ handleSave }
									disabled={ ! isDirty || status.saving }
									isBusy={ status.saving }
								>
									{ status.saving ? __( 'Saving…', 'wp-admin-dashly' ) : __( 'Save Changes', 'wp-admin-dashly' ) }
								</Button>
							</FlexBlock>
							<FlexItem>
								<Button variant="tertiary" onClick={ handleDiscard } disabled={ ! isDirty || status.saving }>
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
											onClick={ () => { setConfirmReset( false ); handleReset(); } }
											isBusy={ status.saving }
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
					</div>
				</aside>
			</div>
		</div>
	);
}

/**
 * Color picker row with a floating Popover — no layout shift.
 */
function ColorField( { label, help, value, onChange } ) {
	const [ open, setOpen ]   = useState( false );
	const swatchRef           = useRef();

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

/**
 * Mini admin chrome preview.
 */
function MiniPreview( { prefs } ) {
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

/**
 * Preset card. Custom presets show a delete button.
 */
function PresetCard( { presetKey, preset, active, onApply, isCustom = false, onDelete } ) {
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

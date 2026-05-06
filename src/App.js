/**
 * WP Admin Dashly — settings UI.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from '@wordpress/element';
import {
	TabPanel,
	Notice,
	Spinner,
	Card,
	CardBody,
	CardHeader,
	__experimentalHeading as Heading,
	__experimentalText as Text,
	Flex,
	FlexItem,
	FlexBlock,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { getPreferences, savePreferences, resetPreferences, getPresets, saveCustomPreset, deleteCustomPreset } from './api';
import { applyLivePreview } from './livePreview';
import MenuOrganizer from './MenuOrganizer';
import MiniPreview from './components/MiniPreview';
import ActionsPanel from './components/ActionsPanel';
import PresetsTab from './tabs/PresetsTab';
import ColorsTab from './tabs/ColorsTab';
import TypographyTab from './tabs/TypographyTab';
import LayoutTab from './tabs/LayoutTab';
import GeneralTab from './tabs/GeneralTab';

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

const SAVED_FLASH_MS = 3000;

export default function App() {
	const [ prefs, setPrefs ]                 = useState( DEFAULT_PREFS );
	const [ initialPrefs, setInitialPrefs ]   = useState( DEFAULT_PREFS );
	const [ presets, setPresets ]             = useState( {} );
	const [ customPresets, setCustomPresets ] = useState( {} );
	const [ fontFamilies, setFontFamilies ]   = useState( {} );
	const [ status, setStatus ]               = useState( { loading: true, saving: false, error: null, savedAt: 0 } );
	const [ activeTab, setActiveTab ]         = useState( 'presets' );
	const [ menuSaving, setMenuSaving ]       = useState( false );
	const [ menuDirty, setMenuDirty ]         = useState( false );
	const menuRef                             = useRef();

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

	// "Saved!" notice — auto-clears after SAVED_FLASH_MS. Effect cleanup
	// kills the timer if the component unmounts or another save resets it.
	const showSavedFlash = status.savedAt > 0 && ! status.error;
	useEffect( () => {
		if ( ! showSavedFlash ) return undefined;
		const id = setTimeout( () => {
			setStatus( ( s ) => ( s.savedAt ? { ...s, savedAt: 0 } : s ) );
		}, SAVED_FLASH_MS );
		return () => clearTimeout( id );
	}, [ status.savedAt, showSavedFlash ] );

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

	const updateEnabled = useCallback( ( value ) => {
		setPrefs( ( p ) => ( { ...p, enabled: value } ) );
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

	// Throws on error so ActionsPanel can leave the form open for retry.
	const handleSaveAsPreset = async ( name ) => {
		try {
			const resp = await saveCustomPreset( name, prefs );
			setCustomPresets( resp.custom_presets || {} );
		} catch ( err ) {
			setStatus( ( s ) => ( { ...s, error: err.message || 'Failed to save preset' } ) );
			throw err;
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

	const handleMenuSaveEnd = useCallback( ( success ) => {
		setMenuSaving( false );
		if ( success ) {
			setStatus( ( s ) => ( { ...s, savedAt: Date.now(), error: null } ) );
		}
	}, [] );

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
		{ name: 'menu',       title: __( 'Menu', 'wp-admin-dashly' ),       className: 'wpad-tab' },
		{ name: 'general',    title: __( 'General', 'wp-admin-dashly' ),    className: 'wpad-tab' },
	];

	const renderTab = ( name ) => {
		switch ( name ) {
			case 'presets':
				return (
					<PresetsTab
						presets={ presets }
						customPresets={ customPresets }
						activePreset={ prefs.preset }
						onApply={ applyPreset }
						onDelete={ handleDeleteCustomPreset }
					/>
				);
			case 'colors':
				return <ColorsTab colors={ prefs.colors } onUpdate={ updateColor } />;
			case 'typography':
				return <TypographyTab typography={ prefs.typography } fontOptions={ fontOptions } onUpdate={ updateTypography } />;
			case 'layout':
				return <LayoutTab layout={ prefs.layout } onUpdate={ updateLayout } />;
			case 'menu':
				return (
					<MenuOrganizer
						ref={ menuRef }
						onSaveStart={ () => setMenuSaving( true ) }
						onSaveEnd={ handleMenuSaveEnd }
						onDirtyChange={ setMenuDirty }
					/>
				);
			case 'general':
				return <GeneralTab enabled={ prefs.enabled } onChange={ updateEnabled } />;
			default:
				return null;
		}
	};

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
					{ ( isDirty || menuDirty ) && (
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
			{ showSavedFlash && (
				<Notice status="success" isDismissible={ false } className="wpad-notice">
					{ __( 'Saved!', 'wp-admin-dashly' ) }
				</Notice>
			) }

			<div className="wpad-grid">
				<div className="wpad-main">
					<TabPanel
						className="wpad-tabs"
						tabs={ tabs }
						onSelect={ setActiveTab }
					>
						{ ( tab ) => (
							<div className="wpad-tab-content">
								{ renderTab( tab.name ) }
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
						<ActionsPanel
							mode={ activeTab === 'menu' ? 'menu' : 'settings' }
							isDirty={ isDirty }
							saving={ status.saving }
							onSave={ handleSave }
							onDiscard={ handleDiscard }
							onReset={ handleReset }
							onSavePreset={ handleSaveAsPreset }
							menuDirty={ menuDirty }
							menuSaving={ menuSaving }
							onMenuSave={ () => menuRef.current?.save() }
							onMenuReset={ () => menuRef.current?.reset() }
						/>
					</div>
				</aside>
			</div>
		</div>
	);
}

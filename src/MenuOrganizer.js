/**
 * MenuOrganizer — per-user admin menu reorder, hide, relabel, and pin.
 *
 * Fetches the canonical WP menu from GET /menu and the user's saved diff
 * from GET /menu-preferences, then lets the user:
 *   - Drag to reorder items
 *   - Toggle visibility (eye icon)
 *   - Edit labels inline
 *   - Pin items to the top
 *
 * Changes are saved explicitly via the Save button (same UX as other tabs).
 */

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, Fragment } from '@wordpress/element';
import { Button, TextControl, Notice, Spinner } from '@wordpress/components';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
	arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getMenu, getMenuPrefs, saveMenuPrefs } from './api';

// ─── Single sortable row ────────────────────────────────────────────────────

function MenuRow( { item, prefs, onToggleHidden, onTogglePinned, onLabelChange } ) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable( { id: item.slug } );

	const style = {
		transform: CSS.Transform.toString( transform ),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const isHidden = prefs.hidden.includes( item.slug );
	const isPinned = prefs.pinned.includes( item.slug );
	const customLabel = prefs.labels[ item.slug ] || '';

	return (
		<div ref={ setNodeRef } style={ style } className={ `wpad-menu-row${ isHidden ? ' is-hidden' : '' }${ isPinned ? ' is-pinned' : '' }` }>
			{/* Drag handle */ }
			<span className="wpad-menu-drag" { ...attributes } { ...listeners } title="Drag to reorder">
				⠿
			</span>

			{/* Pin toggle */ }
			<button
				className={ `wpad-menu-pin${ isPinned ? ' is-active' : '' }` }
				onClick={ () => onTogglePinned( item.slug ) }
				title={ isPinned ? 'Unpin' : 'Pin to top' }
			>
				{ isPinned ? '★' : '☆' }
			</button>

			{/* Label — editable inline */ }
			<div className="wpad-menu-label">
				<TextControl
					value={ customLabel || item.label }
					onChange={ ( val ) => onLabelChange( item.slug, val === item.label ? '' : val ) }
					hideLabelFromVision
					label={ item.label }
				/>
				{ customLabel && customLabel !== item.label && (
					<span className="wpad-menu-original">{ item.label }</span>
				) }
			</div>

			{/* Visibility toggle */ }
			<button
				className={ `wpad-menu-eye${ isHidden ? ' is-hidden' : '' }` }
				onClick={ () => onToggleHidden( item.slug ) }
				title={ isHidden ? 'Show in menu' : 'Hide from menu' }
			>
				{ isHidden ? '🚫' : '👁' }
			</button>
		</div>
	);
}

// ─── Main component ─────────────────────────────────────────────────────────

const MenuOrganizer = forwardRef( function MenuOrganizer( { onSaveStart, onSaveEnd, onDirtyChange }, ref ) {
	const [ menuItems, setMenuItems ] = useState( [] );
	const [ prefs, setPrefs ]         = useState( { order: [], hidden: [], labels: {}, pinned: [] } );
	const [ savedKey, setSavedKey ]   = useState( '' ); // JSON snapshot of last-saved { prefs, sortOrder }
	const [ loading, setLoading ]     = useState( true );
	const [ saving, setSaving ]       = useState( false );
	const [ error, setError ]         = useState( null );

	// Ordered list of slugs used by SortableContext.
	const [ sortOrder, setSortOrder ] = useState( [] );

	useEffect( () => {
		Promise.all( [ getMenu(), getMenuPrefs() ] )
			.then( ( [ items, savedPrefs ] ) => {
				setMenuItems( items );
				setPrefs( savedPrefs );

				// Build display order: pinned first, then saved order, then remainder.
				const pinned    = savedPrefs.pinned || [];
				const order     = savedPrefs.order  || [];
				const slugs     = items.map( ( i ) => i.slug );
				const remaining = slugs.filter( ( s ) => ! pinned.includes( s ) && ! order.includes( s ) );
				const known     = order.filter( ( s ) => slugs.includes( s ) );
				const initialOrder = [ ...pinned, ...known, ...remaining ];
				setSortOrder( initialOrder );
				setSavedKey( JSON.stringify( { prefs: savedPrefs, sortOrder: initialOrder } ) );
			} )
			.catch( ( err ) => setError( err.message || 'Failed to load menu.' ) )
			.finally( () => setLoading( false ) );
	}, [] );

	// Notify parent whenever dirty state changes.
	useEffect( () => {
		if ( loading ) return;
		const isDirty = JSON.stringify( { prefs, sortOrder } ) !== savedKey;
		if ( onDirtyChange ) onDirtyChange( isDirty );
	}, [ prefs, sortOrder, savedKey, loading, onDirtyChange ] );

	const sensors = useSensors( useSensor( PointerSensor ) );

	const handleDragEnd = useCallback( ( event ) => {
		const { active, over } = event;
		if ( ! over || active.id === over.id ) return;
		setSortOrder( ( prev ) => {
			const oldIndex = prev.indexOf( active.id );
			const newIndex = prev.indexOf( over.id );
			return arrayMove( prev, oldIndex, newIndex );
		} );
	}, [] );

	const toggleHidden = useCallback( ( slug ) => {
		setPrefs( ( prev ) => {
			const hidden = prev.hidden.includes( slug )
				? prev.hidden.filter( ( s ) => s !== slug )
				: [ ...prev.hidden, slug ];
			return { ...prev, hidden };
		} );
	}, [] );

	const togglePinned = useCallback( ( slug ) => {
		setPrefs( ( prev ) => {
			const wasPinned  = prev.pinned.includes( slug );
			const nextPinned = wasPinned
				? prev.pinned.filter( ( s ) => s !== slug )
				: [ ...prev.pinned, slug ];

			// Move the slug to/from the pinned block. After the toggle the pinned
			// block occupies positions [0, nextPinned.length).
			setSortOrder( ( prevOrder ) => {
				const without = prevOrder.filter( ( s ) => s !== slug );
				if ( wasPinned ) {
					// Unpin: insert at the boundary between pinned and unpinned.
					return [ ...without.slice( 0, nextPinned.length ), slug, ...without.slice( nextPinned.length ) ];
				}
				// Pin: prepend so the new pinned item appears at the top.
				return [ slug, ...without ];
			} );

			return { ...prev, pinned: nextPinned };
		} );
	}, [] );

	const handleLabelChange = useCallback( ( slug, value ) => {
		setPrefs( ( prev ) => {
			const labels = { ...prev.labels };
			if ( value ) {
				labels[ slug ] = value;
			} else {
				delete labels[ slug ];
			}
			return { ...prev, labels };
		} );
	}, [] );

	const handleSave = useCallback( async () => {
		setSaving( true );
		setError( null );
		if ( onSaveStart ) onSaveStart();

		const pinnedSlugs        = prefs.pinned;
		const orderWithoutPinned = sortOrder.filter( ( s ) => ! pinnedSlugs.includes( s ) );

		const diff = {
			order:  orderWithoutPinned,
			hidden: prefs.hidden,
			labels: prefs.labels,
			pinned: pinnedSlugs,
		};

		try {
			await saveMenuPrefs( diff );
			const newPrefs = { ...prefs, order: orderWithoutPinned };
			setPrefs( newPrefs );
			setSavedKey( JSON.stringify( { prefs: newPrefs, sortOrder } ) );
			if ( onSaveEnd ) onSaveEnd( true ); // true = success
		} catch ( err ) {
			setError( err.message || 'Save failed.' );
			if ( onSaveEnd ) onSaveEnd( false );
		} finally {
			setSaving( false );
		}
	}, [ prefs, sortOrder, onSaveStart, onSaveEnd ] );

	const handleReset = useCallback( () => {
		const defaults     = { order: [], hidden: [], labels: {}, pinned: [] };
		const defaultOrder = menuItems.map( ( i ) => i.slug );
		setPrefs( defaults );
		setSortOrder( defaultOrder );
		// Reset counts as a pending change — user still needs to Save.
		// Mark dirty relative to current savedKey so the badge shows.
	}, [ menuItems ] );

	// Expose save/reset to the parent (App.js sidebar buttons) via ref.
	useImperativeHandle( ref, () => ( {
		save:    handleSave,
		reset:   handleReset,
		saving:  () => saving,
	} ), [ handleSave, handleReset, saving ] );

	if ( loading ) {
		return (
			<div className="wpad-loading">
				<Spinner /> Loading menu…
			</div>
		);
	}

	if ( error ) {
		return <Notice status="error" isDismissible={ false }>{ error }</Notice>;
	}

	// Build the display list from sortOrder, filtering out items not in menuItems.
	const slugToItem = Object.fromEntries( menuItems.map( ( i ) => [ i.slug, i ] ) );
	const displayList = sortOrder.filter( ( s ) => slugToItem[ s ] );
	const pinnedCount = prefs.pinned.length;

	return (
		<div className="wpad-menu-organizer">
			<p className="wpad-menu-help">
				Drag to reorder · ★ to pin · 👁 to show/hide · click the label to rename.
				Changes apply after you save and reload.
			</p>

			<DndContext sensors={ sensors } collisionDetection={ closestCenter } onDragEnd={ handleDragEnd }>
				<SortableContext items={ displayList } strategy={ verticalListSortingStrategy }>
					{ displayList.map( ( slug, index ) => (
						<Fragment key={ slug }>
							{ index === pinnedCount && pinnedCount > 0 && (
								<div className="wpad-menu-divider">Other items</div>
							) }
							<MenuRow
								item={ slugToItem[ slug ] }
								prefs={ prefs }
								onToggleHidden={ toggleHidden }
								onTogglePinned={ togglePinned }
								onLabelChange={ handleLabelChange }
							/>
						</Fragment>
					) ) }
				</SortableContext>
			</DndContext>

			{ error && (
				<Notice status="error" isDismissible={ false } className="wpad-notice">
					{ error }
				</Notice>
			) }
		</div>
	);
} );

export default MenuOrganizer;

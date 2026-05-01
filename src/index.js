/**
 * WP Admin Dashly — React entry point.
 *
 * Mounts the App into the #wpad-root div rendered by Admin_Page::render_page().
 */

import { createRoot, Component } from '@wordpress/element';
import App from './App';
import './index.css';

class ErrorBoundary extends Component {
	constructor( props ) {
		super( props );
		this.state = { error: null };
	}

	static getDerivedStateFromError( error ) {
		return { error };
	}

	render() {
		if ( this.state.error ) {
			return (
				<div style={ { padding: '24px', color: '#d63638' } }>
					<strong>WP Admin Dashly failed to load.</strong>{ ' ' }
					<span style={ { color: '#50575e' } }>
						{ this.state.error.message }
					</span>
				</div>
			);
		}
		return this.props.children;
	}
}

document.addEventListener( 'DOMContentLoaded', () => {
	const container = document.getElementById( 'wpad-root' );
	if ( ! container ) {
		return;
	}
	const root = createRoot( container );
	root.render(
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	);
} );

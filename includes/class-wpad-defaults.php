<?php
/**
 * Default preferences and built-in theme presets.
 *
 * @package WPAdminDashly
 */

namespace WPAdminDashly;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Defaults {

	/**
	 * Returns the default preferences object.
	 * This is the canonical shape for stored user preferences.
	 *
	 * @return array
	 */
	public static function get_defaults() {
		return array(
			'enabled'        => true,
			'colors'         => array(
				'accent'       => '#2271b1',
				'sidebar_bg'   => '#1d2327',
				'sidebar_text' => '#f0f0f1',
				'admin_bar_bg' => '#1d2327',
			),
			'typography'     => array(
				'font_family' => 'system',
				'font_size'   => 13,
			),
			'layout'         => array(
				'border_radius' => 4,
			),
			'preset'         => 'default',
			'schema_version' => 1,
		);
	}

	/**
	 * Built-in presets. Each preset is a partial preferences object
	 * that gets merged onto defaults.
	 *
	 * @return array
	 */
	public static function get_presets() {
		return array(
			'default' => array(
				'name'        => __( 'Default', 'wp-admin-dashly' ),
				'description' => __( 'Classic WordPress admin look.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#2271b1',
						'sidebar_bg'   => '#1d2327',
						'sidebar_text' => '#f0f0f1',
						'admin_bar_bg' => '#1d2327',
					),
					'typography' => array( 'font_family' => 'system', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 4 ),
				),
			),
			'midnight' => array(
				'name'        => __( 'Midnight', 'wp-admin-dashly' ),
				'description' => __( 'Deep blacks with violet accent.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#8b5cf6',
						'sidebar_bg'   => '#0f0f12',
						'sidebar_text' => '#e4e4e7',
						'admin_bar_bg' => '#0f0f12',
					),
					'typography' => array( 'font_family' => 'inter', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 8 ),
				),
			),
			'minimal' => array(
				'name'        => __( 'Minimal', 'wp-admin-dashly' ),
				'description' => __( 'Soft greys, generous spacing, sharp accent.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#111827',
						'sidebar_bg'   => '#f9fafb',
						'sidebar_text' => '#1f2937',
						'admin_bar_bg' => '#ffffff',
					),
					'typography' => array( 'font_family' => 'inter', 'font_size' => 14 ),
					'layout'     => array( 'border_radius' => 6 ),
				),
			),
			'nord' => array(
				'name'        => __( 'Nord', 'wp-admin-dashly' ),
				'description' => __( 'Arctic blue-grey, easy on the eyes.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#5e81ac',
						'sidebar_bg'   => '#2e3440',
						'sidebar_text' => '#eceff4',
						'admin_bar_bg' => '#242933',
					),
					'typography' => array( 'font_family' => 'inter', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 6 ),
				),
			),
			'ocean' => array(
				'name'        => __( 'Ocean', 'wp-admin-dashly' ),
				'description' => __( 'Deep navy with bright cyan accent.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#00b4d8',
						'sidebar_bg'   => '#0d1b2a',
						'sidebar_text' => '#caf0f8',
						'admin_bar_bg' => '#03045e',
					),
					'typography' => array( 'font_family' => 'inter', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 8 ),
				),
			),
			'forest' => array(
				'name'        => __( 'Forest', 'wp-admin-dashly' ),
				'description' => __( 'Dark greens with sage tones.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#52b788',
						'sidebar_bg'   => '#1a2e1a',
						'sidebar_text' => '#d8f3dc',
						'admin_bar_bg' => '#081c15',
					),
					'typography' => array( 'font_family' => 'system', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 6 ),
				),
			),
			'rose' => array(
				'name'        => __( 'Rose', 'wp-admin-dashly' ),
				'description' => __( 'Deep plum with hot pink accent.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#e879a0',
						'sidebar_bg'   => '#1f1523',
						'sidebar_text' => '#fce4ec',
						'admin_bar_bg' => '#12091a',
					),
					'typography' => array( 'font_family' => 'inter', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 10 ),
				),
			),
			'slate' => array(
				'name'        => __( 'Slate', 'wp-admin-dashly' ),
				'description' => __( 'Ink black with indigo accent.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#6366f1',
						'sidebar_bg'   => '#0f172a',
						'sidebar_text' => '#e2e8f0',
						'admin_bar_bg' => '#020617',
					),
					'typography' => array( 'font_family' => 'inter', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 8 ),
				),
			),
			'sunset' => array(
				'name'        => __( 'Sunset', 'wp-admin-dashly' ),
				'description' => __( 'Warm dark purple with orange pop.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#ff6b35',
						'sidebar_bg'   => '#2d1b2e',
						'sidebar_text' => '#ffddd2',
						'admin_bar_bg' => '#1a0a1e',
					),
					'typography' => array( 'font_family' => 'roboto', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 8 ),
				),
			),
			'indigo' => array(
				'name'        => __( 'Indigo', 'wp-admin-dashly' ),
				'description' => __( 'Rich indigo — Linear, Vercel-inspired.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#818cf8',
						'sidebar_bg'   => '#312e81',
						'sidebar_text' => '#e0e7ff',
						'admin_bar_bg' => '#1e1b4b',
					),
					'typography' => array( 'font_family' => 'inter', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 8 ),
				),
			),
			'corporate' => array(
				'name'        => __( 'Corporate', 'wp-admin-dashly' ),
				'description' => __( 'Enterprise navy — trusted, professional.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#0ea5e9',
						'sidebar_bg'   => '#1e3a5f',
						'sidebar_text' => '#bae6fd',
						'admin_bar_bg' => '#0c2340',
					),
					'typography' => array( 'font_family' => 'open-sans', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 4 ),
				),
			),
			'charcoal' => array(
				'name'        => __( 'Charcoal', 'wp-admin-dashly' ),
				'description' => __( 'Dark grey with teal — analytics dashboard style.', 'wp-admin-dashly' ),
				'preferences' => array(
					'colors'     => array(
						'accent'       => '#14b8a6',
						'sidebar_bg'   => '#1f2937',
						'sidebar_text' => '#d1d5db',
						'admin_bar_bg' => '#111827',
					),
					'typography' => array( 'font_family' => 'inter', 'font_size' => 13 ),
					'layout'     => array( 'border_radius' => 6 ),
				),
			),
		);
	}

	/**
	 * Available font families. Keys are stored values; arrays carry
	 * label and CSS font-family stack for the frontend/injector.
	 *
	 * @return array
	 */
	public static function get_font_families() {
		return array(
			'system'           => array(
				'label' => __( 'System Default', 'wp-admin-dashly' ),
				'stack' => '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
			),
			'inter'            => array(
				'label'      => 'Inter',
				'stack'      => '"Inter", -apple-system, sans-serif',
				'google_url' => 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
			),
			'roboto'           => array(
				'label'      => 'Roboto',
				'stack'      => '"Roboto", -apple-system, sans-serif',
				'google_url' => 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
			),
			'poppins'          => array(
				'label'      => 'Poppins',
				'stack'      => '"Poppins", -apple-system, sans-serif',
				'google_url' => 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
			),
			'dm-sans'          => array(
				'label'      => 'DM Sans',
				'stack'      => '"DM Sans", -apple-system, sans-serif',
				'google_url' => 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
			),
			'plus-jakarta'     => array(
				'label'      => 'Plus Jakarta Sans',
				'stack'      => '"Plus Jakarta Sans", -apple-system, sans-serif',
				'google_url' => 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
			),
			'nunito'           => array(
				'label'      => 'Nunito',
				'stack'      => '"Nunito", -apple-system, sans-serif',
				'google_url' => 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
			),
			'lato'             => array(
				'label'      => 'Lato',
				'stack'      => '"Lato", -apple-system, sans-serif',
				'google_url' => 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
			),
			'open-sans'        => array(
				'label'      => 'Open Sans',
				'stack'      => '"Open Sans", -apple-system, sans-serif',
				'google_url' => 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
			),
			'merriweather'     => array(
				'label'      => 'Merriweather',
				'stack'      => '"Merriweather", Georgia, serif',
				'google_url' => 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
			),
		);
	}
}

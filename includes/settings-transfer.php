<?php
/** Portable settings only. Never transfer credentials, content, or update caches. */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function ceb_hub_sort_export_settings(): array {
	$colors = ceb_hub_sort_heading_colors();
	$statuses = array();
	foreach ( ceb_hub_sort_status_styles() as $group => $style ) {
		$statuses[ $group ] = array_intersect_key( $style, array_flip( array( 'background', 'text' ) ) );
	}
	return array(
		'enabled' => '0' !== get_option( 'ceb_hub_sort_enabled', '1' ),
		'show_sidebar_icon' => '0' !== get_option( 'ceb_hub_sort_show_sidebar_icon', '1' ),
		'hide_native_content_hub' => '1' === get_option( 'ceb_hub_sort_hide_native_content_hub', '0' ),
		'editor_access' => ceb_hub_sort_editor_access(),
		'show_wordpress_edit' => '0' !== get_option( 'ceb_hub_sort_show_wordpress_edit', '1' ),
		'default_view' => ceb_hub_sort_default_view(),
		'panel_default_view' => get_option( 'ceb_hub_sort_panel_default_view', 'list' ),
		'actions_layout' => ceb_hub_sort_actions_layout(),
		'default_column' => ceb_hub_sort_default_column(),
		'default_order' => ceb_hub_sort_default_order(),
		'term_default_column' => ceb_hub_sort_term_default_column(),
		'term_default_order' => ceb_hub_sort_term_default_order(),
		'active_bg' => $colors[0],
		'active_text' => $colors[1],
		'button_styles' => ceb_hub_sort_button_styles(),
		'status_styles' => $statuses,
		'hierarchy_style' => ceb_hub_sort_hierarchy_style(),
	);
}

function ceb_hub_sort_transfer_keys_match( array $values, array $expected ): bool {
	return ! array_diff_key( $values, $expected ) && ! array_diff_key( $expected, $values );
}

/** Build requests for the same validators used by the settings interface. */
function ceb_hub_sort_transfer_requests( array $document ) {
	$invalid = new WP_Error( 'ceb_hub_sort_invalid_transfer', __( 'Choose a complete Content Explorer for Bricks settings export in a supported format.', 'content-explorer-for-bricks' ), array( 'status' => 400 ) );
	if ( ( $document['plugin'] ?? null ) !== 'content-explorer-for-bricks' || ( $document['format_version'] ?? null ) !== 1 || ! isset( $document['settings'] ) || ! is_array( $document['settings'] ) ) {
		return $invalid;
	}
	$settings = $document['settings'];
	// Earlier version-1 exports predate the panel preference. Preserve the local preference.
	if ( ! array_key_exists( 'panel_default_view', $settings ) ) { $settings['panel_default_view'] = get_option( 'ceb_hub_sort_panel_default_view', 'list' ); }
	if ( ! array_key_exists( 'hide_native_content_hub', $settings ) ) { $settings['hide_native_content_hub'] = '1' === get_option( 'ceb_hub_sort_hide_native_content_hub', '0' ); }
	if ( ! array_key_exists( 'editor_access', $settings ) ) {
		$settings['editor_access'] = ceb_hub_sort_editor_access();
	}
	$expected = ceb_hub_sort_export_settings();
	if ( ! ceb_hub_sort_transfer_keys_match( $settings, $expected ) ) {
		return $invalid;
	}
	$requests = array();
	foreach ( array( 'button_styles' => 'button_style', 'status_styles' => 'status_style' ) as $plural => $singular ) {
		if ( ! is_array( $settings[ $plural ] ) || ! ceb_hub_sort_transfer_keys_match( $settings[ $plural ], $expected[ $plural ] ) ) {
			return $invalid;
		}
		foreach ( $settings[ $plural ] as $group => $style ) {
			if ( ! is_array( $style ) || ! ceb_hub_sort_transfer_keys_match( $style, $expected[ $plural ][ $group ] ) ) {
				return $invalid;
			}
			$requests[] = array( $singular => array_merge( $style, array( 'group' => $group ) ) );
		}
		unset( $settings[ $plural ] );
	}
	if ( ! is_array( $settings['hierarchy_style'] ) || ! ceb_hub_sort_transfer_keys_match( $settings['hierarchy_style'], $expected['hierarchy_style'] ) ) {
		return $invalid;
	}
	$requests[] = $settings;
	return $requests;
}

add_action( 'rest_api_init', static function (): void {
	register_rest_route( 'ceb-hub-sort/v1', '/settings/transfer', array(
		array(
			'methods' => WP_REST_Server::READABLE,
			'permission_callback' => static function (): bool { return current_user_can( 'manage_options' ); },
			'callback' => static function () {
				$header = get_file_data( dirname( __DIR__ ) . '/content-explorer-for-bricks.php', array( 'version' => 'Version' ) );
				$response = rest_ensure_response( array(
					'plugin' => 'content-explorer-for-bricks',
					'format_version' => 1,
					'plugin_version' => $header['version'],
					'settings' => ceb_hub_sort_export_settings(),
				) );
				$response->header( 'Cache-Control', 'no-store' );
				return $response;
			},
		),
		array(
			'methods' => WP_REST_Server::CREATABLE,
			'permission_callback' => static function (): bool { return current_user_can( 'manage_options' ); },
			'args' => array( 'document' => array( 'type' => 'object', 'required' => true ) ),
			'callback' => static function ( WP_REST_Request $request ) {
				$document = $request->get_param( 'document' );
				if ( strlen( wp_json_encode( $document ) ) > 262144 ) {
					return new WP_Error( 'ceb_hub_sort_large_transfer', __( 'Settings files must be smaller than 256 KB.', 'content-explorer-for-bricks' ), array( 'status' => 400 ) );
				}
				$payloads = ceb_hub_sort_transfer_requests( $document );
				if ( is_wp_error( $payloads ) ) {
					return $payloads;
				}
				// Validate every group before the first setting is changed.
				foreach ( $payloads as $payload ) {
					$validation = new WP_REST_Request( 'POST', '/ceb-hub-sort/v1/settings' );
					$validation->set_body_params( array_merge( $payload, array( 'validate_only' => true ) ) );
					$result = rest_do_request( $validation );
					if ( $result->get_status() >= 400 ) {
						return $result;
					}
				}
				foreach ( $payloads as $payload ) {
					$update = new WP_REST_Request( 'POST', '/ceb-hub-sort/v1/settings' );
					$update->set_body_params( $payload );
					$result = rest_do_request( $update );
					if ( $result->get_status() >= 400 ) {
						return $result;
					}
				}
				return rest_ensure_response( array( 'imported' => true ) );
			},
		),
	) );
}, 20 );

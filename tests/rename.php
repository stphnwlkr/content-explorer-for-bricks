<?php
/** Backward-compatible settings identity across the directory naming change. */
if ( '1' !== getenv( 'CEB_ISOLATED_TEST' ) || empty( $argv[1] ) ) { exit( 1 ); }
require $argv[1];
$admin = get_users( array( 'role' => 'administrator', 'number' => 1 ) )[0]->ID;
wp_set_current_user( $admin );
$count = 0;
$assert = static function ( bool $ok, string $label ) use ( &$count ): void {
	if ( ! $ok ) { throw new RuntimeException( $label ); }
	++$count; echo "PASS: $label\n";
};
$before = get_option( 'ceb_hub_sort_actions_layout', false );
try {
	update_option( 'ceb_hub_sort_actions_layout', 'split' );
	$assert( 'split' === ceb_hub_sort_export_settings()['actions_layout'], 'Existing option keys still supply preferences' );
	$settings = ceb_hub_sort_export_settings();
	foreach ( array( 'content-explorer-for-bricks', 'uplink-content-explorer-for-bricks' ) as $identity ) {
		$result = ceb_hub_sort_transfer_requests( array( 'plugin' => $identity, 'format_version' => 1, 'settings' => $settings ) );
		$assert( is_array( $result ) && count( $result ) > 0, 'Accepts settings export identity: ' . $identity );
	}
	$invalid = ceb_hub_sort_transfer_requests( array( 'plugin' => 'unrelated-plugin', 'format_version' => 1, 'settings' => $settings ) );
	$assert( is_wp_error( $invalid ), 'Unrelated plugin exports remain rejected' );
	$response = rest_do_request( new WP_REST_Request( 'GET', '/ceb-hub-sort/v1/settings/transfer' ) );
	$data = $response->get_data();
	$assert( 200 === $response->get_status() && 'uplink-content-explorer-for-bricks' === $data['plugin'], 'New exports use the new directory identity' );
	$assert( '0.9.8' === $data['plugin_version'], 'Settings export resolves renamed main file and current version' );
	echo "SUCCESS: $count rename assertions\n";
} finally {
	if ( false === $before ) { delete_option( 'ceb_hub_sort_actions_layout' ); }
	else { update_option( 'ceb_hub_sort_actions_layout', $before ); }
}

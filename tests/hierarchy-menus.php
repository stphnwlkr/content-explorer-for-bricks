<?php
/** Regression coverage for saved menus and hierarchy; isolated WordPress only. */
if ( '1' !== getenv( 'CEB_ISOLATED_TEST' ) || empty( $argv[1] ) ) { exit( 1 ); }
require $argv[1];
$admin = get_users( array( 'role' => 'administrator', 'number' => 1 ) )[0]->ID;
wp_set_current_user( $admin );
$posts = array();
$menu = 0;
$count = 0;
$assert = static function ( bool $ok, string $message ) use ( &$count ): void {
	if ( ! $ok ) { throw new RuntimeException( $message ); }
	++$count;
	echo "PASS: $message\n";
};
$make = static function ( string $title, int $parent = 0, string $status = 'publish' ) use ( &$posts, $admin ): int {
	$id = wp_insert_post( array( 'post_type' => 'page', 'post_title' => $title, 'post_status' => $status, 'post_parent' => $parent, 'post_author' => $admin ) );
	$posts[] = $id;
	return $id;
};
$map = static function ( int $id ): array {
	$request = new WP_REST_Request( 'GET', '/ceb-hub-sort/v1/connections/' . $id );
	for ( $i = 0; $i < 100; ++$i ) {
		$response = rest_do_request( $request );
		if ( 200 !== $response->get_status() ) { throw new RuntimeException( 'Map request failed' ); }
		$data = $response->get_data();
		if ( ! $data['indexing'] ) { return $data; }
	}
	throw new RuntimeException( 'Index did not finish in bounded test requests' );
};
$ids = static fn( array $nodes ): array => array_column( $nodes, 'id' );
try {
	$parent = $make( 'CEB About fixture' );
	$child = $make( 'CEB Staff fixture', $parent );
	$other = $make( 'CEB Contact fixture', $parent );
	$grandchild = $make( 'CEB Grandchild fixture', $child );
	$trashed = $make( 'CEB Trashed fixture', $parent, 'trash' );
	$data = $map( $parent );
	$assert( $data['hierarchy'] && array() === $data['parents'], 'Top-level hierarchical page has no parent' );
	$assert( in_array( $child, $ids( $data['children'] ), true ) && in_array( $other, $ids( $data['children'] ), true ), 'Child pages appear without content links' );
	$assert( ! in_array( $grandchild, $ids( $data['children'] ), true ) && ! in_array( $trashed, $ids( $data['children'] ), true ), 'Only direct, nontrashed children appear' );
	$assert( array() === $data['to'], 'Hierarchy does not manufacture content links' );
	$assert( array( $parent ) === $ids( $map( $child )['parents'] ), 'Child map exposes its parent' );
	wp_update_post( array( 'ID' => $other, 'post_parent' => $child ) );
	$assert( ! in_array( $other, $ids( $map( $parent )['children'] ), true ), 'Reparenting removes the old structural connection immediately' );
	$assert( in_array( $other, $ids( $map( $child )['children'] ), true ), 'Reparenting adds the new structural connection immediately' );
	$menu = wp_create_nav_menu( 'CEB menu ' . wp_generate_password( 8, false ) );
	if ( is_wp_error( $menu ) ) { throw new RuntimeException( $menu->get_error_message() ); }
	$item = wp_update_nav_menu_item( $menu, 0, array( 'menu-item-title' => 'Staff', 'menu-item-object' => 'page', 'menu-item-object-id' => $child, 'menu-item-type' => 'post_type', 'menu-item-status' => 'publish' ) );
	wp_update_nav_menu_item( $menu, 0, array( 'menu-item-title' => 'Contact URL', 'menu-item-url' => get_permalink( $other ), 'menu-item-type' => 'custom', 'menu-item-status' => 'publish' ) );
	wp_update_nav_menu_item( $menu, 0, array( 'menu-item-title' => 'External', 'menu-item-url' => 'https://example.invalid/external/', 'menu-item-type' => 'custom', 'menu-item-status' => 'publish' ) );
	update_post_meta( $parent, '_bricks_page_content_2', array( array( 'name' => 'nav-menu', 'settings' => array( 'menu' => (string) $menu ) ) ) );
	$links = ceb_hub_bricks_connections( $parent )['links'];
	sort( $links );
	$expected = array( $child, $other ); sort( $expected );
	$assert( $expected === $links, 'Saved Nav Menu resolves page items and local custom URLs, excluding external URLs' );
	$assert( in_array( $child, $ids( $map( $parent )['to'] ), true ), 'Menu-derived links appear in outgoing item connections' );
	$assert( in_array( $parent, $ids( $map( $child )['from'] ), true ), 'Menu-derived links appear in reverse connections' );
	update_option( 'ceb_hub_map_cursor_v1', -1 );
	wp_update_nav_menu_item( $menu, $item, array( 'menu-item-title' => 'Contact', 'menu-item-object' => 'page', 'menu-item-object-id' => $other, 'menu-item-type' => 'post_type', 'menu-item-status' => 'publish' ) );
	$assert( false === get_option( 'ceb_hub_map_cursor_v1', false ), 'Menu-item edits invalidate the bounded index' );
	$assert( ! in_array( $parent, $ids( $map( $child )['from'] ), true ), 'Changed menu item removes its stale reverse link' );
	wp_delete_nav_menu( $menu ); $menu = 0;
	$assert( array() === ceb_hub_bricks_connections( $parent )['links'], 'Deleting a menu removes its saved-item links' );
	update_option( 'ceb_hub_map_index_version', 2 ); update_option( 'ceb_hub_map_cursor_v1', -1 );
	$map( $parent );
	$assert( 4 === (int) get_option( 'ceb_hub_map_index_version' ), 'Older indexes upgrade automatically' );
	wp_set_current_user( 0 );
	$request = new WP_REST_Request( 'GET', '/ceb-hub-sort/v1/connections/' . $parent );
	$assert( rest_do_request( $request )->get_status() >= 400, 'Anonymous visitors cannot read hierarchy or menu connection data' );
	echo "SUCCESS: $count hierarchy/menu assertions\n";
} finally {
	wp_set_current_user( $admin );
	if ( $menu ) { wp_delete_nav_menu( $menu ); }
	foreach ( array_reverse( $posts ) as $id ) { wp_delete_post( $id, true ); }
}

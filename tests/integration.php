<?php
/** Run only on a disposable WordPress copy: CEB_ISOLATED_TEST=1 php tests/integration.php /path/wp-config.php */
if ( '1' !== getenv( 'CEB_ISOLATED_TEST' ) || empty( $argv[1] ) ) {
	fwrite( STDERR, "An explicitly isolated WordPress bootstrap is required.\n" );
	exit( 1 );
}
require $argv[1];
require_once ABSPATH . 'wp-admin/includes/user.php';
$admin = get_users( array( 'role' => 'administrator', 'number' => 1 ) )[0]->ID;
wp_set_current_user( $admin );
$posts = array();
$users = array();
$terms = array();
$count = 0;
$assert = static function ( bool $ok, string $message ) use ( &$count ): void {
	if ( ! $ok ) { throw new RuntimeException( $message ); }
	++$count;
	echo "PASS: $message\n";
};
$call = static function ( string $method, string $route, array $params = array() ) {
	$request = new WP_REST_Request( $method, '/ceb-hub-sort/v1/' . $route );
	$request->set_query_params( $params );
	$request->set_body_params( $params );
	return rest_do_request( $request );
};
try {
	$target = wp_insert_post( array( 'post_type' => 'page', 'post_title' => 'CEB target', 'post_status' => 'publish', 'post_author' => $admin ) ); $posts[] = $target;
	$source = wp_insert_post( array( 'post_type' => 'page', 'post_title' => 'CEB source', 'post_status' => 'draft', 'post_author' => $admin ) ); $posts[] = $source;
	$template = wp_insert_post( array( 'post_type' => 'bricks_template', 'post_title' => 'CEB reusable section', 'post_status' => 'publish', 'post_author' => $admin ) ); $posts[] = $template;
	update_post_meta( $source, '_bricks_page_content_2', array(
		array( 'name' => 'button', 'settings' => array( 'link' => array( 'type' => 'internal', 'postId' => (string) $target ) ) ),
		array( 'name' => 'template', 'settings' => array( 'template' => (string) $template ) ),
		array( 'name' => 'text', 'settings' => array( 'text' => '<a href="' . get_permalink( $target ) . '">Target</a>' ) ),
		array( 'name' => 'button', 'settings' => array( 'link' => array( 'url' => '{post_url}' ) ) ),
	) );
	$read = ceb_hub_bricks_connections( $source );
	$assert( array( $target ) === $read['links'], 'Saved internal and rich text links are deduplicated; dynamic URL excluded' );
	$assert( array( $template ) === $read['uses'], 'Saved Bricks Template elements are indexed' );
	$assert( in_array( $target, array_map( 'intval', get_post_meta( $source, '_ceb_hub_map_link' ) ), true ), 'Metadata save immediately refreshes outgoing link index' );
	$assert( in_array( $template, array_map( 'intval', get_post_meta( $source, '_ceb_hub_map_uses' ) ), true ), 'Metadata save immediately refreshes shared template index' );
	$assert( '' !== CEB_Hub_Connections::ceb_edit_url( get_post( $source ) ), 'Administrator can open Bricks-supported page' );
	$assert( '' !== CEB_Hub_Connections::ceb_edit_url( get_post( $template ) ), 'Administrator can open Bricks template' );
	$assert( ! CEB_Hub_Connections::supports_ceb_type( 'attachment' ), 'Media does not receive an unsupported Bricks shortcut' );
	$assert( 0 === CEB_Hub_Connections::target( 'https://example.invalid/private/' ), 'External links are excluded' );
	$assert( 0 === CEB_Hub_Connections::target( '{post_url}' ), 'Dynamic expressions are excluded' );
	$title = CEB_Hub_Connections::title_data( '<em>Alpha</em> &amp; <strong>Beta</strong><script>alert(1)</script>' );
	$assert( str_contains( $title['title_html'], '<em>Alpha</em>' ) && ! str_contains( $title['title_html'], '<script>' ), 'Inline title formatting is retained and executable tags removed' );
	$list = $call( 'GET', 'posts', array( 'type' => 'page', 'search' => 'CEB source' ) );
	$assert( 200 === $list->get_status() && str_contains( wp_json_encode( $list->get_data() ), 'CEB source' ), 'Content list searches saved pages' );
	$list = $call( 'GET', 'posts', array( 'type' => 'bricks_template', 'search' => 'CEB reusable section' ) );
	$assert( 200 === $list->get_status() && str_contains( wp_json_encode( $list->get_data() ), 'CEB reusable section' ), 'Non-REST Bricks template posts are available in List' );
	$created = $call( 'POST', 'posts/create', array( 'type' => 'page', 'title' => 'CEB <em>formatted</em>', 'status' => 'draft' ) );
	$data = $created->get_data();
	$created_id = (int) ( $data['id'] ?? 0 );
	if ( $created_id ) { $posts[] = $created_id; }
	$assert( 201 === $created->get_status() && $created_id > 0, 'REST creation accepts safe inline titles' );
	$updated = $call( 'POST', 'posts/' . $source, array( 'type' => 'page', 'title' => 'CEB updated', 'status' => 'draft' ) );
	$assert( 200 === $updated->get_status() && 'CEB updated' === get_post( $source )->post_title, 'Quick edit updates saved content' );
	$term = $call( 'POST', 'terms/create', array( 'type' => 'category', 'name' => 'CEB fixture ' . wp_generate_password( 6, false ) ) );
	$term_id = (int) ( $term->get_data()['id'] ?? 0 ); if ( $term_id ) { $terms[] = $term_id; }
	$assert( 201 === $term->get_status() && $term_id > 0, 'Taxonomy creation works' );
	$map = $call( 'GET', 'connections/' . $source );
	$assert( 200 === $map->get_status() && str_contains( wp_json_encode( $map->get_data() ), 'CEB reusable section' ), 'Item map exposes explicit shared template usage' );
	$subscriber = wp_insert_user( array( 'user_login' => 'ceb-' . wp_generate_password( 10, false ), 'user_pass' => wp_generate_password(), 'role' => 'subscriber' ) ); $users[] = $subscriber;
	foreach ( array( 0, $subscriber ) as $denied_user ) {
		wp_set_current_user( $denied_user );
		foreach ( array(
			array( 'GET', 'posts', array( 'type' => 'page' ) ),
			array( 'GET', 'connections/' . $source, array() ),
			array( 'GET', 'connections/site', array() ),
			array( 'POST', 'posts/create', array( 'type' => 'page', 'title' => 'Denied', 'status' => 'draft' ) ),
			array( 'POST', 'posts/' . $source, array( 'type' => 'page', 'title' => 'Denied', 'status' => 'draft' ) ),
			array( 'DELETE', 'posts/' . $source, array( 'type' => 'page' ) ),
			array( 'POST', 'settings', array( 'default_order' => 'asc' ) ),
			array( 'GET', 'settings/transfer', array() ),
			array( 'GET', 'terms', array( 'type' => 'category' ) ),
		) as [ $method, $route, $params ] ) {
			$assert( $call( $method, $route, $params )->get_status() >= 400, "User $denied_user denied $method $route" );
		}
		$assert( '' === CEB_Hub_Connections::ceb_edit_url( get_post( $source ) ), "User $denied_user receives no Bricks edit URL" );
	}
	wp_set_current_user( $admin );
	delete_post_meta( $source, '_bricks_page_content_2' );
	$assert( array() === get_post_meta( $source, '_ceb_hub_map_link' ), 'Deleting Bricks element metadata removes stale outgoing links' );
	echo "SUCCESS: $count assertions\n";
} finally {
	wp_set_current_user( $admin );
	foreach ( $posts as $id ) { wp_delete_post( $id, true ); }
	foreach ( $terms as $id ) { wp_delete_term( $id, 'category' ); }
	foreach ( $users as $id ) { wp_delete_user( $id ); }
}

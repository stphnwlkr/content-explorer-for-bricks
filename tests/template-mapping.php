<?php
/** Singular template assignment regressions against the installed Bricks resolver. */
if ( '1' !== getenv( 'CEB_ISOLATED_TEST' ) || empty( $argv[1] ) ) { exit( 1 ); }
require $argv[1];
$admin = get_users( array( 'role' => 'administrator', 'number' => 1 ) )[0]->ID;
wp_set_current_user( $admin );
$posts = array(); $count = 0;
$assert = static function ( bool $ok, string $message ) use ( &$count ): void {
	if ( ! $ok ) { throw new RuntimeException( $message ); }
	++$count; echo "PASS: $message\n";
};
$make = static function ( string $title, string $type = 'page', int $parent = 0 ) use ( &$posts, $admin ): int {
	$id = wp_insert_post( array( 'post_type' => $type, 'post_title' => $title, 'post_status' => 'publish', 'post_parent' => $parent, 'post_author' => $admin ) );
	$posts[] = $id; return $id;
};
$template = static function ( string $name, string $type, array $conditions ) use ( $make ): int {
	$id = $make( $name, 'bricks_template' );
	update_post_meta( $id, '_bricks_template_type', $type );
	update_post_meta( $id, '_bricks_template_settings', array( 'templateConditions' => $conditions ) );
	return $id;
};
$map = static function ( int $id ): array {
	for ( $i = 0; $i < 100; ++$i ) {
		$response = rest_do_request( new WP_REST_Request( 'GET', '/ceb-hub-sort/v1/connections/' . $id ) );
		if ( 200 !== $response->get_status() ) { throw new RuntimeException( 'Map denied' ); }
		$data = $response->get_data();
		if ( ! $data['indexing'] ) { return $data; }
	}
	throw new RuntimeException( 'Index did not finish' );
};
$ids = static fn( array $nodes ): array => array_column( $nodes, 'id' );
try {
	$about = $make( 'CEB mapping About' );
	$staff = $make( 'CEB mapping Staff', 'page', $about );
	$contact = $make( 'CEB mapping Contact', 'page', $about );
	$target = $make( 'CEB mapping target' );
	$body = $template( 'CEB mapping About body', 'content', array( array( 'main' => 'ids', 'ids' => array( "$about" ), 'idsIncludeChildren' => true ) ) );
	$header = $template( 'CEB mapping header', 'header', array( array( 'main' => 'ids', 'ids' => array( "$about" ), 'idsIncludeChildren' => true ) ) );
	$footer = $template( 'CEB mapping footer', 'footer', array( array( 'main' => 'ids', 'ids' => array( "$about" ), 'idsIncludeChildren' => true ) ) );
	$section = $template( 'CEB mapping nested section', 'section', array() );
	update_post_meta( $section, '_bricks_page_content_2', array( array( 'name' => 'button', 'settings' => array( 'link' => array( 'type' => 'internal', 'postId' => "$target" ) ) ), array( 'name' => 'template', 'settings' => array( 'template' => "$body" ) ) ) );
	update_post_meta( $body, '_bricks_page_content_2', array( array( 'name' => 'button', 'settings' => array( 'link' => array( 'type' => 'internal', 'postId' => "$contact" ) ) ), array( 'name' => 'template', 'settings' => array( 'template' => "$section" ) ) ) );
	$before_query = $GLOBALS['wp_query']; $before_post = $GLOBALS['post'] ?? null;
	$assigned = ceb_hub_bricks_templates( get_post( $about ) );
	$assert( count( array_intersect( array( $body, $header, $footer ), $assigned ) ) === 3, 'Specific page resolves body, header and footer assignments' );
	$assert( $GLOBALS['wp_query'] === $before_query && ( $GLOBALS['post'] ?? null ) === $before_post, 'Resolver restores original query and editing post' );
	$assert( in_array( $body, ceb_hub_bricks_templates( get_post( $staff ) ), true ), 'Include children applies template to a descendant' );
	$data = $map( $about );
	$assert( in_array( $body, $ids( $data['uses'] ), true ), 'Page map shows assigned body template under Uses' );
	$assert( in_array( $contact, $ids( $data['to'] ), true ), 'Page inherits outgoing links saved on assigned template' );
	$assert( in_array( $target, $ids( $data['to'] ), true ), 'Nested template links are inherited without cycle recursion' );
	$assert( in_array( $staff, $ids( $map( $body )['used_by'] ), true ), 'Template Used by includes condition-matched pages' );
	$assert( in_array( $about, $ids( $map( $target )['from'] ), true ), 'Inherited outgoing links also appear in reverse connections' );
	update_post_meta( $staff, '_bricks_page_settings', array( 'headerDisabled' => true ) );
	$assert( ! in_array( $header, ceb_hub_bricks_templates( get_post( $staff ) ), true ), 'Per-page header disable suppresses assigned header' );
	update_post_meta( $body, '_bricks_page_settings', array( 'footerDisabled' => true ) );
	$assert( ! in_array( $footer, ceb_hub_bricks_templates( get_post( $about ) ), true ), 'Body template footer disable suppresses assigned footer' );
	update_post_meta( $body, '_bricks_template_settings', array( 'templateConditions' => array( array( 'main' => 'ids', 'ids' => array( "$about" ), 'idsIncludeChildren' => true ), array( 'main' => 'ids', 'ids' => array( "$staff" ), 'exclude' => true ) ) ) );
	$assert( ! in_array( $body, ceb_hub_bricks_templates( get_post( $staff ) ), true ), 'Native exclusion overrides a matching include condition' );
	$assert( ! in_array( $staff, $ids( $map( $body )['used_by'] ), true ), 'Condition edit removes stale reverse usage after bounded rebuild' );
	$specific = $template( 'CEB mapping Contact override', 'content', array( array( 'main' => 'ids', 'ids' => array( "$contact" ) ) ) );
	$assigned = ceb_hub_bricks_templates( get_post( $contact ) );
	$assert( in_array( $specific, $assigned, true ) && ! in_array( $body, $assigned, true ), 'Specific post condition outranks inherited ancestor condition' );
	update_post_meta( $body, '_bricks_page_content_2', array() );
	$assert( ! in_array( $about, $ids( $map( $target )['from'] ), true ), 'Template content edits remove stale inherited incoming links' );
	wp_update_post( array( 'ID' => $body, 'post_status' => 'draft' ) );
	$assert( ! in_array( $body, ceb_hub_bricks_templates( get_post( $about ) ), true ), 'Unpublished templates are excluded from assignments' );
	$assert( array() === ceb_hub_bricks_templates( get_post( $header ) ), 'Template editor does not accidentally map a preview page assignment' );
	echo "SUCCESS: $count template-mapping assertions\n";
} finally {
	wp_set_current_user( $admin );
	foreach ( array_reverse( $posts ) as $id ) { wp_delete_post( $id, true ); }
}

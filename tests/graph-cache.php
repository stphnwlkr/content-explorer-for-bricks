<?php
/** Exercise graph-cache freshness on the same disposable installation as integration.php. */
if ( '1' !== getenv( 'CEB_ISOLATED_TEST' ) || empty( $argv[1] ) ) {
	fwrite( STDERR, "An explicitly isolated WordPress bootstrap is required.\n" );
	exit( 1 );
}
require $argv[1];
wp_set_current_user( get_users( array( 'role' => 'administrator', 'number' => 1 ) )[0]->ID );
$posts = array();
$terms = array();
$count = 0;
$assert = static function ( bool $ok, string $message ) use ( &$count ): void {
	if ( ! $ok ) { throw new RuntimeException( $message ); }
	++$count;
	echo "PASS: $message\n";
};
$site = static function ( int $after ): array {
	$request = new WP_REST_Request( 'GET' );
	$request->set_param( 'after', $after );
	return CEB_Hub_Connections::site( $request )->get_data();
};
$term_map = static function ( int $after ): array {
	$request = new WP_REST_Request( 'GET' );
	$request->set_param( 'after', $after );
	return CEB_Hub_Connections::graph_terms( $request )->get_data();
};
$scans = array( 'posts' => 0, 'terms' => 0 );
$after_post = -1;
$after_term = -1;
$observe = static function ( string $query ) use ( &$scans, &$after_post, &$after_term ): string {
	if ( str_contains( $query, "WHERE ID > $after_post " ) ) { ++$scans['posts']; }
	if ( str_contains( $query, "WHERE term_taxonomy_id > $after_term " ) ) { ++$scans['terms']; }
	return $query;
};
$related = 0;
$source = 0;
$provider = static function ( array $edges, WP_Post $post ) use ( &$related, &$source ): array {
	return $post->ID === $source && $related ? array( $related => array( 'Fixture relationship' ) ) : $edges;
};
try {
	$a = wp_insert_post( array( 'post_type' => 'page', 'post_title' => 'CEB cache A', 'post_status' => 'publish' ) ); $posts[] = $a;
	$b = wp_insert_post( array( 'post_type' => 'page', 'post_title' => 'CEB cache B', 'post_status' => 'publish' ) ); $posts[] = $b;
	for ( $i = 0; $i < 100; $i++ ) { if ( empty( $site( 0 )['indexing'] ) ) { break; } }
	$after_post = $a - 1;
	add_filter( 'query', $observe );
	$first = $site( $after_post );
	$second = $site( $after_post );
	$assert( 1 === $scans['posts'], 'Repeated site-map page reuses the ID scan cache' );
	$assert( array_column( $first['nodes'], 'id' ) === array_column( $second['nodes'], 'id' ), 'Warm cache preserves cursor results' );
	$c = wp_insert_post( array( 'post_type' => 'page', 'post_title' => 'CEB cache C', 'post_status' => 'publish' ) ); $posts[] = $c;
	$next = $site( $after_post );
	$assert( 2 === $scans['posts'] && in_array( $c, array_column( $next['nodes'], 'id' ), true ), 'A newly saved post invalidates the ID scan cache' );
	wp_trash_post( $b );
	$next = $site( $after_post );
	$assert( ! in_array( $b, array_column( $next['nodes'], 'id' ), true ), 'A trashed post disappears from the next cached scan' );
	update_post_meta( $c, '_bricks_page_content_2', array( array( 'name' => 'button', 'settings' => array( 'link' => array( 'type' => 'internal', 'postId' => $a ) ) ) ) );
	$next = $site( $after_post );
	$assert( (bool) array_filter( $next['edges'], static fn( array $edge ): bool => $edge['from'] === $c && $edge['to'] === $a && 'link' === $edge['kind'] ), 'Bricks metadata updates refresh map edges after a cached scan' );
	$one = wp_insert_term( 'CEB cache term ' . wp_generate_password( 8, false ), 'category' ); $terms[] = $one['term_id'];
	$after_term = $one['term_taxonomy_id'] - 1;
	$term_map( $after_term ); $term_map( $after_term );
	$assert( 1 === $scans['terms'], 'Repeated taxonomy-map page reuses the term scan cache' );
	$two = wp_insert_term( 'CEB cache term ' . wp_generate_password( 8, false ), 'category' ); $terms[] = $two['term_id'];
	$next = $term_map( $after_term );
	$assert( 2 === $scans['terms'] && in_array( 'term:' . $two['term_id'], array_column( $next['nodes'], 'id' ), true ), 'New terms invalidate the term scan cache' );
	wp_delete_term( $one['term_id'], 'category' );
	$next = $term_map( $after_term );
	$assert( ! in_array( 'term:' . $one['term_id'], array_column( $next['nodes'], 'id' ), true ), 'Deleted terms disappear from the next cached scan' );
	remove_filter( 'query', $observe );
	$source = $c; $related = $a;
	add_filter( 'ceb_hub_sort_post_relationships', $provider, 10, 2 );
	CEB_Hub_Relationships::invalidate();
	for ( $i = 0; $i < 100; $i++ ) { if ( CEB_Hub_Relationships::batch() ) { break; } }
	$map = CEB_Hub_Relationships::for_post( get_post( $a ) );
	$assert( in_array( $c, array_column( $map['related_from'], 'id' ), true ), 'Relationship backfill populates incoming references' );
	$related = 0;
	update_post_meta( $c, '_ceb_test_relationship_refresh', 'changed' );
	CEB_Hub_Relationships::flush();
	$map = CEB_Hub_Relationships::for_post( get_post( $a ) );
	$assert( ! in_array( $c, array_column( $map['related_from'], 'id' ), true ), 'Relationship edits invalidate cached reverse lookups' );
	echo "SUCCESS: $count graph/cache assertions\n";
} finally {
	remove_filter( 'query', $observe );
	remove_filter( 'ceb_hub_sort_post_relationships', $provider, 10 );
	foreach ( $posts as $id ) { wp_delete_post( $id, true ); }
	foreach ( $terms as $id ) { wp_delete_term( $id, 'category' ); }
	CEB_Hub_Relationships::invalidate();
}

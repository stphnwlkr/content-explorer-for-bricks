<?php
/** Saved-content connections for the Content Hub. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

final class CEB_Hub_Connections {
	private const LINK = '_ceb_hub_map_link';
	private const USES = '_ceb_hub_map_uses';
	private const CURSOR = 'ceb_hub_map_cursor_v1';

	public static function types(): array {
		return array_values( array_unique( array_merge( get_post_types( array( 'public' => true ) ), get_post_types( array( 'show_in_rest' => true ) ), array( 'bricks_template', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation' ) ) ) );
	}

	/** Resolve only literal local URLs. Dynamic expressions are deliberately excluded. */
	public static function target( string $url ): int {
		$url = trim( html_entity_decode( $url, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
		if ( '' === $url || preg_match( '/[{}<>]/', $url ) || '#' === $url[0] ) { return 0; }
		$home = home_url( '/' );
		if ( str_starts_with( $url, '//' ) ) { $url = wp_parse_url( $home, PHP_URL_SCHEME ) . ':' . $url; }
		elseif ( '/' === $url[0] ) { $url = wp_parse_url( $home, PHP_URL_SCHEME ) . '://' . wp_parse_url( $home, PHP_URL_HOST ) . ( wp_parse_url( $home, PHP_URL_PORT ) ? ':' . wp_parse_url( $home, PHP_URL_PORT ) : '' ) . $url; }
		elseif ( ! preg_match( '#^https?://#i', $url ) ) { return 0; }
		if ( strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) ) !== strtolower( (string) wp_parse_url( $home, PHP_URL_HOST ) ) ) { return 0; }
		return (int) url_to_postid( $url );
	}

	/** Read the block tree without executing blocks, loops, shortcodes or custom code. */
	public static function extract( string $content ): array {
		$links = array(); $uses = array();
		$walk = static function ( array $blocks ) use ( &$walk, &$links, &$uses ): void {
			foreach ( $blocks as $block ) {
				$name = $block['blockName'] ?? ''; $attrs = $block['attrs'] ?? array();
				if ( in_array( $name, array( 'core/block', 'core/navigation' ), true ) && ! empty( $attrs['ref'] ) ) { $uses[] = absint( $attrs['ref'] ); }
				if ( 'core/template-part' === $name && ! empty( $attrs['slug'] ) ) {
					$part = get_block_template( ( $attrs['theme'] ?? get_stylesheet() ) . '//' . $attrs['slug'], 'wp_template_part' );
					if ( $part && ! empty( $part->wp_id ) ) { $uses[] = (int) $part->wp_id; }
				}
				$read = static function ( $values ) use ( &$read, &$links ): void {
					foreach ( (array) $values as $key => $value ) {
						if ( is_array( $value ) ) { $read( $value ); }
						elseif ( is_string( $value ) && in_array( strtolower( (string) $key ), array( 'href', 'url' ), true ) ) { $links[] = self::target( $value ); }
					}
				};
				$read( $attrs );
				$walk( $block['innerBlocks'] ?? array() );
			}
		};
		$walk( parse_blocks( $content ) );
		// Raw HTML and ordinary block markup also contain fixed links.
		if ( preg_match_all( '/\bhref\s*=\s*(["\'])(.*?)\1/is', $content, $matches ) ) {
			foreach ( $matches[2] as $url ) { $links[] = self::target( $url ); }
		}
		return array( 'links' => array_values( array_unique( array_filter( $links ) ) ), 'uses' => array_values( array_unique( array_filter( $uses ) ) ) );
	}

	public static function index( int $id ): void {
		$post = get_post( $id );
		if ( ! $post || wp_is_post_revision( $id ) || wp_is_post_autosave( $id ) || ! in_array( $post->post_type, self::types(), true ) ) { return; }
		$relations = self::extract( $post->post_content );
		$bricks = ceb_hub_bricks_connections( $id );
		foreach ( array( 'links', 'uses' ) as $kind ) { $relations[ $kind ] = array_values( array_unique( array_merge( $relations[ $kind ], $bricks[ $kind ] ) ) ); }
		$template = self::template_for( $post );
		if ( $template ) { $relations['uses'][] = $template; }
		foreach ( array( self::LINK => 'links', self::USES => 'uses' ) as $key => $kind ) {
			delete_post_meta( $id, $key );
			foreach ( array_diff( $relations[ $kind ], array( $id ) ) as $target ) { add_post_meta( $id, $key, $target ); }
		}
	}

	/** Keyset batches keep large sites out of a single request. Safe to repeat after interruption. */
	private static function batch(): bool {
		global $wpdb;
		if ( 3 !== (int) get_option( 'ceb_hub_map_index_version', 0 ) ) {
			delete_option( self::CURSOR );
			update_option( 'ceb_hub_map_index_version', 3, false );
		}
		$cursor = (int) get_option( self::CURSOR, 0 );
		if ( -1 === $cursor ) { return true; }
		$lock = 'ceb_hub_map_lock';
		if ( (int) get_option( $lock, 0 ) < time() - 60 ) { delete_option( $lock ); }
		if ( ! add_option( $lock, time(), '', false ) ) { return false; }
		try {
			$types = array_diff( self::types(), array( 'attachment', 'revision' ) );
			$placeholders = implode( ',', array_fill( 0, count( $types ), '%s' ) );
			$cache_key = 'index:' . md5( wp_json_encode( array( $cursor, $types, wp_cache_get_last_changed( 'posts' ) ) ) );
			$ids = wp_cache_get( $cache_key, 'ceb_hub_map' );
			if ( false === $ids ) {
				// A bounded ID cursor avoids offset scans. The only interpolated format fragment is generated %s placeholders; all values are bound. Results are cached and invalidated by core post/meta changes.
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE ID > %d AND post_type IN ($placeholders) ORDER BY ID ASC LIMIT 50", array_merge( array( $cursor ), array_values( $types ) ) ) );
				wp_cache_set( $cache_key, $ids, 'ceb_hub_map', 300 );
			}
			foreach ( $ids as $id ) { self::index( (int) $id ); }
			$done = count( $ids ) < 50;
			update_option( self::CURSOR, $done ? -1 : (int) end( $ids ), false );
			return $done;
		} finally { delete_option( $lock ); }
	}

	/** Respect the post types enabled in Bricks settings. */
	public static function supports_ceb_type( string $name ): bool {
		return class_exists( '\Bricks\Helpers' ) && ( 'bricks_template' === $name || array_key_exists( $name, \Bricks\Helpers::get_supported_post_types() ) );
	}

	public static function ceb_edit_url( WP_Post $post ): string {
		if ( ! ceb_hub_sort_can_open_ceb( $post->post_type ) || ! current_user_can( 'edit_post', $post->ID ) || ! \Bricks\Capabilities::current_user_can_use_builder( $post->ID ) ) { return ''; }
		return esc_url_raw( \Bricks\Helpers::get_builder_edit_link( $post->ID ) );
	}

	/** Keep formatting separate from the plain text used by graph labels and sorting. */
	public static function title_data( string $title ): array {
		$title = html_entity_decode( $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$tags = array_fill_keys( array( 'em', 'strong', 'b', 'i', 'mark', 's', 'del', 'sub', 'sup', 'span' ), array() );
		return array(
			'title' => wp_strip_all_tags( $title ),
			'title_html' => wp_kses( $title, $tags ),
		);
	}

	public static function node( int $id ): ?array {
		$post = get_post( $id );
		if ( ! $post || ! in_array( $post->post_type, self::types(), true ) || in_array( $post->post_status, array( 'trash', 'auto-draft' ), true ) || ! current_user_can( 'edit_post', $id ) ) { return null; }
		$type = get_post_type_object( $post->post_type );
		$title = self::title_data( get_the_title( $id ) );
		return array( 'id' => $id, 'title' => $title['title'] ?: '#' . $id, 'title_html' => $title['title_html'], 'created' => $post->post_date, 'author' => html_entity_decode( wp_strip_all_tags( (string) get_the_author_meta( 'display_name', $post->post_author ) ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ), 'post_type' => $post->post_type, 'type' => $type ? ( $type->labels->singular_name ?: $type->label ?: $post->post_type ) : $post->post_type, 'kind' => in_array( $post->post_type, array( 'bricks_template', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation' ), true ) ? 'shared' : 'page', 'status' => $post->post_status, 'path' => $type && is_post_type_viewable( $type ) ? wp_make_link_relative( (string) get_permalink( $id ) ) : '', 'edit_url' => ceb_hub_sort_wordpress_edit_url( $post ), 'ceb_edit_url' => self::ceb_edit_url( $post ), 'parent' => (int) $post->post_parent, 'public' => (bool) ( $type && $type->public ), 'type_label' => $type ? ( $type->labels->name ?: $post->post_type ) : $post->post_type, 'view_url' => is_post_publicly_viewable( $post ) ? (string) get_permalink( $post ) : '', 'type_manage_url' => $type && $type->show_ui ? admin_url( 'edit.php?post_type=' . $post->post_type ) : '', 'type_add_url' => $type && current_user_can( $type->cap->create_posts ) ? admin_url( 'post-new.php?post_type=' . $post->post_type ) : '', 'type_archive_url' => get_post_type_archive_link( $post->post_type ) ?: '', 'modified' => mysql2date( 'j M Y', $post->post_modified ), 'thumb' => get_the_post_thumbnail_url( $post, 'medium' ) ?: '' );
	}

	/** Paginated site inventory with permission-filtered edges, including disconnected content. */
	public static function site( WP_REST_Request $request ) {
		if ( ! self::batch() ) {
			return rest_ensure_response( array( 'indexing' => true, 'nodes' => array(), 'edges' => array(), 'next_cursor' => 0, 'done' => false ) );
		}
		global $wpdb;
		$after = absint( $request->get_param( 'after' ) );
		$types = array_values( array_diff( self::types(), array( 'attachment', 'revision', 'wp_global_styles', 'wp_font_family', 'wp_font_face' ) ) );
		$placeholders = implode( ',', array_fill( 0, count( $types ), '%s' ) );
		$cache_key = 'site:' . md5( wp_json_encode( array( $after, $types, wp_cache_get_last_changed( 'posts' ) ) ) );
		$ids = wp_cache_get( $cache_key, 'ceb_hub_map' );
		if ( false === $ids ) {
			// WP_Query has no ID-after argument. Cache this bounded keyset scan; core post/meta changes invalidate its key.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$ids = array_map( 'intval', $wpdb->get_col( $wpdb->prepare(
				// The generated fragment contains only %s placeholders; every post type and cursor value is passed to prepare().
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			"SELECT ID FROM {$wpdb->posts} WHERE ID > %d AND post_type IN ($placeholders) AND post_status NOT IN ('trash','auto-draft','inherit') ORDER BY ID ASC LIMIT 100",
			array_merge( array( $after ), $types )
			) ) );
			wp_cache_set( $cache_key, $ids, 'ceb_hub_map', 300 );
		}
		_prime_post_caches( $ids, false, true );
		update_post_author_caches( array_filter( array_map( 'get_post', $ids ) ) );
		$nodes = array(); $edges = array(); $visible = array();
		foreach ( $ids as $id ) {
			$node = self::node( $id );
			if ( ! $node ) { continue; }
			$nodes[] = $node;
			foreach ( array( self::LINK => 'link', self::USES => 'uses' ) as $key => $kind ) {
				foreach ( array_unique( array_map( 'intval', get_post_meta( $id, $key ) ) ) as $target ) {
					if ( ! array_key_exists( $target, $visible ) ) {
						$other = self::node( $target );
						$visible[ $target ] = $other && in_array( $other['post_type'], $types, true ) && 'inherit' !== $other['status'];
					}
					if ( $visible[ $target ] && $target !== $id ) { $edges[] = array( 'from' => $id, 'to' => $target, 'kind' => $kind ); }
				}
			}
		}
		$term_edges = array();
		$schema = self::taxonomy_schema();
		$public_ids = array();
		foreach ( $nodes as $node ) {
			if ( $node['public'] ) {
				$public_ids[ $node['post_type'] ][] = $node['id'];
			}
		}
		$editable_terms = array();
		foreach ( $public_ids as $post_type => $object_ids ) {
			$taxes = array_keys( array_filter( $schema, static fn( $tax ) => in_array( $post_type, $tax['types'], true ) ) );
			if ( ! $taxes ) { continue; }
			$terms = wp_get_object_terms( $object_ids, $taxes, array( 'fields' => 'all_with_object_id' ) );
			if ( is_wp_error( $terms ) ) { continue; }
			foreach ( $terms as $term ) {
				$editable_terms[ $term->term_id ] ??= current_user_can( 'edit_term', $term->term_id );
				if ( $editable_terms[ $term->term_id ] ) {
					$term_edges[] = array( 'source' => 'post:' . $term->object_id, 'target' => 'term:' . $term->term_id, 'kind' => 'in' );
				}
			}
		}
		return rest_ensure_response( array( 'taxonomies' => $schema, 'site_name' => get_bloginfo( 'name' ), 'home' => home_url( '/' ), 'front' => (int) get_option( 'page_on_front' ), 'term_edges' => $term_edges, 'indexing' => false, 'nodes' => $nodes, 'edges' => $edges, 'next_cursor' => $ids ? end( $ids ) : $after, 'done' => count( $ids ) < 100 ) );
	}

	/** Taxonomy hubs use the same public-content scope as Delta's Site graph. */
	public static function taxonomy_schema(): array {
		$out = array();
		$types = get_post_types( array( 'public' => true ) );
		unset( $types['attachment'] );
		foreach ( get_taxonomies( array( 'show_ui' => true ), 'objects' ) as $tax ) {
			$objects = array_values( array_intersect( $tax->object_type, $types ) );
			if ( ! $objects || ! current_user_can( $tax->cap->edit_terms ) ) { continue; }
			$out[ $tax->name ] = array( 'label' => $tax->labels->name, 'types' => $objects, 'edit' => admin_url( 'edit-tags.php?taxonomy=' . $tax->name ) );
		}
		return $out;
	}

	/** Paginated terms; invisible taxonomies and terms never become graph endpoints. */
	public static function graph_terms( WP_REST_Request $request ) {
		global $wpdb;
		$after = (int) $request->get_param( 'after' ); $schema = self::taxonomy_schema();
		if ( ! $schema ) { return rest_ensure_response( array( 'nodes' => array(), 'next_cursor' => $after, 'done' => true ) ); }
		$placeholders = implode( ',', array_fill( 0, count( $schema ), '%s' ) );
		$cache_key = 'terms:' . md5( wp_json_encode( array( $after, array_keys( $schema ), wp_cache_get_last_changed( 'terms' ) ) ) );
		$rows = wp_cache_get( $cache_key, 'ceb_hub_map' );
		if ( false === $rows ) {
			// WP_Term_Query has no term_taxonomy_id cursor. This bounded scan is cached; core term changes invalidate its key. Only generated placeholders enter the format string.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT term_taxonomy_id, term_id, taxonomy FROM {$wpdb->term_taxonomy} WHERE term_taxonomy_id > %d AND taxonomy IN ($placeholders) ORDER BY term_taxonomy_id ASC LIMIT 100", array_merge( array( $after ), array_keys( $schema ) ) ) );
			wp_cache_set( $cache_key, $rows, 'ceb_hub_map', 300 );
		}
		$nodes = array();
		foreach ( $rows as $row ) {
			$term = get_term( (int) $row->term_id, $row->taxonomy );
			if ( ! $term || is_wp_error( $term ) || ! current_user_can( 'edit_term', $term->term_id ) ) { continue; }
			$view = get_term_link( $term );
			$nodes[] = array( 'id' => 'term:' . $term->term_id, 'kind' => 'term', 'group' => $term->taxonomy, 'label' => self::title_data( $term->name )['title'], 'parent' => $term->parent ? 'term:' . $term->parent : '', 'description' => wp_strip_all_tags( $term->description ), 'meta' => array( 'Taxonomy' => $schema[ $term->taxonomy ]['label'], 'Entries' => (int) $term->count, 'Slug' => $term->slug ), 'edit' => get_edit_term_link( $term->term_id, $term->taxonomy ), 'view' => is_wp_error( $view ) || ! is_taxonomy_viewable( $term->taxonomy ) ? '' : $view );
		}
		return rest_ensure_response( array( 'nodes' => $nodes, 'next_cursor' => $rows ? (int) end( $rows )->term_taxonomy_id : $after, 'done' => count( $rows ) < 100 ) );
	}

	/** Condition-based templates need request context; only explicit references are indexed. */
	public static function template_for( WP_Post $post ): int { return 0; }

	public static function connections( WP_REST_Request $request ) {
		$id = (int) $request['id'];
		$center = self::node( $id );
		if ( ! $center ) { return new WP_Error( 'map_unavailable', __( 'This item is unavailable.', 'content-explorer-for-bricks' ), array( 'status' => 404 ) ); }
		$done = self::batch(); self::index( $id );
		$nodes = static function ( array $ids ): array {
			return array_values( array_filter( array_map( array( self::class, 'node' ), array_unique( array_map( 'intval', $ids ) ) ) ) );
		};
		$incoming = static function ( string $key ) use ( $id ): array {
			// Reverse lookup of our saved-reference index requires this exact meta key/value pair. Core caches this query and invalidates it on meta changes; the result is capped at 501 for truncation detection.
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key, WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			return get_posts( array( 'post_type' => self::types(), 'post_status' => array_keys( get_post_stati() ), 'posts_per_page' => 501, 'fields' => 'ids', 'meta_key' => $key, 'meta_value' => $id, 'no_found_rows' => true ) );
		};
		$uses = array_map( 'intval', get_post_meta( $id, self::USES ) );
		$to = array_map( 'intval', get_post_meta( $id, self::LINK ) );
		$body = self::template_for( get_post( $id ) );
		if ( $body && self::node( $body ) ) {
			$uses[] = $body;
			$to = array_merge( $to, array_map( 'intval', get_post_meta( $body, self::LINK ) ) );
		}
		// Follow shared references without rendering content; cycles cannot recurse forever.
		$seen = array( $id => true );
		$queue = array_merge( array( $id ), $uses );
		for ( $cursor = 0; $cursor < count( $queue ) && $cursor < 100; $cursor++ ) {
			$owner = (int) $queue[ $cursor ];
			if ( $owner !== $id && isset( $seen[ $owner ] ) ) { continue; }
			if ( $owner !== $id && ! self::node( $owner ) ) { continue; }
			$seen[ $owner ] = true;
			foreach ( get_post_meta( $owner, self::USES ) as $part ) {
				$part = (int) $part;
				if ( ! isset( $seen[ $part ] ) ) { $uses[] = $part; $queue[] = $part; }
			}
		}
		// WordPress hierarchy is structural, independent of links in saved content.
		$hierarchy = is_post_type_hierarchical( $center['post_type'] );
		$parents = $hierarchy && $center['parent'] ? $nodes( array( $center['parent'] ) ) : array();
		$children = $hierarchy ? $nodes( get_posts( array(
			'post_type' => $center['post_type'], 'post_parent' => $id,
			'post_status' => array_keys( get_post_stati() ), 'posts_per_page' => 501,
			'fields' => 'ids', 'no_found_rows' => true,
			'orderby' => array( 'menu_order' => 'ASC', 'title' => 'ASC', 'ID' => 'ASC' ),
		) ) ) : array();
		$from = $incoming( self::LINK );
		$used_by = $incoming( self::USES );
		$relationships_done = CEB_Hub_Relationships::batch();
		$relationships = $relationships_done ? CEB_Hub_Relationships::for_post( get_post( $id ) ) : array();
		return rest_ensure_response( array_merge( array( 'hierarchy' => $hierarchy, 'parents' => $parents, 'children' => array_slice( $children, 0, 500 ), 'hierarchy_truncated' => count( $children ) > 500, 'truncated' => count( $from ) > 500 || count( $used_by ) > 500 || count( $queue ) > 100, 'center' => $center, 'from' => $nodes( array_slice( $from, 0, 500 ) ), 'to' => $nodes( array_diff( $to, array( $id ) ) ), 'uses' => $nodes( array_diff( $uses, array( $id ) ) ), 'used_by' => $nodes( array_slice( $used_by, 0, 500 ) ), 'indexing' => ! $done, 'relationships_indexing' => ! $relationships_done ), $relationships ) );
	}
}
add_action( 'save_post', array( 'CEB_Hub_Connections', 'index' ), 30 );
add_action( 'rest_api_init', static function (): void {
	register_rest_route( 'ceb-hub-sort/v1', '/connections/graph-terms', array( 'methods' => WP_REST_Server::READABLE, 'permission_callback' => static fn(): bool => current_user_can( 'edit_posts' ), 'callback' => array( 'CEB_Hub_Connections', 'graph_terms' ), 'args' => array( 'after' => array( 'type' => 'integer', 'minimum' => 0, 'default' => 0 ) ) ) );
	register_rest_route( 'ceb-hub-sort/v1', '/connections/terms', array( 'methods' => WP_REST_Server::READABLE, 'permission_callback' => static function (): bool { return current_user_can( 'edit_posts' ); }, 'callback' => array( 'CEB_Hub_Connections', 'graph_terms' ), 'args' => array( 'after' => array( 'type' => 'integer', 'minimum' => 0, 'default' => 0 ) ) ) );
	register_rest_route( 'ceb-hub-sort/v1', '/connections/site', array(
		'methods' => WP_REST_Server::READABLE,
		'permission_callback' => static function (): bool { return current_user_can( 'edit_posts' ); },
		'callback' => array( 'CEB_Hub_Connections', 'site' ),
		'args' => array( 'after' => array( 'type' => 'integer', 'minimum' => 0, 'default' => 0 ) ),
	) );
	register_rest_route( 'ceb-hub-sort/v1', '/connections/(?P<id>\d+)', array(
		'methods' => WP_REST_Server::READABLE,
		'permission_callback' => static function ( WP_REST_Request $request ): bool { return current_user_can( 'edit_posts' ) && null !== CEB_Hub_Connections::node( (int) $request['id'] ); },
		'callback' => array( 'CEB_Hub_Connections', 'connections' ),
	) );
} );
// URL or shared-part identity changes require resolving older incoming links again.
add_action( 'post_updated', static function ( $id, $after, $before ): void {
	if ( $after->post_name !== $before->post_name || $after->post_parent !== $before->post_parent ) { delete_option( 'ceb_hub_map_cursor_v1' ); }
}, 10, 3 );
foreach ( array( 'switch_theme', 'update_option_permalink_structure', 'deleted_post' ) as $ceb_hub_map_hook ) {
	add_action( $ceb_hub_map_hook, static function (): void { delete_option( 'ceb_hub_map_cursor_v1' ); } );
}
add_action( 'transition_post_status', static function ( $new, $old ): void {
	if ( $new !== $old ) { delete_option( 'ceb_hub_map_cursor_v1' ); }
}, 10, 2 );

// Template assignments and template hierarchy changes affect reverse usage throughout the site.
add_action( 'save_post_wp_template', static function (): void { delete_option( 'ceb_hub_map_cursor_v1' ); }, 40 );
foreach ( array( 'added_post_meta', 'updated_post_meta', 'deleted_post_meta' ) as $ceb_hub_map_hook ) {
  add_action( $ceb_hub_map_hook, static function ( $meta_id, $object_id, $key ): void {
    if ( '_wp_page_template' === $key ) { delete_option( 'ceb_hub_map_cursor_v1' ); }
  }, 10, 3 );
}

unset( $ceb_hub_map_hook );

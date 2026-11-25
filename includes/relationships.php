<?php
/** Saved post relationships used by the item map. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

final class CEB_Hub_Relationships {
	private const META = '_ceb_hub_map_related';
	private const CURSOR = 'ceb_hub_relationship_cursor';
	private const PROVIDERS = 'ceb_hub_relationship_providers';
	private const LOCK = 'ceb_hub_relationship_lock';
	private const LIMIT = 500;
	private static array $pending = array();

	private static function providers(): array {
		return array(
			'acf' => function_exists( 'acf_get_field' ),
			'meta_box' => function_exists( 'rwmb_get_object_fields' ) && class_exists( 'RWMB_Field' ),
			'custom' => has_filter( 'ceb_hub_sort_post_relationships' ) !== false,
		);
	}

	private static function add( array &$edges, $value, string $label ): void {
		if ( is_array( $value ) ) {
			foreach ( $value as $item ) { self::add( $edges, $item, $label ); }
			return;
		}
		if ( ( is_int( $value ) || ( is_string( $value ) && ctype_digit( $value ) ) ) && (int) $value > 0 ) {
			$edges[ (int) $value ][ $label ] = $label;
		}
	}

	/** ACF saves a field key alongside the value, including in repeaters and flexible layouts. */
	private static function acf( WP_Post $post, array &$edges ): void {
		$meta = get_post_meta( $post->ID );
		foreach ( $meta as $key => $references ) {
			$name = substr( $key, 1 );
			$reference = $references[0] ?? '';
			if ( ! str_starts_with( $key, '_' ) || ! isset( $meta[ $name ] ) || ! is_string( $reference ) || ! str_starts_with( $reference, 'field_' ) ) { continue; }
			$field = acf_get_field( $reference );
			if ( ! in_array( $field['type'] ?? '', array( 'relationship', 'post_object' ), true ) ) { continue; }
			$label = 'ACF · ' . ( $field['label'] ?: $name );
			foreach ( $meta[ $name ] as $value ) { self::add( $edges, maybe_unserialize( $value ), $label ); }
		}
	}

	private static function meta_box_fields( string $type ): array {
		static $fields = array();
		return $fields[ $type ] ??= rwmb_get_object_fields( $type );
	}

	private static function meta_box_field( array $field, $value, array &$edges ): void {
		if ( 'post' === $field['type'] ) {
			self::add( $edges, $value, 'Meta Box · ' . ( $field['name'] ?: $field['id'] ) );
			return;
		}
		if ( ! is_array( $value ) || 'group' !== $field['type'] ) { return; }
		foreach ( empty( $field['clone'] ) ? array( $value ) : $value as $group ) {
			foreach ( $field['fields'] as $child ) {
				if ( isset( $group[ $child['id'] ] ) ) { self::meta_box_field( $child, $group[ $child['id'] ], $edges ); }
			}
		}
	}

	private static function fields( WP_Post $post ): array {
		$edges = array();
		$providers = self::providers();
		if ( $providers['acf'] ) { self::acf( $post, $edges ); }
		if ( $providers['meta_box'] ) {
			foreach ( self::meta_box_fields( $post->post_type ) as $field ) {
				if ( ! empty( $field['relationship'] ) || ! in_array( $field['type'], array( 'post', 'group' ), true ) ) { continue; }
				self::meta_box_field( $field, RWMB_Field::raw_meta( $post->ID, $field ), $edges );
			}
		}
		/** Supply additional saved post IDs with an array of labels per ID. Called without editor context during indexing. */
		$extra = apply_filters( 'ceb_hub_sort_post_relationships', array(), $post );
		foreach ( (array) $extra as $target => $labels ) {
			foreach ( (array) $labels as $label ) {
				if ( is_string( $label ) && '' !== trim( $label ) ) { self::add( $edges, $target, $label ); }
			}
		}
		unset( $edges[ $post->ID ] );
		return $edges;
	}

	public static function invalidate(): void {
		delete_option( self::CURSOR );
	}

	public static function queue( int $id ): void {
		self::$pending[ $id ] = $id;
	}

	public static function metadata_changed( $meta_id, int $id, string $key ): void {
		if ( ! str_starts_with( $key, '_ceb_hub_map_' ) ) { self::queue( $id ); }
	}

	public static function flush(): void {
		$pending = self::$pending;
		self::$pending = array();
		if ( ! $pending || ! in_array( true, self::providers(), true ) ) { return; }
		foreach ( $pending as $id ) { self::index( $id ); }
	}

	private static function index( int $id ): void {
		$post = get_post( $id );
		if ( ! $post || ! in_array( $post->post_type, CEB_Hub_Connections::types(), true ) || in_array( $post->post_type, array( 'attachment', 'revision' ), true ) ) { return; }
		$targets = array_keys( self::fields( $post ) );
		$saved = array_map( 'intval', get_post_meta( $id, self::META ) );
		foreach ( array_diff( $saved, $targets ) as $target ) { delete_post_meta( $id, self::META, $target ); }
		foreach ( array_diff( $targets, $saved ) as $target ) { add_post_meta( $id, self::META, $target ); }
	}

	/** Backfill field selections in the item map only, independently of the Site map. */
	public static function batch(): bool {
		$providers = self::providers();
		if ( ! in_array( true, $providers, true ) ) { return true; }
		global $wpdb;
		$cursor = (int) get_option( self::CURSOR, 0 );
		if ( -1 === $cursor && get_option( self::PROVIDERS ) === $providers ) { return true; }
		$lock = (int) get_option( self::LOCK, 0 );
		if ( $lock && $lock < time() - 60 ) { delete_option( self::LOCK ); }
		if ( ! add_option( self::LOCK, time(), '', false ) ) { return false; }
		try {
			$cursor = (int) get_option( self::CURSOR, 0 );
			if ( get_option( self::PROVIDERS ) !== $providers ) {
				$cursor = 0;
				self::invalidate();
				update_option( self::PROVIDERS, $providers, false );
			}
			if ( -1 === $cursor ) { return true; }
			$types = array_values( array_diff( CEB_Hub_Connections::types(), array( 'attachment', 'revision' ) ) );
			$placeholders = implode( ',', array_fill( 0, count( $types ), '%s' ) );
			$cache_key = 'relationships:' . md5( wp_json_encode( array( $cursor, $types, wp_cache_get_last_changed( 'posts' ) ) ) );
			$ids = wp_cache_get( $cache_key, 'ceb_hub_map' );
			if ( false === $ids ) {
				// Cache this bounded keyset scan, invalidating it on core post/meta changes. WP_Query has no ID-after parameter.
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
				$ids = array_map( 'intval', $wpdb->get_col( $wpdb->prepare(
					// Only generated %s placeholders are interpolated; cursor and post types are bound values.
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT ID FROM {$wpdb->posts} WHERE ID > %d AND post_type IN ($placeholders) AND post_status NOT IN ('auto-draft','trash') ORDER BY ID ASC LIMIT 50",
				array_merge( array( $cursor ), $types )
				) ) );
				wp_cache_set( $cache_key, $ids, 'ceb_hub_map', 300 );
			}
			_prime_post_caches( $ids, false, true );
			foreach ( $ids as $id ) { self::index( $id ); }
			$done = count( $ids ) < 50;
			update_option( self::CURSOR, $done ? -1 : (int) end( $ids ), false );
			return $done;
		} finally {
			delete_option( self::LOCK );
		}
	}

	/** MB Relationships owns its own tables and can query both directions live. */
	private static function meta_box_relationships( WP_Post $post, array &$outgoing, array &$incoming ): void {
		if ( ! is_callable( array( 'MB_Relationships_API', 'get_all_relationships_settings' ) ) ) { return; }
		foreach ( MB_Relationships_API::get_all_relationships_settings() as $settings ) {
			if ( 'post' !== $settings['from']['object_type'] || 'post' !== $settings['to']['object_type'] ) { continue; }
			foreach ( array( 'from' => 'to', 'to' => 'from' ) as $side => $other ) {
				$types = (array) $settings[ $side ]['field']['post_type'];
				if ( ! in_array( $post->post_type, $types, true ) && ! in_array( 'any', $types, true ) ) { continue; }
				$label = 'Meta Box · ' . ( $settings[ $side ]['meta_box']['title'] ?: $settings['id'] );
				$query = new WP_Query( array(
					'relationship' => array( 'id' => $settings['id'], $side => $post->ID ),
					'post_type' => $settings[ $other ]['field']['post_type'],
					'post_status' => array_diff( array_keys( get_post_stati() ), array( 'trash', 'auto-draft' ) ),
					'posts_per_page' => self::LIMIT + 1,
					'fields' => 'ids',
					'no_found_rows' => true,
				) );
				if ( 'from' === $side ) { self::add( $outgoing, $query->posts, $label ); }
				else { self::add( $incoming, $query->posts, $label ); }
			}
		}
	}

	public static function for_post( WP_Post $post ): array {
		self::flush();
		$id = $post->ID;
		$outgoing = self::fields( $post );
		$incoming = array();
		$truncated = false;
		if ( in_array( true, self::providers(), true ) ) {
			$sources = get_posts( array(
				'post_type' => CEB_Hub_Connections::types(),
				'post_status' => array_diff( array_keys( get_post_stati() ), array( 'trash', 'auto-draft' ) ),
				'posts_per_page' => self::LIMIT + 1,
				'fields' => 'ids',
				// This plugin-owned reverse index is queried by its exact key, capped at 501, and cached/invalidation-managed by WP_Query. Current fields are rechecked before any relationship is exposed.
				'meta_key' => self::META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value' => $id, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'no_found_rows' => true,
			) );
			$truncated = count( $sources ) > self::LIMIT;
			_prime_post_caches( $sources, false, true );
			foreach ( array_slice( $sources, 0, self::LIMIT ) as $source ) {
				if ( ! current_user_can( 'edit_post', $source ) ) { continue; }
				// Read current field definitions and values so stale index rows never create a connection.
				$source_post = get_post( $source );
				if ( ! $source_post ) { continue; }
				$labels = self::fields( $source_post )[ $id ] ?? array();
				if ( $labels ) { $incoming[ $source ] = $labels; }
			}
		}
		self::meta_box_relationships( $post, $outgoing, $incoming );
		unset( $outgoing[ $id ], $incoming[ $id ] );
		$truncated = $truncated || count( $outgoing ) > self::LIMIT || count( $incoming ) > self::LIMIT;
		$nodes = static function ( array $edges ): array {
			$nodes = array();
			foreach ( array_slice( $edges, 0, self::LIMIT, true ) as $target => $labels ) {
				$node = CEB_Hub_Connections::node( $target );
				if ( ! $node ) { continue; }
				$node['relationships'] = array_values( array_unique( array_map( 'wp_strip_all_tags', $labels ) ) );
				$nodes[] = $node;
			}
			return $nodes;
		};
		return array( 'related_to' => $nodes( $outgoing ), 'related_from' => $nodes( $incoming ), 'relationships_truncated' => $truncated );
	}
}

add_action( 'wp_after_insert_post', array( 'CEB_Hub_Relationships', 'queue' ) );
add_action( 'rwmb_after_save_post', array( 'CEB_Hub_Relationships', 'queue' ) );
add_action( 'shutdown', array( 'CEB_Hub_Relationships', 'flush' ) );
foreach ( array( 'added_post_meta', 'updated_post_meta', 'deleted_post_meta' ) as $ceb_hub_relationship_hook ) {
	add_action( $ceb_hub_relationship_hook, array( 'CEB_Hub_Relationships', 'metadata_changed' ), 10, 3 );
}
foreach ( array( 'activated_plugin', 'deactivated_plugin', 'acf/delete_field', 'save_post_meta-box', 'switch_theme' ) as $ceb_hub_relationship_hook ) {
	add_action( $ceb_hub_relationship_hook, array( 'CEB_Hub_Relationships', 'invalidate' ) );
}
add_filter( 'acf/update_field', static function ( array $field ): array {
	CEB_Hub_Relationships::invalidate();
	return $field;
} );
unset( $ceb_hub_relationship_hook );

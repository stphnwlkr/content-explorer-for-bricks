<?php
/** Bricks entry points and saved-data adapter. */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Read literal saved links and template elements without rendering user code. */
function ceb_hub_bricks_connections( int $post_id ): array {
	$result = array( 'links' => array(), 'uses' => array() );
	$read = static function ( $value ) use ( &$read, &$result ): void {
		if ( ! is_array( $value ) ) {
			return;
		}
		if ( 'internal' === ( $value['type'] ?? '' ) && ! empty( $value['postId'] ) && is_numeric( $value['postId'] ) ) {
			$result['links'][] = absint( $value['postId'] );
		}
		foreach ( $value as $key => $item ) {
			if ( is_array( $item ) ) {
				$read( $item );
			} elseif ( 'url' === $key && is_string( $item ) ) {
				$result['links'][] = CEB_Hub_Connections::target( $item );
			} elseif ( is_string( $item ) && in_array( $key, array( 'text', 'content' ), true ) ) {
				$found = CEB_Hub_Connections::extract( $item );
				$result['links'] = array_merge( $result['links'], $found['links'] );
			}
		}
	};
	foreach ( array( '_bricks_page_content_2', '_bricks_page_header_2', '_bricks_page_footer_2' ) as $key ) {
		$elements = get_post_meta( $post_id, $key, true );
		if ( ! is_array( $elements ) ) {
			continue;
		}
		foreach ( $elements as $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}
			$settings = $element['settings'] ?? array();
			// A Nav Menu stores a menu term ID, not the links themselves.
			// Read saved items only; do not render the menu or run Bricks dynamic data.
			if ( 'nav-menu' === ( $element['name'] ?? '' ) && is_numeric( $settings['menu'] ?? null ) ) {
				$items = wp_get_nav_menu_items( absint( $settings['menu'] ) );
				foreach ( $items ?: array() as $item ) {
					if ( 'post_type' === $item->type ) {
						$result['links'][] = absint( $item->object_id );
					} elseif ( 'custom' === $item->type ) {
						$result['links'][] = CEB_Hub_Connections::target( (string) $item->url );
					}
				}
			}
			if ( 'template' === ( $element['name'] ?? '' ) && is_numeric( $settings['template'] ?? null ) ) {
				$result['uses'][] = absint( $settings['template'] );
			}
			$read( $settings );
		}
	}
	foreach ( $result as $kind => $ids ) {
		$result[ $kind ] = array_values( array_unique( array_filter( $ids ) ) );
	}
	return $result;
}

/** Resolve ordinary singular assignments using Bricks' own condition ranking/exclusions.
 * The temporary query describes this post only. No frontend render, loop or dynamic data runs.
 */
function ceb_hub_bricks_templates( WP_Post $document ): array {
	if ( ! is_post_type_viewable( $document->post_type ) || in_array( $document->post_type, array( 'attachment', 'bricks_template', 'wp_template', 'wp_template_part' ), true ) || (int) get_option( 'page_for_posts' ) === $document->ID || ! is_callable( array( '\Bricks\Database', 'find_template_id' ) ) ) {
		return array();
	}
	$templates = array();
	foreach ( get_posts( array( 'post_type' => 'bricks_template', 'post_status' => 'publish', 'posts_per_page' => -1 ) ) as $template ) {
		$type = get_post_meta( $template->ID, '_bricks_template_type', true );
		// Archive, popup and visitor-dependent password templates have no fixed singular mapping.
		if ( in_array( $type, array( 'header', 'footer', 'content' ), true ) ) {
			$templates[ 'content' === $type ? 'body' : $type ][] = $template->ID;
		}
	}
	$saved = array();
	foreach ( array( 'wp_query', 'post' ) as $key ) {
		$saved[ $key ] = array( array_key_exists( $key, $GLOBALS ), $GLOBALS[ $key ] ?? null );
	}
	try {
		$query = new WP_Query();
		$query->init();
		$query->is_singular = true;
		$query->is_page = 'page' === $document->post_type;
		$query->is_single = ! $query->is_page;
		$query->queried_object = $document;
		$query->queried_object_id = $document->ID;
		$query->post = $document;
		$query->posts = array( $document );
		$query->post_count = 1;
		$query->set( 'post_type', $document->post_type );
		$query->set( $query->is_page ? 'page_id' : 'p', $document->ID );
		$GLOBALS['wp_query'] = $query;
		$GLOBALS['post'] = $document;
		$assigned = array();
		foreach ( array( 'content', 'header', 'footer' ) as $part ) {
			$id = (int) \Bricks\Database::find_template_id( $templates, $part, 'content', $document->ID, '' );
			if ( $id ) { $assigned[ $part ] = $id; }
		}
		$page_settings = get_post_meta( $document->ID, '_bricks_page_settings', true );
		$body_settings = isset( $assigned['content'] ) ? get_post_meta( $assigned['content'], '_bricks_page_settings', true ) : array();
		foreach ( array( 'header', 'footer' ) as $part ) {
			if ( isset( $page_settings[ $part . 'Disabled' ] ) || isset( $body_settings[ $part . 'Disabled' ] ) ) { unset( $assigned[ $part ] ); }
		}
		return array_values( array_unique( $assigned ) );
	} finally {
		foreach ( $saved as $key => $value ) {
			// Restore only the core globals captured above; no plugin-owned globals are introduced.
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
			if ( $value[0] ) { $GLOBALS[ $key ] = $value[1]; }
			else { unset( $GLOBALS[ $key ] ); }
		}
	}
}

// Bricks saves its document in metadata after save_post has fired.
foreach ( array( 'added_post_meta', 'updated_post_meta', 'deleted_post_meta' ) as $ceb_hub_meta_hook ) {
	add_action( $ceb_hub_meta_hook, static function ( $meta_id, $post_id, $key ): void {
		if ( in_array( $key, array( '_bricks_page_content_2', '_bricks_page_header_2', '_bricks_page_footer_2' ), true ) ) {
			CEB_Hub_Connections::index( (int) $post_id );
		}
	}, 40, 3 );
}
unset( $ceb_hub_meta_hook );

add_action( 'admin_menu', static function (): void {
	add_menu_page( __( 'Content Explorer', 'uplink-content-explorer-for-bricks' ), __( 'Content Explorer', 'uplink-content-explorer-for-bricks' ), 'edit_posts', 'uplink-content-explorer-for-bricks', 'ceb_hub_admin_page', 'dashicons-search', 30 );
} );

function ceb_hub_admin_page(): void {
	if ( ! current_user_can( 'edit_posts' ) ) {
		return;
	}
	echo '<div class="wrap"><h1>' . esc_html__( 'Uplink Content Explorer for Bricks', 'uplink-content-explorer-for-bricks' ) . '</h1><p>' . esc_html__( 'Loading Content Explorer…', 'uplink-content-explorer-for-bricks' ) . '</p></div>';
}

add_action( 'admin_enqueue_scripts', static function ( string $hook ): void {
	if ( 'toplevel_page_uplink-content-explorer-for-bricks' === $hook ) {
		ceb_hub_enqueue_explorer();
		wp_enqueue_style( 'ceb-admin', plugins_url( '../assets/admin.css', __FILE__ ), array( 'uplink-content-explorer-for-bricks' ), '0.9.8' );
	}
} );

add_action( 'wp_enqueue_scripts', static function (): void {
	if ( ! function_exists( 'bricks_is_builder_main' ) || ! bricks_is_builder_main() || ! \Bricks\Capabilities::current_user_can_use_builder( get_the_ID() ) || ! current_user_can( 'edit_posts' ) ) {
		return;
	}
	ceb_hub_enqueue_explorer();
	wp_enqueue_style( 'ceb-builder', plugins_url( '../assets/builder.css', __FILE__ ), array( 'uplink-content-explorer-for-bricks' ), '0.9.8' );
	wp_enqueue_script( 'ceb-builder', plugins_url( '../assets/builder.js', __FILE__ ), array( 'uplink-content-explorer-for-bricks', 'ceb-hub-connections' ), '0.9.8', true );
}, 100 );

/** Menu edits change every document using that menu; refresh in bounded batches. */
function ceb_hub_bricks_menu_changed(): void {
	delete_option( 'ceb_hub_map_cursor_v1' );
}
add_action( 'wp_update_nav_menu', 'ceb_hub_bricks_menu_changed' );
add_action( 'wp_update_nav_menu_item', 'ceb_hub_bricks_menu_changed' );
add_action( 'wp_delete_nav_menu', 'ceb_hub_bricks_menu_changed' );
// Also cover programmatic removal/reassignment of menu-item membership.
add_action( 'set_object_terms', static function ( $object_id, $terms, $tt_ids, $taxonomy ): void {
	if ( 'nav_menu' === $taxonomy ) { ceb_hub_bricks_menu_changed(); }
}, 10, 4 );
add_action( 'deleted_term_relationships', static function ( $object_id, $tt_ids, $taxonomy ): void {
	if ( 'nav_menu' === $taxonomy ) { ceb_hub_bricks_menu_changed(); }
}, 10, 3 );

/** Template edits can affect pages already passed by the bounded index cursor. */
function ceb_hub_bricks_assignment_changed(): void {
	delete_option( 'ceb_hub_map_cursor_v1' );
}
add_action( 'save_post_bricks_template', 'ceb_hub_bricks_assignment_changed', 40 );
foreach ( array( 'added_post_meta', 'updated_post_meta', 'deleted_post_meta' ) as $ceb_hub_assignment_hook ) {
	add_action( $ceb_hub_assignment_hook, static function ( $meta_id, $id, $key ): void {
		if ( in_array( $key, array( '_bricks_template_settings', '_bricks_template_type', '_bricks_page_settings' ), true ) || ( 'bricks_template' === get_post_type( $id ) && str_starts_with( $key, '_bricks_page_' ) ) ) { ceb_hub_bricks_assignment_changed(); }
	}, 50, 3 );
}
unset( $ceb_hub_assignment_hook );
add_action( 'set_object_terms', 'ceb_hub_bricks_assignment_changed' );
add_action( 'deleted_term_relationships', 'ceb_hub_bricks_assignment_changed' );
add_action( 'update_option_bricks_global_settings', 'ceb_hub_bricks_assignment_changed' );

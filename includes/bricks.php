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
	add_menu_page( __( 'Content Explorer', 'content-explorer-for-bricks' ), __( 'Content Explorer', 'content-explorer-for-bricks' ), 'edit_posts', 'content-explorer-for-bricks', 'ceb_hub_admin_page', 'dashicons-search', 30 );
} );

function ceb_hub_admin_page(): void {
	if ( ! current_user_can( 'edit_posts' ) ) {
		return;
	}
	echo '<div class="wrap"><h1>' . esc_html__( 'Content Explorer for Bricks', 'content-explorer-for-bricks' ) . '</h1><p>' . esc_html__( 'Loading Content Explorer…', 'content-explorer-for-bricks' ) . '</p></div>';
}

add_action( 'admin_enqueue_scripts', static function ( string $hook ): void {
	if ( 'toplevel_page_content-explorer-for-bricks' === $hook ) {
		ceb_hub_enqueue_explorer();
		wp_enqueue_style( 'ceb-admin', plugins_url( '../assets/admin.css', __FILE__ ), array( 'content-explorer-for-bricks' ), '0.9.5' );
	}
} );

add_action( 'wp_enqueue_scripts', static function (): void {
	if ( ! function_exists( 'bricks_is_builder_main' ) || ! bricks_is_builder_main() || ! \Bricks\Capabilities::current_user_can_use_builder( get_the_ID() ) || ! current_user_can( 'edit_posts' ) ) {
		return;
	}
	ceb_hub_enqueue_explorer();
	wp_enqueue_style( 'ceb-builder', plugins_url( '../assets/builder.css', __FILE__ ), array( 'content-explorer-for-bricks' ), '0.9.5' );
	wp_enqueue_script( 'ceb-builder', plugins_url( '../assets/builder.js', __FILE__ ), array( 'content-explorer-for-bricks', 'ceb-hub-connections' ), '0.9.5', true );
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

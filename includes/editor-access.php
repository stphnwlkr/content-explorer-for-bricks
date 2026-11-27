<?php
/** Editor shortcuts for saved content. */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const CEB_HUB_SORT_SHARED_EDITOR_TYPES = array( 'bricks_template' );

function ceb_hub_sort_editor_access(): array {
	return (array) get_option( 'ceb_hub_sort_editor_access', array() );
}

/** Valid slugs can be carried between sites before their post types are registered. */
function ceb_hub_sort_validate_editor_access( $access ): bool {
	if ( ! is_array( $access ) ) {
		return false;
	}
	foreach ( $access as $type => $mode ) {
		if ( ! is_string( $type ) || ! preg_match( '/^[a-z0-9_-]{1,20}$/D', $type ) || in_array( $type, CEB_HUB_SORT_SHARED_EDITOR_TYPES, true ) || ! in_array( $mode, array( 'both', 'wordpress', 'ceb' ), true ) ) {
			return false;
		}
	}
	return true;
}

function ceb_hub_sort_editor_mode( string $type ): string {
	if ( in_array( $type, CEB_HUB_SORT_SHARED_EDITOR_TYPES, true ) ) {
		return 'both';
	}
	if ( ! CEB_Hub_Connections::supports_ceb_type( $type ) ) {
		return 'wordpress';
	}
	$mode = ceb_hub_sort_editor_access()[ $type ] ?? '';
	return in_array( $mode, array( 'wordpress', 'ceb' ), true ) ? $mode : 'both';
}

function ceb_hub_sort_can_open_ceb( string $type ): bool {
	return class_exists( '\Bricks\Capabilities' ) && 'wordpress' !== ceb_hub_sort_editor_mode( $type );
}

function ceb_hub_sort_wordpress_edit_url( WP_Post $post ): ?string {
	if ( 'ceb' === ceb_hub_sort_editor_mode( $post->post_type ) ) {
		return null;
	}
	return esc_url_raw( (string) get_edit_post_link( $post, 'raw' ) ) ?: null;
}

function ceb_hub_sort_editor_types(): array {
	$types = array();
	foreach ( array_diff( CEB_Hub_Connections::types(), array( 'attachment', 'revision', 'wp_global_styles', 'wp_font_family', 'wp_font_face' ) ) as $name ) {
		$type = get_post_type_object( $name );
		if ( $type ) {
			$types[] = array(
				'name' => $name,
				'label' => 'wp_block' === $name ? __( 'Patterns and components', 'uplink-content-explorer-for-bricks' ) : $type->labels->name,
				'supportsBricks' => CEB_Hub_Connections::supports_ceb_type( $name ),
				'shared' => in_array( $name, CEB_HUB_SORT_SHARED_EDITOR_TYPES, true ),
				'mode' => ceb_hub_sort_editor_mode( $name ),
			);
		}
	}
	return $types;
}

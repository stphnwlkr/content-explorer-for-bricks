<?php
/**
 * Remove the plugin setting when uninstalled.
 *
 * @package ContentExplorerForBricks
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'ceb_hub_sort_enabled' );
delete_option( 'ceb_hub_sort_show_sidebar_icon' );
delete_option( 'ceb_hub_sort_show_wordpress_edit' );
delete_option( 'ceb_hub_sort_editor_access' );
delete_option( 'ceb_hub_sort_default_view' );
delete_option( 'ceb_hub_sort_actions_first' );
delete_option( 'ceb_hub_sort_actions_layout' );
delete_option( 'ceb_hub_sort_default_column' );
delete_option( 'ceb_hub_sort_default_order' );
delete_option( 'ceb_hub_sort_term_default_column' );
delete_option( 'ceb_hub_sort_term_default_order' );
delete_option( 'ceb_hub_sort_active_bg' );
delete_option( 'ceb_hub_sort_active_text' );
delete_option( 'ceb_hub_sort_button_styles' );
delete_option( 'ceb_hub_sort_status_styles' );
delete_option( 'ceb_hub_sort_hierarchy_style' );

delete_option( 'ceb_hub_map_cursor_v1' );
delete_option( 'ceb_hub_map_lock' );
delete_post_meta_by_key( '_ceb_hub_map_link' );
delete_post_meta_by_key( '_ceb_hub_map_uses' );
delete_post_meta_by_key( '_ceb_hub_map_related' );
delete_option( 'ceb_hub_relationship_cursor' );
delete_option( 'ceb_hub_relationship_providers' );
delete_option( 'ceb_hub_relationship_lock' );

delete_option( 'ceb_hub_sort_panel_default_view' );

delete_option( 'ceb_hub_map_index_version' );

delete_option( 'ceb_hub_sort_hide_native_content_hub' );

delete_site_transient( 'ceb_hub_sort_github_release' );

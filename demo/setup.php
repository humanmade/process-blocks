<?php
/**
 * Create demo content for local development and Playground.
 *
 * Run with `wp eval-file demo/setup.php`. Safe to run repeatedly.
 *
 * @package HM\Process_Blocks
 */

$pages = [
	'process-demo' => [
		'title' => 'Replace a bike inner tube',
		'file' => __DIR__ . '/sections.html',
	],
	'process-demo-simple' => [
		'title' => 'Brew pour-over coffee',
		'file' => __DIR__ . '/simple.html',
	],
	// Adapted from iFixit, licensed under CC BY-NC-SA 3.0; see demo/README.md.
	'ifixit-screen-replacement' => [
		'title' => 'MacBook Neo Screen Replacement',
		'file' => __DIR__ . '/ifixit.html',
	],
];

foreach ( $pages as $slug => $page ) {
	$existing = get_page_by_path( $slug );
	$post_id = wp_insert_post( [
		'ID' => $existing->ID ?? 0,
		'post_type' => 'page',
		'post_status' => 'publish',
		'post_name' => $slug,
		'post_title' => $page['title'],
		'post_content' => wp_slash( file_get_contents( $page['file'] ) ), // phpcs:ignore WordPressVIPMinimum.Performance.FetchingRemoteData.FileGetContentsUnknown
	], true );

	if ( is_wp_error( $post_id ) ) {
		\WP_CLI::warning( $post_id->get_error_message() );
		continue;
	}

	\WP_CLI::success( sprintf( 'Demo page ready: %s', get_permalink( $post_id ) ) );
}

// Widen the theme's content area, giving Media & Text steps room for side-by-
// side images and text. This is stored as a Global Styles customisation, as
// if set in the Site Editor, so the theme itself is untouched.
$global_styles = WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( wp_get_theme(), true );
if ( empty( $global_styles['ID'] ) ) {
	\WP_CLI::warning( 'Could not set content width; the active theme may not support Global Styles.' );
	return;
}

// When the Global Styles post is newly created, its theme is set via
// tax_input, which requires a user able to assign terms. WP-CLI has no
// user, so assign the theme explicitly, or the styles never apply.
wp_set_object_terms( $global_styles['ID'], wp_get_theme()->get_stylesheet(), 'wp_theme' );

$config = json_decode( $global_styles['post_content'], true ) ?: [];
$config['version'] = $config['version'] ?? WP_Theme_JSON::LATEST_SCHEMA;
$config['isGlobalStylesUserThemeJSON'] = true;
$config['settings']['layout']['contentSize'] = '960px';

wp_update_post( [
	'ID' => $global_styles['ID'],
	'post_content' => wp_slash( wp_json_encode( $config ) ),
] );

\WP_CLI::success( 'Content width set to 960px.' );

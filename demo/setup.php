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

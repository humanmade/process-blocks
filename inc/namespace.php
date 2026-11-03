<?php
/**
 * Process Blocks.
 *
 * Steps are numbered and collected while the process block renders, so that
 * the process can build its summary and progress bar from them. Inner blocks
 * render before their parent's render callback, which lets us track state in
 * a stack:
 *
 * 1. `render_block_data` fires for the process, and we push a new entry.
 * 2. Each section and step registers itself against the current entry as it
 *    renders.
 * 3. The process render callback pops the entry, with the full list of steps.
 *
 * @package HM\Process_Blocks
 */

namespace HM\Process_Blocks;

use WP_Block;

const PROCESS_BLOCK = 'process-blocks/process';
const SECTION_BLOCK = 'process-blocks/section';
const STEP_BLOCK = 'process-blocks/step';
const STORE_NAMESPACE = 'process-blocks';

/**
 * Bootstrap the plugin.
 *
 * @return void
 */
function bootstrap(): void {
	add_action( 'init', __NAMESPACE__ . '\\register_blocks' );
	add_filter( 'render_block_data', __NAMESPACE__ . '\\start_block', 10, 1 );
}

/**
 * Register the blocks and their shared interactivity state.
 *
 * @return void
 */
function register_blocks(): void {
	$build_dir = dirname( __DIR__ ) . '/build';
	foreach ( [ 'process', 'section', 'step' ] as $block ) {
		register_block_type( $build_dir . '/' . $block );
	}
}

/**
 * Get the stack of processes currently being rendered.
 *
 * @return array Stack of process data, passed by reference.
 */
function &get_stack(): array {
	static $stack = [];
	return $stack;
}

/**
 * Track processes and sections as they begin rendering.
 *
 * @param array $parsed_block Block being rendered.
 * @return array Unaltered block.
 */
function start_block( array $parsed_block ): array {
	static $process_count = 0;

	$stack = &get_stack();
	switch ( $parsed_block['blockName'] ?? null ) {
		case PROCESS_BLOCK:
			++$process_count;
			$stack[] = [
				'index' => $process_count,
				'id' => wp_unique_id( 'process-' ),
				'section' => null,
				'sections' => [],
				'steps' => [],
			];
			break;

		case SECTION_BLOCK:
			if ( empty( $stack ) ) {
				break;
			}

			$current = &$stack[ array_key_last( $stack ) ];
			$index = count( $current['sections'] );
			$current['sections'][] = [
				'title' => plain_text( $parsed_block['attrs']['title'] ?? '' ),
				'steps' => [],
			];
			$current['section'] = $index;
			break;
	}

	return $parsed_block;
}

/**
 * Register a step with the process currently rendering.
 *
 * @param string $title Step title (may contain HTML).
 * @return array|null Step data (index, number, id, section), or null if not inside a process.
 */
function register_step( string $title ): ?array {
	$stack = &get_stack();
	if ( empty( $stack ) ) {
		return null;
	}

	$current = &$stack[ array_key_last( $stack ) ];
	$index = count( $current['steps'] );
	$plain_title = plain_text( $title );
	if ( $plain_title === '' ) {
		/* translators: %d: step number */
		$plain_title = sprintf( __( 'Step %d', 'process-blocks' ), $index + 1 );
	}

	$step = [
		'index' => $index,
		'number' => $index + 1,
		'id' => sprintf( '%s-step-%d', $current['id'], $index + 1 ),
		'title' => $plain_title,
		'section' => $current['section'],
	];
	$current['steps'][] = $step;

	if ( $current['section'] !== null ) {
		$current['sections'][ $current['section'] ]['steps'][] = $index;
	}

	return $step;
}

/**
 * Finish rendering the current section.
 *
 * @return void
 */
function finish_section(): void {
	$stack = &get_stack();
	if ( ! empty( $stack ) ) {
		$stack[ array_key_last( $stack ) ]['section'] = null;
	}
}

/**
 * Finish rendering the current process, and get its collected data.
 *
 * @return array|null Process data, or null if no process is rendering.
 */
function finish_process(): ?array {
	$stack = &get_stack();
	return array_pop( $stack );
}

/**
 * Is a section currently rendering within the current process?
 *
 * @return bool
 */
function in_section(): bool {
	$stack = get_stack();
	return ! empty( $stack ) && end( $stack )['section'] !== null;
}

/**
 * Convert a rich text value to plain text.
 *
 * @param string $html Rich text HTML.
 * @return string Plain text.
 */
function plain_text( string $html ): string {
	return trim( html_entity_decode( wp_strip_all_tags( $html ), ENT_QUOTES, get_bloginfo( 'charset' ) ) );
}

/**
 * Get a heading level from block context, clamped to a valid range.
 *
 * @param WP_Block $block Block instance.
 * @param int $offset Offset from the process heading level.
 * @return int Heading level, between 2 and 6.
 */
function get_heading_level( WP_Block $block, int $offset = 0 ): int {
	$level = (int) ( $block->context['process-blocks/headingLevel'] ?? 2 );
	return max( 2, min( 6, $level + $offset ) );
}

/**
 * Register the interactivity state for the process store.
 *
 * Derived state mirrors the getters in view.js, so that the initial server
 * render matches what the client will produce before any progress is loaded.
 *
 * @return void
 */
function register_state(): void {
	static $registered = false;
	if ( $registered ) {
		return;
	}
	$registered = true;

	$get_context = fn () => wp_interactivity_get_context( STORE_NAMESPACE );

	$get_current_index = function () use ( $get_context ): int {
		$context = $get_context();
		foreach ( array_keys( $context['steps'] ?? [] ) as $index ) {
			if ( ! in_array( $index, $context['completed'] ?? [], true ) ) {
				return $index;
			}
		}
		return -1;
	};

	// The step being viewed; always the current step on the server, as the
	// viewed step depends on scroll position.
	$get_active_index = function () use ( $get_context, $get_current_index ): int {
		$viewing = $get_context()['viewing'] ?? -1;
		return $viewing === -1 ? $get_current_index() : $viewing;
	};

	$is_active_complete = function () use ( $get_context, $get_active_index ): bool {
		$index = $get_active_index();
		return $index !== -1 && in_array( $index, $get_context()['completed'] ?? [], true );
	};

	wp_interactivity_state( STORE_NAMESPACE, [
		'i18n' => [
			/* translators: 1: step number, 2: total number of steps */
			'stepOf' => __( 'Step %1$d of %2$d', 'process-blocks' ),
			'allComplete' => __( 'All steps complete', 'process-blocks' ),
			'finished' => __( 'You’ve finished this process.', 'process-blocks' ),
			/* translators: %d: step number */
			'backTo' => __( 'Back to step %d', 'process-blocks' ),
			/* translators: %d: step number */
			'jumpTo' => __( 'Jump to step %d', 'process-blocks' ),
			/* translators: %d: step number */
			'markIncomplete' => __( 'Mark step %d as incomplete', 'process-blocks' ),
			/* translators: 1: completed step number, 2: next step number, 3: next step title */
			'completeNext' => __( 'Step %1$d complete. Next, step %2$d: %3$s', 'process-blocks' ),
			/* translators: %d: step number */
			'incomplete' => __( 'Step %d marked as incomplete.', 'process-blocks' ),
			'reset' => __( 'Progress reset.', 'process-blocks' ),
		],

		'completedCount' => fn (): int => count( $get_context()['completed'] ?? [] ),
		'hasProgress' => fn (): bool => ! empty( $get_context()['completed'] ),
		'isAllComplete' => fn (): bool => $get_current_index() === -1,
		'isStepComplete' => function () use ( $get_context ): bool {
			$context = $get_context();
			return in_array( $context['index'] ?? null, $context['completed'] ?? [], true );
		},
		'isStepCurrent' => fn (): bool => ( $get_context()['index'] ?? null ) === $get_current_index(),
		'isStepActive' => fn (): bool => ( $get_context()['index'] ?? null ) === $get_active_index(),
		'isSectionComplete' => function () use ( $get_context ): bool {
			$context = $get_context();
			$section = $context['sections'][ $context['sectionIndex'] ?? -1 ] ?? null;
			if ( empty( $section['steps'] ) ) {
				return false;
			}
			return empty( array_diff( $section['steps'], $context['completed'] ?? [] ) );
		},
		'isActiveComplete' => $is_active_complete,
		'canCompleteActive' => fn (): bool => $get_active_index() !== -1 && ! $is_active_complete(),
		'activeLabel' => function () use ( $get_context, $get_active_index ): string {
			$index = $get_active_index();
			if ( $index === -1 ) {
				return __( 'All steps complete', 'process-blocks' );
			}
			/* translators: 1: step number, 2: total number of steps */
			return sprintf( __( 'Step %1$d of %2$d', 'process-blocks' ), $index + 1, count( $get_context()['steps'] ) );
		},
		'activeTitle' => function () use ( $get_context, $get_active_index ): string {
			$index = $get_active_index();
			if ( $index === -1 ) {
				return __( 'You’ve finished this process.', 'process-blocks' );
			}
			return $get_context()['steps'][ $index ]['title'] ?? '';
		},
		'activeSection' => function () use ( $get_context, $get_active_index ): string {
			$context = $get_context();
			$section = $context['steps'][ $get_active_index() ]['section'] ?? null;
			return $section === null ? '' : ( $context['sections'][ $section ]['title'] ?? '' );
		},
		/* translators: %d: step number */
		'undoLabel' => fn (): string => sprintf( __( 'Mark step %d as incomplete', 'process-blocks' ), $get_active_index() + 1 ),
		'showJump' => fn (): bool => $get_current_index() !== -1 && $get_active_index() !== $get_current_index(),
		'isJumpAbove' => fn (): bool => $get_current_index() < $get_active_index(),
		'jumpLabel' => function () use ( $get_current_index, $get_active_index ): string {
			$current = $get_current_index();
			return $current < $get_active_index()
				/* translators: %d: step number */
				? sprintf( __( 'Back to step %d', 'process-blocks' ), $current + 1 )
				/* translators: %d: step number */
				: sprintf( __( 'Jump to step %d', 'process-blocks' ), $current + 1 );
		},
		'progressWidth' => function () use ( $get_context ): string {
			$context = $get_context();
			$total = count( $context['steps'] ?? [] );
			if ( $total === 0 ) {
				return '0%';
			}
			return round( count( $context['completed'] ?? [] ) / $total * 100, 2 ) . '%';
		},
	] );
}

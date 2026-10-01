<?php
/**
 * Render the process block.
 *
 * @package HM\Process_Blocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var WP_Block $block      Block instance.
 */

use HM\Process_Blocks;

// Inner blocks have already rendered, so this contains every step.
$process = Process_Blocks\finish_process();
if ( $process === null || empty( $process['steps'] ) ) {
	return;
}

Process_Blocks\register_state();

$steps = $process['steps'];
$sections = $process['sections'];
$total = count( $steps );
$show_summary = $attributes['showSummary'] ?? true;

// Progress is keyed to this process's structure, so edits don't misapply
// stale progress to a changed list of steps.
$storage_key = sprintf(
	'process-blocks:%d:%d:%s',
	$block->context['postId'] ?? get_the_ID(),
	$process['index'],
	substr( md5( wp_json_encode( wp_list_pluck( $steps, 'title' ) ) ), 0, 8 )
);

$context = [
	'storageKey' => $storage_key,
	'steps' => array_map( fn ( $step ) => [
		'id' => $step['id'],
		'title' => $step['title'],
		'section' => $step['section'],
	], $steps ),
	'sections' => $sections,
	'completed' => [],
	'viewing' => -1,
	'announcement' => '',
	'isLoaded' => false,
];

$progress_count = sprintf(
	/* translators: 1: number of completed steps, 2: total number of steps */
	esc_html( _n( '%1$s of %2$s step complete', '%1$s of %2$s steps complete', $total, 'process-blocks' ) ),
	'<span data-wp-text="state.completedCount">0</span>',
	esc_html( number_format_i18n( $total ) )
);

/**
 * Render a checklist item for a step.
 *
 * @param array $step Step data.
 * @return void
 */
$render_item = function ( array $step ): void {
	?>
	<li
		class="wp-block-process-blocks-process__item"
		data-wp-context="<?php echo esc_attr( wp_json_encode( [ 'index' => $step['index'] ] ) ); ?>"
		data-wp-class--is-complete="state.isStepComplete"
		data-wp-class--is-current="state.isStepCurrent"
	>
		<a href="<?php echo esc_url( '#' . $step['id'] ); ?>" data-wp-on--click="actions.goToStep">
			<span class="wp-block-process-blocks-process__item-number"><?php echo esc_html( number_format_i18n( $step['number'] ) ); ?></span>
			<span class="wp-block-process-blocks-process__item-title"><?php echo esc_html( $step['title'] ); ?></span>
			<span class="screen-reader-text" data-wp-bind--hidden="!state.isStepComplete" hidden>
				<?php esc_html_e( '(complete)', 'process-blocks' ); ?>
			</span>
		</a>
	</li>
	<?php
};

$wrapper_attributes = get_block_wrapper_attributes( [
	'id' => $attributes['anchor'] ?? $process['id'],
	'data-wp-interactive' => Process_Blocks\STORE_NAMESPACE,
	'data-wp-context' => wp_json_encode( $context, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP ),
	'data-wp-init' => 'callbacks.load',
	'data-wp-watch' => 'callbacks.save',
	'data-wp-class--is-all-complete' => 'state.isAllComplete',
] );
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php if ( $show_summary ) : ?>
		<nav
			class="wp-block-process-blocks-process__summary"
			aria-label="<?php esc_attr_e( 'Process steps', 'process-blocks' ); ?>"
		>
			<div class="wp-block-process-blocks-process__summary-header">
				<p class="wp-block-process-blocks-process__count">
					<?php echo $progress_count; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</p>
				<button
					type="button"
					class="wp-block-process-blocks-process__reset"
					data-wp-on--click="actions.reset"
					data-wp-bind--disabled="!state.hasProgress"
				>
					<?php esc_html_e( 'Reset', 'process-blocks' ); ?>
				</button>
			</div>

			<ol class="wp-block-process-blocks-process__checklist">
				<?php if ( ! empty( $sections ) ) : ?>
					<?php
					foreach ( $sections as $section_index => $section ) :
						if ( empty( $section['steps'] ) ) {
							continue;
						}
						?>
						<li
							class="wp-block-process-blocks-process__checklist-section"
							data-wp-context="<?php echo esc_attr( wp_json_encode( [ 'sectionIndex' => $section_index ] ) ); ?>"
							data-wp-class--is-complete="state.isSectionComplete"
						>
							<?php if ( $section['title'] !== '' ) : ?>
								<span class="wp-block-process-blocks-process__checklist-section-title">
									<?php echo esc_html( $section['title'] ); ?>
								</span>
							<?php endif ?>
							<ol>
								<?php
								foreach ( $section['steps'] as $step_index ) {
									$render_item( $steps[ $step_index ] );
								}
								?>
							</ol>
						</li>
					<?php endforeach ?>
				<?php else : ?>
					<?php
					foreach ( $steps as $step ) {
						$render_item( $step );
					}
					?>
				<?php endif ?>
			</ol>
		</nav>
	<?php endif ?>

	<div class="wp-block-process-blocks-process__bar">
		<div class="wp-block-process-blocks-process__bar-inner">
			<div class="wp-block-process-blocks-process__status">
				<span class="wp-block-process-blocks-process__status-label">
					<span data-wp-text="state.activeLabel"></span>
					<span
						class="wp-block-process-blocks-process__status-section"
						data-wp-text="state.activeSection"
						data-wp-bind--hidden="!state.activeSection"
					></span>
				</span>
				<span class="wp-block-process-blocks-process__status-title" data-wp-text="state.activeTitle"></span>
			</div>
			<div class="wp-block-process-blocks-process__actions">
				<button
					type="button"
					class="wp-block-process-blocks-process__complete wp-element-button"
					data-wp-on--click="actions.completeActive"
					data-wp-class--is-hidden="!state.canCompleteActive"
				>
					<?php esc_html_e( 'Mark as complete', 'process-blocks' ); ?>
				</button>
				<span
					class="wp-block-process-blocks-process__completed"
					data-wp-class--is-hidden="!state.isActiveComplete"
				>
					<span class="wp-block-process-blocks-process__completed-label">
						<?php esc_html_e( 'Completed', 'process-blocks' ); ?>
					</span>
					<button
						type="button"
						class="wp-block-process-blocks-process__undo"
						data-wp-on--click="actions.uncompleteActive"
						data-wp-bind--aria-label="state.undoLabel"
					>
						<?php esc_html_e( 'Undo', 'process-blocks' ); ?>
					</button>
				</span>
			</div>
		</div>
		<div class="wp-block-process-blocks-process__bar-meta">
			<span class="wp-block-process-blocks-process__bar-count">
				<?php echo $progress_count; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			</span>
			<button
				type="button"
				class="wp-block-process-blocks-process__jump"
				data-wp-on--click="actions.goToCurrent"
				data-wp-bind--hidden="!state.showJump"
				data-wp-class--is-above="state.isJumpAbove"
				data-wp-text="state.jumpLabel"
			></button>
			<button
				type="button"
				class="wp-block-process-blocks-process__restart"
				data-wp-on--click="actions.reset"
				data-wp-bind--hidden="!state.isAllComplete"
			>
				<?php esc_html_e( 'Start again', 'process-blocks' ); ?>
			</button>
		</div>
		<div class="wp-block-process-blocks-process__progress" aria-hidden="true">
			<span data-wp-style--width="state.progressWidth"></span>
		</div>
		<p class="screen-reader-text" aria-live="polite" data-wp-text="context.announcement"></p>
	</div>

	<div class="wp-block-process-blocks-process__steps">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</div>
</div>

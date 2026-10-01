<?php
/**
 * Render the step block.
 *
 * @package HM\Process_Blocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var WP_Block $block      Block instance.
 */

use HM\Process_Blocks;

$step_title = $attributes['title'] ?? '';
$step = Process_Blocks\register_step( $step_title );

// Outside of a process, render as a plain group of content.
if ( $step === null ) {
	printf(
		'<div %s>%s</div>',
		get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	);
	return;
}

$heading_tag = 'h' . Process_Blocks\get_heading_level( $block, Process_Blocks\in_section() ? 1 : 0 );

$wrapper_attributes = get_block_wrapper_attributes( [
	'id' => $step['id'],
	'tabindex' => '-1',
	'data-wp-context' => wp_json_encode( [ 'index' => $step['index'] ] ),
	'data-wp-class--is-complete' => 'state.isStepComplete',
	'data-wp-class--is-current' => 'state.isStepCurrent',
	'data-wp-class--is-active' => 'state.isStepActive',
] );
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<div class="wp-block-process-blocks-step__header">
		<button
			type="button"
			class="wp-block-process-blocks-step__toggle"
			aria-pressed="false"
			data-wp-bind--aria-pressed="state.isStepComplete"
			data-wp-on--click="actions.toggleStep"
		>
			<span class="screen-reader-text">
				<?php
				/* translators: %d: step number */
				echo esc_html( sprintf( __( 'Mark step %d as complete', 'process-blocks' ), $step['number'] ) );
				?>
			</span>
		</button>
		<<?php echo $heading_tag; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> class="wp-block-process-blocks-step__title">
			<span class="wp-block-process-blocks-step__number">
				<?php
				/* translators: %d: step number */
				echo esc_html( sprintf( __( 'Step %d', 'process-blocks' ), $step['number'] ) );
				?>
			</span>
			<?php if ( trim( $step_title ) !== '' ) : ?>
				<span class="wp-block-process-blocks-step__title-text"><?php echo wp_kses_post( $step_title ); ?></span>
			<?php endif ?>
		</<?php echo $heading_tag; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	</div>
	<div class="wp-block-process-blocks-step__content">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</div>
</div>

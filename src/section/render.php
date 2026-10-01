<?php
/**
 * Render the section block.
 *
 * @package HM\Process_Blocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var WP_Block $block      Block instance.
 */

use HM\Process_Blocks;

// Inner steps have already rendered by this point, so the section is done.
Process_Blocks\finish_section();

$heading_tag = 'h' . Process_Blocks\get_heading_level( $block );
$section_title = $attributes['title'] ?? '';
?>
<section <?php echo get_block_wrapper_attributes(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php if ( trim( $section_title ) !== '' ) : ?>
		<<?php echo $heading_tag; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> class="wp-block-process-blocks-section__title">
			<?php echo wp_kses_post( $section_title ); ?>
		</<?php echo $heading_tag; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php endif ?>
	<div class="wp-block-process-blocks-section__steps">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</div>
</section>

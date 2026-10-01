import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { Button } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { plus } from '@wordpress/icons';

/**
 * Appender which directly inserts a block of the given type.
 *
 * @param {object} props              Component props.
 * @param {string} props.blockName    Block type to insert.
 * @param {string} props.label        Button label.
 * @param {string} props.rootClientId Client ID of the parent block.
 * @returns {Element} Appender button.
 */
export default function AddBlockButton( { blockName, label, rootClientId } ) {
	const count = useSelect(
		select => select( blockEditorStore ).getBlockCount( rootClientId ),
		[ rootClientId ]
	);
	const { insertBlock } = useDispatch( blockEditorStore );

	return (
		<div className="wp-block-process-blocks-appender">
			<Button
				__next40pxDefaultSize
				icon={ plus }
				variant="secondary"
				onClick={ () => insertBlock( createBlock( blockName ), count, rootClientId ) }
			>
				{ label }
			</Button>
		</div>
	);
}

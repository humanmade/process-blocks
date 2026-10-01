import { InnerBlocks } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { formatListNumbered } from '@wordpress/icons';

import metadata from './block.json';
import Edit from './edit';

import './editor.scss';
import './style.scss';

/**
 * Save inner blocks; the block itself is rendered on the server.
 *
 * @returns {Element} Inner blocks content.
 */
const save = () => <InnerBlocks.Content />;

registerBlockType( metadata.name, {
	icon: formatListNumbered,
	edit: Edit,
	save,
} );

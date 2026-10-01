import { InnerBlocks } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { check } from '@wordpress/icons';

import metadata from './block.json';
import Edit from './edit';

/**
 * Save inner blocks; the block itself is rendered on the server.
 *
 * @returns {Element} Inner blocks content.
 */
const save = () => <InnerBlocks.Content />;

registerBlockType( metadata.name, {
	icon: check,
	edit: Edit,
	save,
	/**
	 * Show the step title in the list view.
	 *
	 * @param {object} attributes      Block attributes.
	 * @param {object} options         Label options.
	 * @param {string} options.context Context the label is displayed in.
	 * @returns {string|undefined} Label, or undefined for the default.
	 */
	__experimentalLabel: ( attributes, { context } ) => {
		if ( context === 'list-view' && attributes.title ) {
			return attributes.title.replace( /<[^>]+>/g, '' );
		}
	},
} );

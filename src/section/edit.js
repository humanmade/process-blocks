import {
	RichText,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

import AddBlockButton from '../components/add-block-button';
import { STEP_BLOCK } from '../constants';

const ALLOWED_BLOCKS = [ STEP_BLOCK ];
const TEMPLATE = [ [ STEP_BLOCK ] ];

/**
 * Edit component for the section block.
 *
 * @param {object}   props               Block props.
 * @param {object}   props.attributes    Block attributes.
 * @param {string}   props.clientId      Block client ID.
 * @param {object}   props.context       Block context.
 * @param {Function} props.setAttributes Attribute setter.
 * @returns {Element} Editor element.
 */
export default function Edit( { attributes, clientId, context, setAttributes } ) {
	const level = Math.min( 6, Math.max( 2, context[ 'process-blocks/headingLevel' ] || 2 ) );
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-process-blocks-section__steps' },
		{
			allowedBlocks: ALLOWED_BLOCKS,
			template: TEMPLATE,
			/**
			 * Render a button to directly add a child block.
			 *
			 * @returns {Element} Appender.
			 */
			renderAppender: () => (
				<AddBlockButton
					blockName={ STEP_BLOCK }
					label={ __( 'Add step', 'process-blocks' ) }
					rootClientId={ clientId }
				/>
			),
		}
	);

	return (
		<section { ...blockProps }>
			<RichText
				className="wp-block-process-blocks-section__title"
				placeholder={ __( 'Section title', 'process-blocks' ) }
				tagName={ `h${ level }` }
				value={ attributes.title }
				onChange={ title => setAttributes( { title } ) }
			/>
			<div { ...innerBlocksProps } />
		</section>
	);
}

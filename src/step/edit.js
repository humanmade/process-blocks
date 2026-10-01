import {
	RichText,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';

import { PROCESS_BLOCK, SECTION_BLOCK, getSteps } from '../constants';

const TEMPLATE = [ [ 'core/paragraph' ] ];

/**
 * Edit component for the step block.
 *
 * @param {object}   props               Block props.
 * @param {object}   props.attributes    Block attributes.
 * @param {string}   props.clientId      Block client ID.
 * @param {object}   props.context       Block context.
 * @param {Function} props.setAttributes Attribute setter.
 * @returns {Element} Editor element.
 */
export default function Edit( { attributes, clientId, context, setAttributes } ) {
	const { number, inSection } = useSelect( select => {
		const {
			getBlockName,
			getBlockParentsByBlockName,
			getBlockRootClientId,
			getBlocks,
		} = select( blockEditorStore );
		const [ processId ] = getBlockParentsByBlockName( clientId, PROCESS_BLOCK, true );
		const steps = processId ? getSteps( getBlocks( processId ) ) : [];

		return {
			number: steps.findIndex( step => step.clientId === clientId ) + 1,
			inSection: getBlockName( getBlockRootClientId( clientId ) ) === SECTION_BLOCK,
		};
	}, [ clientId ] );

	/* translators: %d: step number */
	const label = sprintf( __( 'Step %d', 'process-blocks' ), number );
	const baseLevel = context[ 'process-blocks/headingLevel' ] || 2;
	const level = Math.min( 6, Math.max( 2, baseLevel + ( inSection ? 1 : 0 ) ) );

	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-process-blocks-step__content' },
		{ template: TEMPLATE }
	);

	return (
		<div { ...blockProps }>
			<div className="wp-block-process-blocks-step__header">
				<span aria-hidden="true" className="wp-block-process-blocks-step__toggle" />
				<div className="wp-block-process-blocks-step__title">
					{ number > 0 && (
						<span className="wp-block-process-blocks-step__number">{ label }</span>
					) }
					<RichText
						className="wp-block-process-blocks-step__title-text"
						placeholder={ __( 'Step title', 'process-blocks' ) }
						tagName={ `h${ level }` }
						value={ attributes.title }
						onChange={ title => setAttributes( { title } ) }
					/>
				</div>
			</div>
			<div { ...innerBlocksProps } />
		</div>
	);
}

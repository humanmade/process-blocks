import {
	InspectorControls,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { cloneBlock, createBlock } from '@wordpress/blocks';
import {
	Button,
	PanelBody,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __, _n, sprintf } from '@wordpress/i18n';

import AddBlockButton from '../components/add-block-button';
import { SECTION_BLOCK, STEP_BLOCK, getSteps } from '../constants';

const TEMPLATE = [ [ STEP_BLOCK ] ];

/**
 * Strip HTML from a rich text value.
 *
 * @param {string} html Rich text HTML.
 * @returns {string} Plain text.
 */
const stripTags = html => ( html || '' ).replace( /<[^>]+>/g, '' );

/**
 * Preview of the summary checklist shown on the frontend.
 *
 * @param {object} props       Component props.
 * @param {Array}  props.steps Steps in the process.
 * @returns {Element} Summary preview.
 */
function SummaryPreview( { steps } ) {
	const groups = [];
	steps.forEach( ( step, index ) => {
		const last = groups[ groups.length - 1 ];
		const item = {
			...step,
			number: index + 1,
		};
		if ( last && last.section === step.section ) {
			last.steps.push( item );
		} else {
			groups.push( {
				section: step.section,
				steps: [ item ],
			} );
		}
	} );

	/**
	 * Render a checklist item.
	 *
	 * @param {object} step Step data.
	 * @returns {Element} List item.
	 */
	const renderItem = step => {
		/* translators: %d: step number */
		const fallback = sprintf( __( 'Step %d', 'process-blocks' ), step.number );
		return (
			<li key={ step.clientId } className="wp-block-process-blocks-process__item">
				<span>
					<span className="wp-block-process-blocks-process__item-number">{ step.number }</span>
					<span className="wp-block-process-blocks-process__item-title">
						{ stripTags( step.title ) || fallback }
					</span>
				</span>
			</li>
		);
	};

	return (
		<div aria-hidden="true" className="wp-block-process-blocks-process__summary">
			<div className="wp-block-process-blocks-process__summary-header">
				<p className="wp-block-process-blocks-process__count">
					{ sprintf(
						/* translators: 1: number of completed steps, 2: total number of steps */
						_n( '%1$d of %2$d step complete', '%1$d of %2$d steps complete', steps.length, 'process-blocks' ),
						0,
						steps.length
					) }
				</p>
				<span className="wp-block-process-blocks-process__reset" disabled>
					{ __( 'Reset', 'process-blocks' ) }
				</span>
			</div>
			<ol className="wp-block-process-blocks-process__checklist">
				{ groups.map( ( group, index ) => ( group.section === null ? (
					group.steps.map( renderItem )
				) : (
					<li key={ index } className="wp-block-process-blocks-process__checklist-section">
						{ group.section && (
							<span className="wp-block-process-blocks-process__checklist-section-title">
								{ stripTags( group.section ) }
							</span>
						) }
						<ol>{ group.steps.map( renderItem ) }</ol>
					</li>
				) ) ) }
			</ol>
		</div>
	);
}

/**
 * Edit component for the process block.
 *
 * @param {object}   props               Block props.
 * @param {object}   props.attributes    Block attributes.
 * @param {string}   props.clientId      Block client ID.
 * @param {Function} props.setAttributes Attribute setter.
 * @returns {Element} Editor element.
 */
export default function Edit( { attributes, clientId, setAttributes } ) {
	const { headingLevel, showSummary } = attributes;
	const innerBlocks = useSelect(
		select => select( blockEditorStore ).getBlocks( clientId ),
		[ clientId ]
	);
	const { replaceInnerBlocks } = useDispatch( blockEditorStore );

	// A process contains either steps, or sections of steps; not a mix.
	const hasSections = innerBlocks.some( block => block.name === SECTION_BLOCK );
	const hasSteps = innerBlocks.some( block => block.name === STEP_BLOCK );
	let allowedBlocks = [ STEP_BLOCK, SECTION_BLOCK ];
	if ( hasSections ) {
		allowedBlocks = [ SECTION_BLOCK ];
	} else if ( hasSteps ) {
		allowedBlocks = [ STEP_BLOCK ];
	}

	const steps = getSteps( innerBlocks );

	/**
	 * Move all existing steps into a new section.
	 */
	const groupIntoSection = () => {
		const section = createBlock( SECTION_BLOCK, {}, innerBlocks.map( block => cloneBlock( block ) ) );
		replaceInnerBlocks( clientId, [ section ], true );
	};

	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-process-blocks-process__steps' },
		{
			allowedBlocks,
			template: TEMPLATE,
			/**
			 * Render a button to directly add a child block.
			 *
			 * @returns {Element} Appender.
			 */
			renderAppender: () => (
				<AddBlockButton
					blockName={ hasSections ? SECTION_BLOCK : STEP_BLOCK }
					label={ hasSections ? __( 'Add section', 'process-blocks' ) : __( 'Add step', 'process-blocks' ) }
					rootClientId={ clientId }
				/>
			),
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Settings', 'process-blocks' ) }>
					<ToggleControl
						__nextHasNoMarginBottom
						checked={ showSummary }
						help={ __( 'Show a checklist of all steps, with overall progress and a reset button.', 'process-blocks' ) }
						label={ __( 'Show summary checklist', 'process-blocks' ) }
						onChange={ value => setAttributes( { showSummary: value } ) }
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						help={ __( 'Heading level for sections. Steps use the next level down when inside a section.', 'process-blocks' ) }
						label={ __( 'Heading level', 'process-blocks' ) }
						options={ [ 2, 3, 4, 5 ].map( level => ( {
							/* translators: %d: heading level */
							label: sprintf( __( 'Heading %d', 'process-blocks' ), level ),
							value: level,
						} ) ) }
						value={ headingLevel }
						onChange={ value => setAttributes( { headingLevel: Number( value ) } ) }
					/>
				</PanelBody>
				{ hasSteps && ! hasSections && (
					<PanelBody title={ __( 'Sections', 'process-blocks' ) }>
						<p>
							{ __( 'Longer processes can be split into sections. Start by grouping the existing steps into a section.', 'process-blocks' ) }
						</p>
						<Button
							__next40pxDefaultSize
							variant="secondary"
							onClick={ groupIntoSection }
						>
							{ __( 'Group steps into a section', 'process-blocks' ) }
						</Button>
					</PanelBody>
				) }
			</InspectorControls>

			<div { ...blockProps }>
				{ showSummary && steps.length > 0 && (
					<SummaryPreview steps={ steps } />
				) }
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}

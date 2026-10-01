export const PROCESS_BLOCK = 'process-blocks/process';
export const SECTION_BLOCK = 'process-blocks/section';
export const STEP_BLOCK = 'process-blocks/step';

/**
 * Flatten a process's inner blocks into its list of steps.
 *
 * @param {Array}       blocks  Inner blocks of a process.
 * @param {string|null} section Title of the containing section, if any.
 * @returns {Array} Steps, with clientId, title, and section.
 */
export function getSteps( blocks, section = null ) {
	return blocks.flatMap( block => {
		if ( block.name === SECTION_BLOCK ) {
			return getSteps( block.innerBlocks, block.attributes.title || '' );
		}
		if ( block.name === STEP_BLOCK ) {
			return [ {
				clientId: block.clientId,
				title: block.attributes.title,
				section,
			} ];
		}
		return [];
	} );
}

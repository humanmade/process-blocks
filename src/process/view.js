/**
 * Frontend behaviour for the process block.
 *
 * Progress is a list of completed step indexes, stored in the process's
 * context and persisted to localStorage.
 *
 * Two steps are tracked:
 *
 * - The "current" step is the first incomplete step; where the reader is up to.
 * - The "active" step is the step being viewed, linked to scroll position.
 *   Before the reader scrolls into the steps, this falls back to the current
 *   step.
 *
 * The sticky bar shows the active step, and links back to the current step
 * when they differ.
 *
 * Derived state here is mirrored in PHP (see register_state()) for the
 * initial server render.
 */
import {
	getContext,
	getElement,
	store,
	withScope,
} from '@wordpress/interactivity';

/**
 * Sort step indexes numerically.
 *
 * @param {number[]} indexes Step indexes.
 * @returns {number[]} Sorted indexes.
 */
const sortIndexes = indexes => [ ...indexes ].sort( ( a, b ) => a - b );

/**
 * Get the index of the current (first incomplete) step.
 *
 * @param {object} context Process context.
 * @returns {number} Step index, or -1 if all steps are complete.
 */
const getCurrentIndex = context => context.steps.findIndex( ( step, index ) => ! context.completed.includes( index ) );

/**
 * Get the next incomplete step after a given step, wrapping to the start.
 *
 * @param {object} context Process context.
 * @param {number} after   Step index to search after.
 * @returns {number} Step index, or -1 if all steps are complete.
 */
const getNextIncomplete = ( context, after ) => {
	const next = context.steps.findIndex( ( step, index ) => index > after && ! context.completed.includes( index ) );
	return next === -1 ? getCurrentIndex( context ) : next;
};

/**
 * Format a translated string, replacing sprintf-style placeholders.
 *
 * Supports %s and %d, and numbered placeholders like %1$s.
 *
 * @param {string} template String with placeholders.
 * @param {...*}   args     Replacement values.
 * @returns {string} Formatted string.
 */
const format = ( template, ...args ) => {
	let next = 0;
	return template.replace( /%(?:(\d+)\$)?[sd]/g, ( match, position ) => args[ position ? position - 1 : next++ ] );
};

/**
 * Should motion be reduced?
 *
 * @returns {boolean} True if the user prefers reduced motion.
 */
const prefersReducedMotion = () => window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

/**
 * Scroll to a step, and move focus to it.
 *
 * @param {object} context Process context.
 * @param {number} index   Step index.
 */
const goToStep = ( context, index ) => {
	const step = context.steps[ index ];
	const element = step && document.getElementById( step.id );
	if ( ! element ) {
		return;
	}

	element.scrollIntoView( {
		behavior: prefersReducedMotion() ? 'auto' : 'smooth',
		block: 'start',
	} );
	element.focus( { preventScroll: true } );
};

/**
 * Find the step being viewed, based on scroll position.
 *
 * The viewed step is the last one whose top has scrolled above a line just
 * below the sticky bar. The line is close enough to the bar that a step
 * scrolled to with goToStep() is always the one viewed.
 *
 * @param {HTMLElement[]} elements Step elements.
 * @param {HTMLElement}   bar      Sticky bar element.
 * @returns {number} Step index, or -1 if no step has been reached.
 */
const getViewingIndex = ( elements, bar ) => {
	const barBottom = bar.getBoundingClientRect().bottom;
	const line = barBottom + Math.min( 120, ( window.innerHeight - barBottom ) / 4 );
	const tops = elements.map( element => element?.getBoundingClientRect().top ?? Infinity );

	let viewing = tops.findLastIndex( top => top <= line );

	// At the bottom of the page, the final steps may never reach the line,
	// so use the last step which is comfortably on screen.
	const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
	if ( atBottom && viewing !== -1 ) {
		const lastVisible = tops.findLastIndex( top => top < window.innerHeight * 0.75 );
		viewing = Math.max( viewing, lastVisible );
	}

	return viewing;
};

const { state } = store( 'process-blocks', {
	state: {
		/**
		 * Number of completed steps.
		 */
		get completedCount() {
			return getContext().completed.length;
		},

		/**
		 * Whether any steps are complete.
		 */
		get hasProgress() {
			return getContext().completed.length > 0;
		},

		/**
		 * Index of the current (first incomplete) step, or -1 if all are complete.
		 */
		get currentIndex() {
			return getCurrentIndex( getContext() );
		},

		/**
		 * Index of the step being viewed, falling back to the current step.
		 */
		get activeIndex() {
			const { viewing } = getContext();
			return viewing === -1 ? state.currentIndex : viewing;
		},

		/**
		 * Whether every step is complete.
		 */
		get isAllComplete() {
			return state.currentIndex === -1;
		},

		/**
		 * Whether the step in context is complete.
		 */
		get isStepComplete() {
			const context = getContext();
			return context.completed.includes( context.index );
		},

		/**
		 * Whether the step in context is the current step.
		 */
		get isStepCurrent() {
			return getContext().index === state.currentIndex;
		},

		/**
		 * Whether the step in context is the active (viewed) step.
		 */
		get isStepActive() {
			return getContext().index === state.activeIndex;
		},

		/**
		 * Whether every step in the section in context is complete.
		 */
		get isSectionComplete() {
			const context = getContext();
			const section = context.sections[ context.sectionIndex ];
			return !! section?.steps.length && section.steps.every( index => context.completed.includes( index ) );
		},

		/**
		 * Whether the active step is complete.
		 */
		get isActiveComplete() {
			return state.activeIndex !== -1 && getContext().completed.includes( state.activeIndex );
		},

		/**
		 * Whether the active step can be marked complete.
		 */
		get canCompleteActive() {
			return state.activeIndex !== -1 && ! state.isActiveComplete;
		},

		/**
		 * Label for the active step (e.g. "Step 2 of 5").
		 */
		get activeLabel() {
			const index = state.activeIndex;
			if ( index === -1 ) {
				return state.i18n.allComplete;
			}
			return format( state.i18n.stepOf, index + 1, getContext().steps.length );
		},

		/**
		 * Title of the active step.
		 */
		get activeTitle() {
			const index = state.activeIndex;
			if ( index === -1 ) {
				return state.i18n.finished;
			}
			return getContext().steps[ index ].title;
		},

		/**
		 * Title of the section containing the active step.
		 */
		get activeSection() {
			const context = getContext();
			const step = context.steps[ state.activeIndex ];
			if ( ! step || step.section === null ) {
				return '';
			}
			return context.sections[ step.section ]?.title || '';
		},

		/**
		 * Accessible label for undoing completion of the active step.
		 */
		get undoLabel() {
			return format( state.i18n.markIncomplete, state.activeIndex + 1 );
		},

		/**
		 * Whether to show the link back to the current step.
		 */
		get showJump() {
			return state.currentIndex !== -1 && state.activeIndex !== state.currentIndex;
		},

		/**
		 * Whether the current step is above the active step.
		 */
		get isJumpAbove() {
			return state.currentIndex < state.activeIndex;
		},

		/**
		 * Label for the link to the current step.
		 */
		get jumpLabel() {
			const formatString = state.isJumpAbove ? state.i18n.backTo : state.i18n.jumpTo;
			return format( formatString, state.currentIndex + 1 );
		},

		/**
		 * Completion percentage, as a CSS width.
		 */
		get progressWidth() {
			const context = getContext();
			if ( ! context.steps.length ) {
				return '0%';
			}
			return `${ ( context.completed.length / context.steps.length ) * 100 }%`;
		},
	},
	actions: {
		/**
		 * Mark the active step complete, and move on to the next incomplete step.
		 */
		completeActive() {
			const context = getContext();
			const index = state.activeIndex;
			if ( index === -1 || context.completed.includes( index ) ) {
				return;
			}

			context.completed = sortIndexes( [ ...context.completed, index ] );

			const next = getNextIncomplete( context, index );
			if ( next === -1 ) {
				context.announcement = state.i18n.finished;
				return;
			}

			context.announcement = format( state.i18n.completeNext, index + 1, next + 1, context.steps[ next ].title );
			goToStep( context, next );
		},

		/**
		 * Mark the active step as incomplete.
		 */
		uncompleteActive() {
			const context = getContext();
			const index = state.activeIndex;
			context.completed = context.completed.filter( completed => completed !== index );
			context.announcement = format( state.i18n.incomplete, index + 1 );
		},

		/**
		 * Toggle completion of the step in context.
		 */
		toggleStep() {
			const context = getContext();
			const { index } = context;
			if ( context.completed.includes( index ) ) {
				context.completed = context.completed.filter( completed => completed !== index );
			} else {
				context.completed = sortIndexes( [ ...context.completed, index ] );
			}
		},

		/**
		 * Scroll to the step in context.
		 *
		 * @param {Event} event Click event.
		 */
		goToStep( event ) {
			event.preventDefault();
			const context = getContext();
			goToStep( context, context.index );
			window.history.replaceState( null, '', `#${ context.steps[ context.index ].id }` );
		},

		/**
		 * Scroll to the current (first incomplete) step.
		 */
		goToCurrent() {
			goToStep( getContext(), state.currentIndex );
		},

		/**
		 * Clear all progress, and return to the start of the process.
		 */
		reset() {
			const context = getContext();
			context.completed = [];
			context.announcement = state.i18n.reset;

			const { ref } = getElement();
			ref.closest( '.wp-block-process-blocks-process' )?.scrollIntoView( {
				behavior: prefersReducedMotion() ? 'auto' : 'smooth',
				block: 'start',
			} );
		},
	},
	callbacks: {
		/**
		 * Load saved progress, and start tracking scroll position.
		 *
		 * @returns {Function} Cleanup callback.
		 */
		load() {
			const context = getContext();
			try {
				const stored = JSON.parse( window.localStorage.getItem( context.storageKey ) );
				if ( Array.isArray( stored ) ) {
					context.completed = sortIndexes( stored.filter(
						index => Number.isInteger( index ) && index >= 0 && index < context.steps.length
					) );
				}
			} catch {
				// Storage unavailable or invalid; start fresh.
			}
			context.isLoaded = true;

			const { ref } = getElement();
			const bar = ref.querySelector( ':scope > .wp-block-process-blocks-process__bar' );
			if ( ! bar ) {
				return;
			}

			// Track the sticky bar's height, so steps scroll clear of it (with
			// a little breathing room).
			const resizeObserver = new window.ResizeObserver( () => {
				const offset = `calc( var( --process-blocks--sticky-top ) + ${ bar.offsetHeight + 16 }px )`;
				ref.style.setProperty( '--process-blocks--scroll-offset', offset );
			} );
			resizeObserver.observe( bar );

			// Link the active step to scroll position, once per frame.
			const elements = context.steps.map( step => document.getElementById( step.id ) );
			let frame = null;
			const update = withScope( () => {
				frame = null;
				const viewing = getViewingIndex( elements, bar );
				const scoped = getContext();
				if ( scoped.viewing !== viewing ) {
					scoped.viewing = viewing;
				}
			} );
			/**
			 *
			 */
			const onScroll = () => {
				if ( frame === null ) {
					frame = window.requestAnimationFrame( update );
				}
			};
			window.addEventListener( 'scroll', onScroll, { passive: true } );
			window.addEventListener( 'resize', onScroll, { passive: true } );
			update();

			return () => {
				resizeObserver.disconnect();
				window.removeEventListener( 'scroll', onScroll );
				window.removeEventListener( 'resize', onScroll );
				if ( frame !== null ) {
					window.cancelAnimationFrame( frame );
				}
			};
		},

		/**
		 * Save progress to storage whenever it changes.
		 */
		save() {
			const context = getContext();
			const { completed, isLoaded, storageKey } = context;
			if ( ! isLoaded ) {
				return;
			}

			try {
				if ( completed.length ) {
					window.localStorage.setItem( storageKey, JSON.stringify( completed ) );
				} else {
					window.localStorage.removeItem( storageKey );
				}
			} catch {
				// Storage unavailable; progress won't persist.
			}
		},
	},
} );

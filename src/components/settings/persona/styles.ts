/**
 * Spacing constants for persona editor components
 * Provides consistent padding and spacing across the UI
 */

export const SPACING = {
    /** Standard header padding for editor views */
    HEADER: 'px-6 py-3',
    /** Footer/action bar padding */
    FOOTER: 'px-4 py-3',
    /** Main content padding */
    CONTENT: 'p-4',
    /** List/tab header padding*/
    LIST_HEADER: 'px-4 pt-4 pb-2',
    /** Section gap for vertical*/
    SECTION_GAP: 'space-y-3',
    /** Small section gap */
    SECTION_GAP_SM: 'space-y-2',
    /** Tiny section gap */
    SECTION_GAP_XS: 'space-y-0.5',
} as const;

/**
 * Input width constants for consistent sizing
 */
export const INPUT_WIDTHS = {
    /** Width for number inputs in feature controls */
    NUMBER: 'w-20',
    /** Width for select dropdowns in feature controls */
    SELECT: 'w-28',
} as const;

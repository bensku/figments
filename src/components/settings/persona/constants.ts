import type { PersonaSource } from './persona-card';

export const sourceBadgeStyles: Record<PersonaSource, string> = {
    instance: 'bg-gray-100 text-gray-600',
    user: 'bg-blue-100 text-blue-600',
    space: 'bg-green-100 text-green-600',
};

export const sourceLabels: Record<PersonaSource, string> = {
    instance: 'Instance',
    user: 'User',
    space: 'Space',
};

/**
 * Input width constants for consistent sizing across forms
 */
export const INPUT_WIDTHS = {
    /** Width for number inputs in feature controls */
    NUMBER: 'w-20',
    /** Width for select dropdowns in feature controls */
    SELECT: 'w-28',
} as const;

import { useView } from '@/context/view';

export function ViewToggle() {
    const { viewMode, toggleViewMode } = useView();

    return (
        <button
            type="button"
            onClick={toggleViewMode}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200
                       transition-colors text-sm font-medium text-gray-700"
            aria-pressed={viewMode === 'graph'}
        >
            {viewMode === 'strand' ? 'Show Tree' : 'Show Conversation'}
        </button>
    );
}

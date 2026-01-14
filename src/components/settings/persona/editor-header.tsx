import { SPACING } from './styles';

interface EditorHeaderProps {
    title: string;
    onBack: () => void;
}

export function EditorHeader({ title, onBack }: EditorHeaderProps) {
    return (
        <div
            className={`${SPACING.HEADER} border-b border-gray-200 flex items-center gap-2`}
        >
            <button
                type="button"
                onClick={onBack}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Back to list"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
    );
}

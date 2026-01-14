import { ArrowLeft } from 'lucide-react';
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
                <ArrowLeft width="20" height="20" aria-hidden="true" />
            </button>
            <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
    );
}

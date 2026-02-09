import { Eye } from 'lucide-react';
import { useSpace } from '@/context/space';
import { ConversationView } from './conversation';

interface SharedSpaceProps {
    initialFocusedNode: string | null;
    onFocusChange: (nodeId: string | null) => void;
}

/**
 * Minimal viewer for shared spaces. No sidebar, just a header
 * with a read-only indicator and the conversation view.
 */
export function SharedSpace({
    initialFocusedNode,
    onFocusChange,
}: SharedSpaceProps) {
    const { spaceDoc, readOnly } = useSpace();

    if (!spaceDoc) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                Loading shared space...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="h-14 border-b border-gray-200 bg-white shrink-0">
                <div className="max-w-6xl mx-auto px-4 lg:px-8 h-full">
                    <div className="flex h-full items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-semibold text-gray-800">
                                Figments
                            </span>
                            <span className="text-gray-300">|</span>
                            <span>Shared Space</span>
                        </div>
                        {readOnly && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                                <Eye className="w-3.5 h-3.5" />
                                Read-only
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <ConversationView
                    initialFocusedNode={initialFocusedNode}
                    onFocusChange={onFocusChange}
                />
            </div>
        </div>
    );
}

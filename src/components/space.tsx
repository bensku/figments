import { useSpace } from '@/context/space';
import { ConversationView } from './conversation';

interface SpaceProps {
    initialFocusedNode: string | null;
    onFocusChange: (nodeId: string | null) => void;
}

export const Space = ({ initialFocusedNode, onFocusChange }: SpaceProps) => {
    const { spaceDoc } = useSpace();

    if (!spaceDoc) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                Loading...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
                <ConversationView
                    initialFocusedNode={initialFocusedNode}
                    onFocusChange={onFocusChange}
                />
            </div>
        </div>
    );
};

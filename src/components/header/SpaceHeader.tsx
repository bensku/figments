import { upsert } from '@bensku/y-query';
import { useEffect, useRef, useState } from 'react';
import { useUserDoc } from '@/context/user';
import { SpaceTable } from '@/tables/user';
import { ViewToggle } from './ViewToggle';

interface SpaceHeaderProps {
    spaceId: string;
    title: string;
}

export function SpaceHeader({ spaceId, title }: SpaceHeaderProps) {
    const userDoc = useUserDoc();
    const [isEditing, setIsEditing] = useState(false);
    const [editingTitle, setEditingTitle] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleStartEditing = () => {
        setEditingTitle(title);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!editingTitle.trim()) {
            setIsEditing(false);
            return;
        }

        upsert(userDoc, SpaceTable, {
            key: spaceId,
            spaceId,
            title: editingTitle.trim(),
        });

        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditingTitle(title);
    };

    return (
        <div className="h-14 border-b border-gray-200 bg-white shrink-0">
            <div className="max-w-6xl mx-auto px-4 lg:px-8 h-full">
                <div className="grid grid-cols-[1fr_2rem_12rem] h-full items-center">
                    <div className="flex items-center justify-between">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={editingTitle}
                                onChange={(e) =>
                                    setEditingTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave();
                                    if (e.key === 'Escape') handleCancel();
                                }}
                                onBlur={handleSave}
                                className="flex-1 text-lg font-semibold text-gray-800 bg-transparent border-b-2 border-blue-500 focus:outline-none px-0 py-1"
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={handleStartEditing}
                                className="text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors cursor-text"
                            >
                                {title}
                            </button>
                        )}
                        <ViewToggle />
                    </div>
                </div>
            </div>
        </div>
    );
}

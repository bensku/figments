import { useCallback, useRef } from 'react';

export function useAutoExpandingTextarea() {
    const ref = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(() => {
        const textarea = ref.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, []);

    const resetHeight = useCallback(() => {
        const textarea = ref.current;
        if (textarea) {
            textarea.style.height = 'auto';
        }
    }, []);

    return { ref, adjustHeight, resetHeight };
}

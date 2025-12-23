import { type RefObject, useEffect } from 'react';

export function useAutoFocus(
    condition: boolean,
    ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    selectAll = false,
) {
    useEffect(() => {
        if (condition && ref.current) {
            ref.current.focus();
            if (selectAll && ref.current instanceof HTMLInputElement) {
                ref.current.select();
            }
        }
    }, [condition, selectAll, ref]);
}

import { useEffect } from 'react';
import {
    type KeyBindingMap,
    tinykeys,
} from '@/../node_modules/tinykeys/dist/tinykeys';

/**
 * Registers keyboard shortcuts that are live as long as calling component
 * exists.
 * @param bindings Tinykeys keybinding map.
 */
export function useShortcuts(bindings: KeyBindingMap) {
    useEffect(() => {
        const unsubscribe = tinykeys(window, bindings);
        return () => {
            unsubscribe();
        };
    }, [bindings]);
}

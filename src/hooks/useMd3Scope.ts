import { useLayoutEffect } from 'react';

/** The attribute on <html> that enables the Material Design 3 styles (see styles/md3). */
export const MD3_SCOPE_ATTRIBUTE = 'data-md3';

/** Enables or disables the Material Design 3 styles for the document. */
export const setMd3Scope = (enabled: boolean, root: HTMLElement = document.documentElement) => {
    if (enabled) {
        root.setAttribute(MD3_SCOPE_ATTRIBUTE, '');
    } else {
        root.removeAttribute(MD3_SCOPE_ATTRIBUTE);
    }
};

/**
 * Applies the Material Design 3 styles while the calling layout is mounted.
 * The user app layouts enable it; the dashboard and wizard never do, so their appearance is unchanged.
 */
export const useMd3Scope = (enabled = true) => {
    useLayoutEffect(() => {
        if (!enabled) return;

        setMd3Scope(true);

        return () => {
            setMd3Scope(false);
        };
    }, [ enabled ]);
};

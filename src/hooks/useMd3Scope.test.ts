import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { MD3_SCOPE_ATTRIBUTE, setMd3Scope, useMd3Scope } from './useMd3Scope';

const hasScope = () => document.documentElement.hasAttribute(MD3_SCOPE_ATTRIBUTE);

const TestComponent = ({ enabled }: { enabled?: boolean }) => {
    useMd3Scope(enabled);
    return null;
};

describe('useMd3Scope', () => {
    let root: Root | undefined;

    beforeAll(() => {
        // Tell React this is a test environment that supports act()
        Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    });

    afterEach(() => {
        act(() => root?.unmount());
        root = undefined;
        document.documentElement.removeAttribute(MD3_SCOPE_ATTRIBUTE);
    });

    const render = (enabled?: boolean) => {
        root = createRoot(document.createElement('div'));
        act(() => root?.render(createElement(TestComponent, { enabled })));
    };

    it('should toggle the scope attribute', () => {
        setMd3Scope(true);
        expect(hasScope()).toBe(true);

        setMd3Scope(false);
        expect(hasScope()).toBe(false);
    });

    it('should set the scope while mounted and remove it on unmount', () => {
        render();
        expect(hasScope()).toBe(true);

        act(() => root?.unmount());
        root = undefined;
        expect(hasScope()).toBe(false);
    });

    it('should not set the scope when disabled', () => {
        render(false);
        expect(hasScope()).toBe(false);
    });
});

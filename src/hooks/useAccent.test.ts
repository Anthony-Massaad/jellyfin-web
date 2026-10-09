import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ accent: '' }));

vi.mock('scripts/settings/userSettings', () => ({
    currentSettings: { accent: () => mocks.accent }
}));

import { ACCENT_ATTRIBUTE } from 'scripts/accent';
import { currentSettings } from 'scripts/settings/userSettings';
import Events from 'utils/events';

import { useAccent } from './useAccent';

const getAccent = () => document.documentElement.getAttribute(ACCENT_ATTRIBUTE);

const TestComponent = ({ enabled }: { enabled?: boolean }) => {
    useAccent(enabled);
    return null;
};

describe('useAccent', () => {
    let root: Root | undefined;

    beforeAll(() => {
        Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    });

    afterEach(() => {
        act(() => root?.unmount());
        root = undefined;
        mocks.accent = '';
    });

    const render = (enabled?: boolean) => {
        root = createRoot(document.createElement('div'));
        act(() => root?.render(createElement(TestComponent, { enabled })));
    };

    it('should apply the saved accent and remove it when unmounted', () => {
        mocks.accent = 'teal';
        render();
        expect(getAccent()).toBe('teal');

        act(() => root?.unmount());
        root = undefined;
        expect(getAccent()).toBeNull();
    });

    it('should follow setting changes and loaded server preferences', () => {
        render();
        expect(getAccent()).toBeNull();

        mocks.accent = 'orange';
        act(() => Events.trigger(currentSettings, 'change', [ 'appAccent' ]));
        expect(getAccent()).toBe('orange');

        mocks.accent = 'pink';
        act(() => Events.trigger(currentSettings, 'change', [ 'appTheme' ]));
        expect(getAccent()).toBe('orange');

        act(() => Events.trigger(currentSettings, 'load'));
        expect(getAccent()).toBe('pink');
    });

    it('should do nothing when disabled', () => {
        mocks.accent = 'red';
        render(false);
        expect(getAccent()).toBeNull();
    });
});

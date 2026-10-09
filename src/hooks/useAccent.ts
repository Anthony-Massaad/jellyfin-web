import { useLayoutEffect } from 'react';

import { applyAccent } from 'scripts/accent';
import { currentSettings as userSettings } from 'scripts/settings/userSettings';
import Events, { type Event } from 'utils/events';

const ACCENT_SETTING = 'appAccent';

/**
 * Applies the user's accent color while the calling layout is mounted, and follows changes to the setting
 * (including when the synced server preferences finish loading). Like the MD3 scope, the dashboard never applies it.
 */
export const useAccent = (enabled = true) => {
    useLayoutEffect(() => {
        if (!enabled) return;

        const update = () => applyAccent(userSettings.accent());
        const onChange = (_e: Event, name?: string) => {
            if (name === ACCENT_SETTING) update();
        };

        update();
        Events.on(userSettings, 'change', onChange);
        Events.on(userSettings, 'load', update);

        return () => {
            Events.off(userSettings, 'change', onChange);
            Events.off(userSettings, 'load', update);
            applyAccent(null);
        };
    }, [ enabled ]);
};

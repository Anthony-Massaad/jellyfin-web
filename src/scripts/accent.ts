/**
 * Accent colors of the MD3 user interface (styles/md3/components/_accents.scss).
 *
 * The accent is a user setting that is synced to the server display preferences (see UserSettings.accent), and is
 * applied as the `data-accent` attribute on <html> while the MD3 scope is active. "Theme default" removes it.
 */

/** The attribute on <html> that selects the accent. */
export const ACCENT_ATTRIBUTE = 'data-accent';

/** The accent ids, in display order. Keep in sync with ACCENTS in scripts/generate-md3-tokens.mjs. */
export const ACCENTS = [ 'blue', 'teal', 'green', 'yellow', 'orange', 'red', 'pink', 'purple' ] as const;

export type Accent = typeof ACCENTS[number];

/** The translation keys of the accent names. */
export const ACCENT_NAME_KEYS: Record<Accent, string> = {
    blue: 'AccentBlue',
    teal: 'AccentTeal',
    green: 'AccentGreen',
    yellow: 'AccentYellow',
    orange: 'AccentOrange',
    red: 'AccentRed',
    pink: 'AccentPink',
    purple: 'AccentPurple'
};

export const isAccent = (value: unknown): value is Accent => (
    typeof value === 'string' && (ACCENTS as readonly string[]).includes(value)
);

let accentSupported: boolean | undefined;

/** Accents rely on CSS custom properties, which old TV browsers do not support. */
export const isAccentSupported = () => {
    if (accentSupported === undefined) {
        const style = document.createElement('div').style;
        style.setProperty('--accent-test', '1');
        accentSupported = style.getPropertyValue('--accent-test') === '1';
    }

    return accentSupported;
};

/** Applies an accent to the document, or the theme default for an empty or unknown value. */
export const applyAccent = (accent: string | null | undefined, root: HTMLElement = document.documentElement) => {
    if (isAccent(accent)) {
        root.setAttribute(ACCENT_ATTRIBUTE, accent);
    } else {
        root.removeAttribute(ACCENT_ATTRIBUTE);
    }
};

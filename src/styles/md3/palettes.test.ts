// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(resolve(__dirname, '_palettes.generated.scss'), 'utf-8');

/** Parses the generated `$<theme>: ('role': #hex, ...)` maps. */
const SCHEMES = Array.from(SOURCE.matchAll(/^\$([a-z]+): \(\n([\s\S]*?)\n\);/gm))
    .filter(([ , name ]) => name !== 'schemes')
    .map(([ , name, body ]) => [
        name,
        Object.fromEntries(Array.from(body.matchAll(/'([a-z-]+)': (#[0-9a-f]{3,6})/g)).map(([ , role, hex ]) => [ role, hex ]))
    ] as [ string, Record<string, string> ]);

/** Parses the generated `$accent-<id>-<dark|light>: (...)` maps. */
const ACCENT_SCHEMES = Array.from(SOURCE.matchAll(/^\$accent-([a-z]+)-(dark|light): \(\n([\s\S]*?)\n\);/gm))
    .map(([ , id, brightness, body ]) => [
        `${id} (${brightness})`,
        brightness === 'dark',
        Object.fromEntries(Array.from(body.matchAll(/'([a-z-]+)': (#[0-9a-f]{3,6})/g)).map(([ , role, hex ]) => [ role, hex ]))
    ] as [ string, boolean, Record<string, string> ]);

/** Whether each theme is dark, from the generated `$is-dark` map. */
const IS_DARK = Object.fromEntries(
    Array.from(/^\$is-dark: \(\n([\s\S]*?)\n\);/m.exec(SOURCE)?.[1].matchAll(/'([a-z]+)': (true|false)/g) ?? [])
        .map(([ , id, value ]) => [ id, value === 'true' ])
);

const toRgb = (hex: string) => {
    const value = hex.length === 4 ? hex.slice(1).split('').map(c => c + c).join('') : hex.slice(1);
    return [ 0, 2, 4 ].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
};

/** WCAG 2 relative luminance */
const luminance = (hex: string) => {
    const [ r, g, b ] = toRgb(hex).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
    const [ high, low ] = [ luminance(a), luminance(b) ].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
};

/** Text and background pairs used by the MD3 styles, with the minimum WCAG AA contrast ratio. */
const PAIRS: [ string, string, number ][] = [
    [ 'on-surface', 'surface', 4.5 ],
    [ 'on-surface', 'surface-container-low', 4.5 ],
    [ 'on-surface', 'surface-container', 4.5 ],
    [ 'on-surface', 'surface-container-high', 4.5 ],
    [ 'on-surface', 'surface-container-highest', 4.5 ],
    [ 'on-surface-variant', 'surface', 4.5 ],
    [ 'on-surface-variant', 'surface-container-high', 4.5 ],
    [ 'primary', 'surface', 4.5 ],
    [ 'on-primary', 'primary', 4.5 ],
    [ 'on-primary-container', 'primary-container', 4.5 ],
    [ 'on-secondary-container', 'secondary-container', 4.5 ],
    [ 'on-tertiary-container', 'tertiary-container', 4.5 ],
    [ 'on-error', 'error', 4.5 ],
    [ 'inverse-on-surface', 'inverse-surface', 4.5 ],
    // Non-text UI (borders of chips, fields and switches)
    [ 'outline', 'surface', 3 ]
];

/** Text and background pairs within an accent. */
const ACCENT_PAIRS: [ string, string ][] = [
    [ 'on-primary', 'primary' ],
    [ 'on-primary-container', 'primary-container' ],
    [ 'on-secondary-container', 'secondary-container' ],
    [ 'on-tertiary-container', 'tertiary-container' ]
];

describe('MD3 palettes', () => {
    it('should include every theme', () => {
        expect(SCHEMES.map(([ name ]) => name)).toEqual(expect.arrayContaining([
            'dark', 'light', 'appletv', 'blueradiance', 'purplehaze', 'wmc', 'ember', 'forest', 'orchid'
        ]));
    });

    describe.each(SCHEMES)('%s', (_name, scheme) => {
        it.each(PAIRS)('should have enough contrast for %s on %s', (foreground, background, minimum) => {
            expect(contrast(scheme[foreground], scheme[background])).toBeGreaterThanOrEqual(minimum);
        });
    });

    it('should include a dark and a light variant of every accent', () => {
        expect(ACCENT_SCHEMES).toHaveLength(16);
    });

    // An accent replaces the accent roles of any theme with the same brightness, so check the pairs within the accent,
    // and its primary color on the surfaces of every matching theme
    describe.each(ACCENT_SCHEMES)('accent %s', (_name, isDark, accent) => {
        it.each(ACCENT_PAIRS)('should have enough contrast for %s on %s', (foreground, background) => {
            expect(contrast(accent[foreground], accent[background])).toBeGreaterThanOrEqual(4.5);
        });

        it.each(SCHEMES.filter(([ name ]) => IS_DARK[name] === isDark))('should have enough contrast for primary on the %s theme surfaces', (_theme, scheme) => {
            expect(contrast(accent.primary, scheme.surface)).toBeGreaterThanOrEqual(4.5);
            expect(contrast(accent.primary, scheme['surface-container-high'])).toBeGreaterThanOrEqual(3);
        });
    });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ACCENT_ATTRIBUTE, ACCENT_NAME_KEYS, ACCENTS, applyAccent, isAccent } from './accent';

const GENERATED = readFileSync(resolve(__dirname, '../styles/md3/_palettes.generated.scss'), 'utf-8');
const STRINGS = JSON.parse(readFileSync(resolve(__dirname, '../strings/en-us.json'), 'utf-8')) as Record<string, string>;

describe('accent', () => {
    afterEach(() => {
        document.documentElement.removeAttribute(ACCENT_ATTRIBUTE);
    });

    it('should match the accents generated for the styles', () => {
        const generated = Array.from(GENERATED.matchAll(/^ {4}'([a-z]+)': \('dark': \$accent-/gm)).map(([ , id ]) => id);
        expect(generated).toEqual([ ...ACCENTS ]);
    });

    it('should have a translated name for every accent', () => {
        ACCENTS.forEach(id => {
            expect(STRINGS[ACCENT_NAME_KEYS[id]]).toBeTruthy();
        });
        expect(STRINGS.AccentThemeDefault).toBeTruthy();
    });

    it('should only accept known accents', () => {
        expect(isAccent('blue')).toBe(true);
        expect(isAccent('')).toBe(false);
        expect(isAccent('magenta')).toBe(false);
        expect(isAccent(undefined)).toBe(false);
    });

    it('should set and clear the accent attribute', () => {
        applyAccent('green');
        expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe('green');

        applyAccent('');
        expect(document.documentElement.hasAttribute(ACCENT_ATTRIBUTE)).toBe(false);

        applyAccent('purple');
        applyAccent('not-an-accent');
        expect(document.documentElement.hasAttribute(ACCENT_ATTRIBUTE)).toBe(false);
    });
});

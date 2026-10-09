import { describe, expect, it, vi } from 'vitest';

vi.mock('scripts/settings/userSettings', () => ({
    get: (key: string) => (key === 'landing-lib' ? 'suggestions' : null)
}));

import { getDefaultViewIndex, isViewIndexAvailable } from './path';

describe('isViewIndexAvailable', () => {
    it('should only accept the listed views of movies and shows', () => {
        expect(isViewIndexAvailable('/movies', 0)).toBe(true);
        expect(isViewIndexAvailable('/movies', 4)).toBe(true);
        // Favorites is not listed either
        expect(isViewIndexAvailable('/movies', 2)).toBe(false);
        // Suggestions, collections and playlists are not listed
        expect(isViewIndexAvailable('/movies', 1)).toBe(false);
        expect(isViewIndexAvailable('/movies', 3)).toBe(false);
        expect(isViewIndexAvailable('/movies', 6)).toBe(false);

        expect(isViewIndexAvailable('/tv', 5)).toBe(true);
        // Suggestions, upcoming, networks, collections and playlists are not listed
        expect([ 1, 2, 4, 6, 7 ].some(index => isViewIndexAvailable('/tv', index))).toBe(false);
    });

    it('should accept any index outside of libraries', () => {
        expect(isViewIndexAvailable('/home', 3)).toBe(true);
    });
});

describe('getDefaultViewIndex', () => {
    it('should fall back to the default view when the saved landing view is not listed', () => {
        expect(getDefaultViewIndex('/movies', 'lib')).toBe(0);
        expect(getDefaultViewIndex('/tv', 'lib')).toBe(0);
    });
});

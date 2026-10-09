import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { ApiClient } from 'jellyfin-apiclient';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ITEMS: BaseItemDto[] = [
    { Id: 'a', Name: 'First <Item>', Type: 'Movie', Overview: 'Overview A', BackdropImageTags: [ 'tagA' ], ImageTags: { Logo: 'logoA' }, Genres: [ 'Drama', 'Comedy' ] },
    { Id: 'b', Name: 'Second', Type: 'Series', Overview: 'Overview B', BackdropImageTags: [ 'tagB' ] },
    { Id: 'c', Name: 'Third', Type: 'Movie', Overview: 'Overview C', BackdropImageTags: [ 'tagC' ] }
];

const mocks = vi.hoisted(() => ({
    items: [] as BaseItemDto[]
}));

vi.mock('utils/query/queryClient', () => ({
    queryClient: {
        fetchQuery: vi.fn(() => Promise.resolve(mocks.items))
    }
}));
vi.mock('lib/jellyfin-apiclient/ServerConnections', () => ({
    default: { getApi: vi.fn(() => ({})) }
}));
vi.mock('lib/globalize', () => ({
    default: { translate: (key: string) => key, getIsRTL: () => false }
}));
vi.mock('components/layoutManager', () => ({
    default: { tv: false }
}));
vi.mock('components/mediainfo/mediainfo', () => ({
    getPrimaryMediaInfoHtml: () => '<div class="mediaInfoItem">2024</div>'
}));
vi.mock('components/playback/playbackmanager', () => ({
    playbackManager: { play: vi.fn(() => Promise.resolve()) }
}));
vi.mock('components/router/appRouter', () => ({
    appRouter: { showItem: vi.fn() }
}));
vi.mock('elements/emby-button/emby-button', () => ({}));

import { playbackManager } from 'components/playback/playbackmanager';
import { appRouter } from 'components/router/appRouter';

import { destroySpotlight, loadSpotlight, pauseSpotlight } from './spotlight';

const apiClient = {
    serverId: () => 'server',
    getCurrentUserId: () => 'user',
    getScaledImageUrl: (id: string, { type, tag }: { type: string, tag: string }) => `/Items/${id}/Images/${type}?tag=${tag}`
} as unknown as ApiClient;

const getActiveIndex = (elem: HTMLElement) => (
    elem.querySelector('.homeSpotlight-slide-active')?.getAttribute('data-index')
);

const getActiveIndicator = (elem: HTMLElement) => (
    elem.querySelector('.homeSpotlight-indicator-active')?.getAttribute('data-index')
);

/** The time the current item takes to fade out. */
const FADE_OUT = 400;

describe('spotlight', () => {
    let elem: HTMLElement;

    beforeEach(() => {
        vi.useFakeTimers();
        // Keep the shuffle stable (Fisher–Yates with j = i)
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        mocks.items = ITEMS;
        elem = document.createElement('div');
        document.body.appendChild(elem);
    });

    afterEach(() => {
        destroySpotlight(elem);
        elem.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should render a slide and a progress indicator for each item', async () => {
        await loadSpotlight(elem, apiClient);

        expect(elem.querySelectorAll('.homeSpotlight-slide')).toHaveLength(3);
        expect(elem.querySelectorAll('.homeSpotlight-indicator')).toHaveLength(3);
        expect(elem.querySelector('.homeSpotlight')?.classList.contains('homeSpotlight-autoplay')).toBe(true);
        expect(elem.querySelector('.homeSpotlight')?.getAttribute('aria-label')).toBe('HeaderSpotlight');
        expect(getActiveIndex(elem)).toBe('0');
    });

    it('should show a shuffled, deduplicated and limited mix of items', async () => {
        mocks.items = [ ...ITEMS, ITEMS[0], ...Array.from({ length: 10 }, (_, i) => ({ ...ITEMS[1], Id: `x${i}` })) ];
        vi.spyOn(Math, 'random').mockReturnValue(0);

        await loadSpotlight(elem, apiClient);

        const slides = elem.querySelectorAll('.homeSpotlight-slide');
        expect(slides).toHaveLength(8);
        // The order is shuffled, so the first item changes
        expect(elem.querySelector('.homeSpotlight-slide-active .homeSpotlight-title')?.textContent).toBe('Second');
    });

    it('should escape item text and use the logo when available', async () => {
        await loadSpotlight(elem, apiClient);

        const logo = elem.querySelector<HTMLImageElement>('.homeSpotlight-logo');
        expect(logo?.getAttribute('alt')).toBe('First <Item>');
        // The name must not be parsed as markup
        expect(elem.querySelector('item')).toBeNull();
        expect(elem.querySelectorAll('.homeSpotlight-genre')).toHaveLength(2);
    });

    it('should only load the backdrops of the active and next slides', async () => {
        await loadSpotlight(elem, apiClient);

        const backdrops = elem.querySelectorAll<HTMLElement>('.homeSpotlight-backdrop');
        expect(backdrops[0].style.backgroundImage).toContain('tagA');
        expect(backdrops[1].style.backgroundImage).toContain('tagB');
        expect(backdrops[2].style.backgroundImage).toBe('');
    });

    it('should fade out the current item before showing the selected one', async () => {
        await loadSpotlight(elem, apiClient);

        elem.querySelectorAll<HTMLElement>('.homeSpotlight-indicator')[2].click();
        expect(getActiveIndicator(elem)).toBe('2');
        expect(elem.querySelector('.homeSpotlight-indicator-active')?.getAttribute('aria-current')).toBe('true');
        expect(elem.querySelector('.homeSpotlight-slide-active')?.classList.contains('homeSpotlight-slide-leaving')).toBe(true);
        expect(getActiveIndex(elem)).toBe('0');

        vi.advanceTimersByTime(FADE_OUT);
        expect(getActiveIndex(elem)).toBe('2');
        expect(elem.querySelector('.homeSpotlight-slide-leaving')).toBeNull();
    });

    it('should advance automatically and mark the finished indicators', async () => {
        await loadSpotlight(elem, apiClient);

        vi.advanceTimersByTime(5000 + FADE_OUT);
        expect(getActiveIndex(elem)).toBe('1');
        expect(elem.querySelector('.homeSpotlight-indicator')?.classList.contains('homeSpotlight-indicator-done')).toBe(true);

        vi.advanceTimersByTime(5000 * 2);
        expect(getActiveIndicator(elem)).toBe('0');
        expect(elem.querySelector('.homeSpotlight-indicator-done')).toBeNull();
    });

    it('should keep advancing while hovered or focused, keeping the focus on the same action', async () => {
        await loadSpotlight(elem, apiClient);

        elem.dispatchEvent(new Event('mouseenter'));
        elem.querySelector<HTMLElement>('.homeSpotlight-slide-active .homeSpotlight-play')?.focus();
        vi.advanceTimersByTime(5000 + FADE_OUT);

        expect(getActiveIndex(elem)).toBe('1');
        expect(elem.querySelector('.homeSpotlight-held')).toBeNull();
        expect(elem.querySelector('.homeSpotlight-arrow')).toBeNull();
        expect(document.activeElement?.closest('.homeSpotlight-slide-active')).not.toBeNull();
        expect(document.activeElement?.getAttribute('data-action')).toBe('play');
    });

    it('should stop advancing while paused', async () => {
        await loadSpotlight(elem, apiClient);
        pauseSpotlight(elem);

        vi.advanceTimersByTime(30000);
        expect(getActiveIndex(elem)).toBe('0');
        expect(getActiveIndicator(elem)).toBe('0');
    });

    it('should play or show the item for the actions', async () => {
        await loadSpotlight(elem, apiClient);

        elem.querySelector<HTMLElement>('.homeSpotlight-slide-active .homeSpotlight-play')?.click();
        expect(playbackManager.play).toHaveBeenCalledWith({ items: [ ITEMS[0] ] });

        elem.querySelector<HTMLElement>('.homeSpotlight-slide-active .homeSpotlight-info')?.click();
        expect(appRouter.showItem).toHaveBeenCalledWith(ITEMS[0]);
    });
});

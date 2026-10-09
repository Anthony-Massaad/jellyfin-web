import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    seasons: [] as BaseItemDto[],
    episodes: {} as Record<string, BaseItemDto[]>,
    getEpisodes: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    close: vi.fn(),
    showMenu: vi.fn()
}));

vi.mock('components/actionSheet/actionSheet', () => ({
    default: { show: mocks.showMenu }
}));

vi.mock('@jellyfin/sdk/lib/utils/api/show-api', () => ({
    getShowApi: () => ({
        getSeasons: () => Promise.resolve({ data: { Items: mocks.seasons } }),
        getEpisodes: mocks.getEpisodes
    })
}));
vi.mock('lib/jellyfin-apiclient/ServerConnections', () => ({
    default: {
        getApi: () => ({}),
        getApiClient: () => ({
            getCurrentUserId: () => 'user',
            getScaledImageUrl: (id: string) => `/Items/${id}/Images/Primary`
        })
    }
}));
vi.mock('components/dialogHelper/dialogHelper', () => ({
    default: {
        createDialog: () => document.createElement('div'),
        open: (dlg: HTMLElement) => {
            document.body.appendChild(dlg);
            return Promise.resolve();
        },
        close: mocks.close
    }
}));
vi.mock('components/layoutManager', () => ({ default: { tv: false } }));
vi.mock('components/playback/playbackmanager', () => ({
    playbackManager: { play: mocks.play }
}));
vi.mock('lib/globalize', () => ({
    default: { translate: (key: string) => key }
}));
vi.mock('scripts/datetime', () => ({
    default: { getDisplayDuration: () => '24m' }
}));
vi.mock('elements/emby-button/paper-icon-button-light', () => ({}));

import { getEpisodeHtml, showEpisodes } from './osdEpisodes';

const PLAYING: BaseItemDto = { Id: 'e2', Type: 'Episode', SeriesId: 's', SeriesName: 'Show <1>', SeasonId: 'season2', ServerId: 'server' };

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const render = (episode: BaseItemDto, currentId?: string) => {
    const elem = document.createElement('div');
    elem.innerHTML = getEpisodeHtml(episode, currentId);
    return elem;
};

describe('getEpisodeHtml', () => {
    it('should show the number, name, runtime and overview', () => {
        const elem = render({ Id: 'e1', IndexNumber: 3, Name: 'Pilot <b>', RunTimeTicks: 1, Overview: 'Overview' });

        expect(elem.querySelector('.osdEpisodes-name')?.textContent).toBe('3. Pilot <b>');
        expect(elem.querySelector('b')).toBeNull();
        expect(elem.querySelector('.osdEpisodes-runtime')?.textContent).toBe('24m');
        expect(elem.querySelector('.osdEpisodes-overview')?.textContent).toBe('Overview');
        expect(elem.querySelector('.osdEpisodes-thumbIcon')).not.toBeNull();
    });

    it('should mark the playing, played and partially played episodes', () => {
        const current = render({ Id: 'e1', ImageTags: { Primary: 'tag' }, UserData: { Key: 'k', ItemId: 'e1', PlayedPercentage: 40 } }, 'e1');
        expect(current.querySelector('.osdEpisodes-episode')?.getAttribute('aria-current')).toBe('true');
        expect(current.querySelector('.osdEpisodes-badge')?.textContent).toBe('NowPlaying');
        expect(current.querySelector('.osdEpisodes-thumbImage')?.getAttribute('src')).toBe('/Items/e1/Images/Primary');
        expect(current.querySelector('.osdEpisodes-progress')).toBeNull();

        const played = render({ Id: 'e2', UserData: { Key: 'k', ItemId: 'e2', Played: true } }, 'e1');
        expect(played.querySelector('.osdEpisodes-played')).not.toBeNull();

        const partial = render({ Id: 'e3', UserData: { Key: 'k', ItemId: 'e3', PlayedPercentage: 40 } }, 'e1');
        expect(partial.querySelector<HTMLElement>('.osdEpisodes-progressBar')?.style.width).toBe('40%');
    });
});

describe('showEpisodes', () => {
    beforeEach(() => {
        mocks.seasons = [ { Id: 'season1', Name: 'Season 1' }, { Id: 'season2', Name: 'Season 2' } ];
        mocks.episodes = {
            season1: [ { Id: 'e0', Name: 'First', Type: 'Episode' } ],
            season2: [ { Id: 'e1', Name: 'One', Type: 'Episode' }, { Id: 'e2', Name: 'Two', Type: 'Episode' } ]
        };
        mocks.getEpisodes.mockImplementation(({ seasonId }: { seasonId: string }) => (
            Promise.resolve({ data: { Items: mocks.episodes[seasonId] } })
        ));
        Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    const getSheet = () => document.querySelector<HTMLElement>('.osdEpisodesSheet');

    it('should open on the season of the playing episode and focus it', async () => {
        await showEpisodes(PLAYING);
        await flush();

        const sheet = getSheet();
        expect(sheet?.querySelector('.osdEpisodes-title')?.textContent).toBe('Show <1>');
        expect(sheet?.querySelector('.osdEpisodes-seasonName')?.textContent).toBe('Season 2');
        expect(sheet?.querySelector('.osdEpisodes-seasonButton')?.classList.contains('hide')).toBe(false);
        expect(sheet?.querySelectorAll('.osdEpisodes-episode')).toHaveLength(2);
        expect(document.activeElement?.getAttribute('data-id')).toBe('e2');
    });

    it('should switch seasons and play the chosen episode', async () => {
        await showEpisodes(PLAYING);
        await flush();

        mocks.showMenu.mockResolvedValue('season1');
        getSheet()?.querySelector<HTMLElement>('.osdEpisodes-seasonButton')?.click();
        await flush();
        await flush();

        expect(mocks.showMenu).toHaveBeenCalledWith(expect.objectContaining({
            positionY: 'below',
            items: [
                { name: 'Season 1', id: 'season1', selected: false },
                { name: 'Season 2', id: 'season2', selected: true }
            ]
        }));
        expect(getSheet()?.querySelector('.osdEpisodes-seasonName')?.textContent).toBe('Season 1');

        getSheet()?.querySelector<HTMLElement>('.osdEpisodes-episode[data-id="e0"]')?.click();
        expect(mocks.close).toHaveBeenCalled();
        expect(mocks.play).toHaveBeenCalledWith({ items: [ mocks.episodes.season1[0] ] });
    });

    it('should hide the season dropdown for a single season', async () => {
        mocks.seasons = [ { Id: 'season2', Name: 'Season 2' } ];
        await showEpisodes(PLAYING);
        await flush();

        expect(getSheet()?.querySelector('.osdEpisodes-seasonButton')?.classList.contains('hide')).toBe(true);
    });

    it('should only close when the playing episode is chosen', async () => {
        await showEpisodes(PLAYING);
        await flush();

        getSheet()?.querySelector<HTMLElement>('.osdEpisodes-episode[data-id="e2"]')?.click();
        expect(mocks.close).toHaveBeenCalled();
        expect(mocks.play).not.toHaveBeenCalled();
    });
});

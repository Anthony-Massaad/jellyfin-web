import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { ApiClient } from 'jellyfin-apiclient';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    history: [] as BaseItemDto[],
    similar: [] as BaseItemDto[],
    layoutManager: { tv: false }
}));

vi.mock('utils/query/queryClient', () => ({
    queryClient: {
        fetchQuery: vi.fn(({ queryKey }: { queryKey: string[] }) => (
            Promise.resolve(queryKey.includes('HomeRecentlyWatched') ? mocks.history : mocks.similar)
        ))
    }
}));
vi.mock('lib/jellyfin-apiclient/ServerConnections', () => ({
    default: { getApi: vi.fn(() => ({})) }
}));
vi.mock('lib/globalize', () => ({
    default: { translate: (key: string, value: string) => `${key}:${value}` }
}));
vi.mock('components/layoutManager', () => ({ default: mocks.layoutManager }));
vi.mock('components/cardbuilder/cardBuilder', () => ({
    default: { getCardsHtml: () => '' }
}));

import { loadRecommendations } from './recommendations';

const apiClient = {
    serverId: () => 'server',
    getCurrentUserId: () => 'user'
} as unknown as ApiClient;

const OPTIONS = { enableOverflow: true };

type ItemsContainer = HTMLElement & {
    fetchData: () => Promise<BaseItemDto[]>
};

const getTitles = (elem: HTMLElement) => Array.from(elem.querySelectorAll('.sectionTitle')).map(title => title.textContent);

describe('loadRecommendations', () => {
    let elem: HTMLElement;

    beforeEach(() => {
        mocks.layoutManager.tv = false;
        mocks.similar = [];
        elem = document.createElement('div');
    });

    it('should add a row per recently watched title, grouping episodes by series', async () => {
        mocks.history = [
            { Id: 'e1', Type: 'Episode', SeriesId: 's1', SeriesName: 'Show <One>' },
            { Id: 'e2', Type: 'Episode', SeriesId: 's1', SeriesName: 'Show <One>' },
            { Id: 'm1', Type: 'Movie', Name: 'Movie One' }
        ];

        await loadRecommendations(elem, apiClient, OPTIONS);

        expect(getTitles(elem)).toEqual([ 'HeaderBecauseYouWatched:Show <One>', 'HeaderBecauseYouWatched:Movie One' ]);
        expect(elem.querySelector('one')).toBeNull();
    });

    it('should limit the number of rows', async () => {
        mocks.history = Array.from({ length: 10 }, (_, i) => ({ Id: `m${i}`, Type: 'Movie', Name: `Movie ${i}` }));

        await loadRecommendations(elem, apiClient, OPTIONS);
        expect(elem.querySelectorAll('.homeRecommendationSection')).toHaveLength(3);

        mocks.layoutManager.tv = true;
        await loadRecommendations(elem, apiClient, OPTIONS);
        expect(elem.querySelectorAll('.homeRecommendationSection')).toHaveLength(2);
    });

    it('should leave out similar items that were already watched', async () => {
        mocks.history = [ { Id: 'm1', Type: 'Movie', Name: 'Movie One' } ];
        mocks.similar = [
            { Id: 'a', Name: 'Unwatched' },
            { Id: 'b', Name: 'Watched', UserData: { Key: 'b', ItemId: 'b', Played: true } }
        ];

        await loadRecommendations(elem, apiClient, OPTIONS);

        const itemsContainer = elem.querySelector<ItemsContainer>('.itemsContainer');
        await expect(itemsContainer?.fetchData()).resolves.toEqual([ mocks.similar[0] ]);
    });

    it('should render nothing without watch history', async () => {
        mocks.history = [];

        await loadRecommendations(elem, apiClient, OPTIONS);
        expect(elem.innerHTML).toBe('');
    });
});

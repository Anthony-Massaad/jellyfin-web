import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { ApiClient } from 'jellyfin-apiclient';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    movieGenres: [] as BaseItemDto[],
    showGenres: [] as BaseItemDto[],
    items: [] as BaseItemDto[],
    layoutManager: { tv: false }
}));

vi.mock('utils/query/queryClient', () => ({
    queryClient: {
        fetchQuery: vi.fn(({ queryKey }: { queryKey: string[] }) => {
            if (queryKey.includes('HomeGenres')) {
                return Promise.resolve(queryKey.includes('Movie') ? mocks.movieGenres : mocks.showGenres);
            }
            return Promise.resolve(mocks.items);
        })
    }
}));
vi.mock('lib/jellyfin-apiclient/ServerConnections', () => ({
    default: { getApi: vi.fn(() => ({})) }
}));
vi.mock('lib/globalize', () => ({
    default: { translate: (key: string, value: string) => `${key}:${value}` }
}));
vi.mock('components/layoutManager', () => ({ default: mocks.layoutManager }));
vi.mock('components/router/appRouter', () => ({
    appRouter: { getRouteUrl: (item: BaseItemDto) => `#/list?genreId=${item.Id}` }
}));
vi.mock('components/cardbuilder/cardBuilder', () => ({
    default: { getCardsHtml: ({ items }: { items: BaseItemDto[] }) => items.map(item => `<div class="card">${item.Name}</div>`).join('') }
}));

import { loadGenres } from './genres';

const apiClient = {
    serverId: () => 'server',
    getCurrentUserId: () => 'user'
} as unknown as ApiClient;

const OPTIONS = { enableOverflow: true };

type ItemsContainer = HTMLElement & {
    fetchData: () => Promise<BaseItemDto[]>
    getItemsHtml: (items: BaseItemDto[]) => string
    parentContainer: HTMLElement
};

const getTitles = (elem: HTMLElement) => Array.from(elem.querySelectorAll('.sectionTitle')).map(title => title.textContent);

describe('loadGenres', () => {
    let elem: HTMLElement;

    beforeEach(() => {
        mocks.layoutManager.tv = false;
        mocks.movieGenres = [];
        mocks.showGenres = [];
        mocks.items = [ { Id: 'i1', Name: 'Item 1' } ];
        elem = document.createElement('div');
    });

    it('should order genres by item count and skip genres without items', async () => {
        mocks.movieGenres = [
            { Id: 'g1', Name: 'Comedy', MovieCount: 3 },
            { Id: 'g2', Name: 'Western', MovieCount: 0 },
            { Id: 'g3', Name: 'Horror', MovieCount: 8 }
        ];

        await loadGenres(elem, apiClient, OPTIONS);

        expect(getTitles(elem)).toEqual([ 'HeaderGenreMovies:Horror', 'HeaderGenreMovies:Comedy' ]);
        expect(elem.querySelector('a.sectionTitleTextButton')?.getAttribute('href')).toBe('#/list?genreId=g3&type=Movie');
    });

    it('should alternate movie and show genre rows', async () => {
        mocks.movieGenres = [ { Id: 'm1', Name: 'Action', MovieCount: 5 }, { Id: 'm2', Name: 'Drama', MovieCount: 2 } ];
        mocks.showGenres = [ { Id: 's1', Name: 'Comedy', SeriesCount: 4 } ];

        await loadGenres(elem, apiClient, OPTIONS);

        expect(getTitles(elem)).toEqual([ 'HeaderGenreMovies:Action', 'HeaderGenreShows:Comedy', 'HeaderGenreMovies:Drama' ]);
        expect(elem.querySelectorAll('a.sectionTitleTextButton')[1].getAttribute('href')).toBe('#/list?genreId=s1&type=Series');
    });

    it('should start hidden and load items through the items container', async () => {
        mocks.movieGenres = [ { Id: 'g1', Name: 'Drama' } ];

        await loadGenres(elem, apiClient, OPTIONS);

        const row = elem.querySelector<HTMLElement>('.homeGenreSection');
        const itemsContainer = row?.querySelector<ItemsContainer>('.itemsContainer');

        expect(row?.classList.contains('hide')).toBe(true);
        expect(itemsContainer?.parentContainer).toBe(row);
        await expect(itemsContainer?.fetchData()).resolves.toEqual(mocks.items);
        expect(itemsContainer?.getItemsHtml(mocks.items)).toContain('Item 1');
    });

    it('should limit the number of rows per type', async () => {
        mocks.movieGenres = Array.from({ length: 20 }, (_, i) => ({ Id: `m${i}`, Name: `Movie genre ${i}` }));
        mocks.showGenres = Array.from({ length: 20 }, (_, i) => ({ Id: `s${i}`, Name: `Show genre ${i}` }));

        await loadGenres(elem, apiClient, OPTIONS);
        expect(elem.querySelectorAll('.homeGenreSection')).toHaveLength(16);

        mocks.layoutManager.tv = true;
        await loadGenres(elem, apiClient, OPTIONS);
        expect(elem.querySelectorAll('.homeGenreSection')).toHaveLength(8);
    });
});

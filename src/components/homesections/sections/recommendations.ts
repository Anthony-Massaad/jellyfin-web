import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import escapeHtml from 'escape-html';
import type { ApiClient } from 'jellyfin-apiclient';

import layoutManager from 'components/layoutManager';
import globalize from 'lib/globalize';
import ServerConnections from 'lib/jellyfin-apiclient/ServerConnections';
import { queryClient } from 'utils/query/queryClient';

import { attachItemRow, getItemRowHtml } from './itemRow';
import type { SectionOptions } from './section';

/** The maximum number of "Because you watched" rows. */
const MAX_ROWS = 3;
/** Fewer rows in the TV layout to keep the page light on low-end devices. */
const MAX_ROWS_TV = 2;
/** How many recently watched items to consider when picking the rows. */
const HISTORY_LIMIT = 30;
/** The number of similar items requested for each row. */
const ITEMS_PER_ROW = 20;

interface WatchedSource {
    id: string
    name: string
}

/**
 * The most recently watched movies and shows. Episodes are grouped by their series,
 * so watching several episodes of one show only produces one row.
 */
const fetchWatchedSources = (apiClient: ApiClient, maxRows: number) => {
    const api = ServerConnections.getApi(apiClient.serverId());
    const userId = apiClient.getCurrentUserId();

    if (!api) return Promise.resolve([]);

    return queryClient.fetchQuery({
        queryKey: [ 'User', userId, 'HomeRecentlyWatched' ],
        queryFn: async ({ signal }) => {
            const { data } = await getLibraryApi(api).getItems({
                userId,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Episode ],
                recursive: true,
                isPlayed: true,
                sortBy: [ ItemSortBy.DatePlayed ],
                sortOrder: [ SortOrder.Descending ],
                limit: HISTORY_LIMIT,
                enableImages: false,
                enableTotalRecordCount: false
            }, { signal });

            return data.Items || [];
        }
    }).then(items => {
        const sources: WatchedSource[] = [];

        for (const item of items) {
            const source = item.Type === BaseItemKind.Episode ?
                { id: item.SeriesId, name: item.SeriesName } :
                { id: item.Id, name: item.Name };

            if (source.id && source.name && !sources.some(({ id }) => id === source.id)) {
                sources.push({ id: source.id, name: source.name });
            }

            if (sources.length >= maxRows) break;
        }

        return sources;
    });
};

/** Items similar to a watched movie or show that the user has not finished yet. */
const getFetchSimilarFn = (apiClient: ApiClient, source: WatchedSource) => () => {
    const api = ServerConnections.getApi(apiClient.serverId());
    const userId = apiClient.getCurrentUserId();

    if (!api) return Promise.resolve([]);

    return queryClient.fetchQuery({
        queryKey: [ 'User', userId, 'HomeSimilarItems', source.id ],
        queryFn: async ({ signal }) => {
            const { data } = await getLibraryApi(api).getSimilarItems({
                itemId: source.id,
                userId,
                limit: ITEMS_PER_ROW,
                fields: [ ItemFields.PrimaryImageAspectRatio ]
            }, { signal });

            return data.Items || [];
        }
    }).then(items => items.filter((item: BaseItemDto) => !item.UserData?.Played));
};

/**
 * Renders "Because you watched …" rows with movies and shows similar to the user's recently watched titles.
 * A row only appears once it has loaded at least one item.
 */
export function loadRecommendations(elem: HTMLElement, apiClient: ApiClient, options: SectionOptions) {
    return fetchWatchedSources(apiClient, layoutManager.tv ? MAX_ROWS_TV : MAX_ROWS)
        .then(sources => {
            elem.innerHTML = sources.map(source => getItemRowHtml({
                ...options,
                title: globalize.translate('HeaderBecauseYouWatched', escapeHtml(source.name)),
                className: 'homeRecommendationSection'
            })).join('');

            elem.querySelectorAll<HTMLElement>('.homeRecommendationSection').forEach((row, index) => {
                attachItemRow(row, getFetchSimilarFn(apiClient, sources[index]), options);
            });
        })
        .catch(err => {
            console.error('[HomeRecommendations] failed to load recommendations', err);
            elem.innerHTML = '';
        });
}

import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getGenreApi } from '@jellyfin/sdk/lib/utils/api/genre-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import escapeHtml from 'escape-html';
import type { ApiClient } from 'jellyfin-apiclient';

import layoutManager from 'components/layoutManager';
import { appRouter } from 'components/router/appRouter';
import globalize from 'lib/globalize';
import ServerConnections from 'lib/jellyfin-apiclient/ServerConnections';
import { queryClient } from 'utils/query/queryClient';

import { attachItemRow, getItemRowHtml } from './itemRow';
import type { SectionOptions } from './section';

/** The maximum number of genre rows per item type (movies and shows). */
const MAX_ROWS_PER_TYPE = 8;
/** Fewer rows in the TV layout to keep the page light on low-end devices. */
const MAX_ROWS_PER_TYPE_TV = 4;
/** The number of items in each genre row. */
const ITEMS_PER_ROW = 20;

type GenreItemType = typeof BaseItemKind.Movie | typeof BaseItemKind.Series;

const GENRE_TYPES: Record<GenreItemType, { titleKey: string, getCount: (genre: BaseItemDto) => number | null | undefined }> = {
    [BaseItemKind.Movie]: { titleKey: 'HeaderGenreMovies', getCount: genre => genre.MovieCount },
    [BaseItemKind.Series]: { titleKey: 'HeaderGenreShows', getCount: genre => genre.SeriesCount }
};

interface GenreRow {
    genre: BaseItemDto
    itemType: GenreItemType
}

/** Genres of the given item type in the user's libraries, most populated first when the server reports counts. */
const fetchGenres = (apiClient: ApiClient, itemType: GenreItemType) => {
    const api = ServerConnections.getApi(apiClient.serverId());
    const userId = apiClient.getCurrentUserId();

    if (!api) return Promise.resolve([]);

    const { getCount } = GENRE_TYPES[itemType];

    return queryClient.fetchQuery({
        queryKey: [ 'User', userId, 'HomeGenres', itemType ],
        queryFn: async ({ signal }) => {
            const { data } = await getGenreApi(api).getGenres({
                userId,
                includeItemTypes: [ itemType ],
                fields: [ ItemFields.ItemCounts ],
                sortBy: [ ItemSortBy.SortName ],
                sortOrder: [ SortOrder.Ascending ],
                enableImages: false,
                enableTotalRecordCount: false
            }, { signal });

            return data.Items || [];
        }
    }).then(genres => (
        genres
            // Genres that report no items are skipped; rows also hide themselves when they load no items
            .filter(genre => getCount(genre) !== 0)
            .sort((a, b) => (getCount(b) ?? 0) - (getCount(a) ?? 0))
    ));
};

const getFetchItemsFn = (apiClient: ApiClient, { genre, itemType }: GenreRow) => () => {
    const api = ServerConnections.getApi(apiClient.serverId());
    const userId = apiClient.getCurrentUserId();

    if (!api || !genre.Id) return Promise.resolve([]);

    return queryClient.fetchQuery({
        queryKey: [ 'User', userId, 'HomeGenreItems', itemType, genre.Id ],
        queryFn: async ({ signal }) => {
            const { data } = await getLibraryApi(api).getItems({
                userId,
                genreIds: [ genre.Id || '' ],
                includeItemTypes: [ itemType ],
                recursive: true,
                sortBy: [ ItemSortBy.Random ],
                limit: ITEMS_PER_ROW,
                fields: [ ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb ],
                imageTypeLimit: 1,
                enableTotalRecordCount: false
            }, { signal });

            return data.Items || [];
        }
    });
};

/** Alternates movie and show rows so both appear near the top. */
const interleave = (movies: GenreRow[], shows: GenreRow[]) => {
    const rows: GenreRow[] = [];
    for (let i = 0; i < Math.max(movies.length, shows.length); i++) {
        if (movies[i]) rows.push(movies[i]);
        if (shows[i]) rows.push(shows[i]);
    }
    return rows;
};

/**
 * Renders a row for each movie and show genre ("Horror Movies", "Comedy Shows", …).
 * A row only appears once it has loaded at least one item.
 */
export function loadGenres(elem: HTMLElement, apiClient: ApiClient, options: SectionOptions) {
    const maxRows = layoutManager.tv ? MAX_ROWS_PER_TYPE_TV : MAX_ROWS_PER_TYPE;
    const toRows = (itemType: GenreItemType) => (genres: BaseItemDto[]) => (
        genres.slice(0, maxRows).map(genre => ({ genre, itemType }))
    );

    return Promise.all([
        fetchGenres(apiClient, BaseItemKind.Movie).then(toRows(BaseItemKind.Movie)),
        fetchGenres(apiClient, BaseItemKind.Series).then(toRows(BaseItemKind.Series))
    ])
        .then(([ movies, shows ]) => {
            const rows = interleave(movies, shows);

            elem.innerHTML = rows.map(({ genre, itemType }) => getItemRowHtml({
                ...options,
                title: globalize.translate(GENRE_TYPES[itemType].titleKey, escapeHtml(genre.Name || '')),
                url: `${appRouter.getRouteUrl(genre, { serverId: apiClient.serverId() })}&type=${itemType}`,
                className: 'homeGenreSection'
            })).join('');

            elem.querySelectorAll<HTMLElement>('.homeGenreSection').forEach((row, index) => {
                attachItemRow(row, getFetchItemsFn(apiClient, rows[index]), options);
            });
        })
        .catch(err => {
            console.error('[HomeGenres] failed to load genres', err);
            elem.innerHTML = '';
        });
}

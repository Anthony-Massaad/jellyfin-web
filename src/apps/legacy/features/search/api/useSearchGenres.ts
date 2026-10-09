import type { AxiosRequestConfig } from 'axios';
import type { Api } from '@jellyfin/sdk';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getGenreApi } from '@jellyfin/sdk/lib/utils/api/genre-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

/** The maximum number of genres to browse from the search page. */
const GENRE_LIMIT = 30;

const fetchGenres = async (
    api: Api,
    userId: string,
    parentId?: string,
    options?: AxiosRequestConfig
) => {
    const response = await getGenreApi(api).getGenres(
        {
            userId,
            parentId,
            includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
            sortBy: [ ItemSortBy.SortName ],
            sortOrder: [ SortOrder.Ascending ],
            limit: GENRE_LIMIT,
            enableImages: false,
            enableTotalRecordCount: false
        },
        options
    );
    return response.data.Items || [];
};

/** Movie and show genres to browse when nothing has been searched yet. */
export const useSearchGenres = (parentId?: string) => {
    const { api, user } = useApi();
    const userId = user?.Id;

    return useQuery({
        queryKey: ['SearchGenres', { parentId }],
        queryFn: ({ signal }) =>
            fetchGenres(api!, userId!, parentId, { signal }),
        refetchOnWindowFocus: false,
        enabled: !!api && !!userId
    });
};

import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';
import type { Api } from '@jellyfin/sdk';
import React, { type CSSProperties, FunctionComponent } from 'react';

import { appRouter } from 'components/router/appRouter';
import LinkButton from 'elements/emby-button/LinkButton';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';

import { useSearchGenres } from '../api/useSearchGenres';
import { useSearchSuggestions } from '../api/useSearchSuggestions';

import 'elements/emby-button/emby-button';

/** The number of placeholder tiles shown while the suggestions load. */
const SKELETON_TILES = 12;
/** The width of the tile artwork (px). */
const TILE_IMAGE_WIDTH = 480;

type SearchSuggestionsProps = {
    parentId?: string | null;
};

/** Landscape artwork for a tile: the backdrop, then the thumb, then the primary image. */
export const getTileImageUrl = (api: Api | undefined, item: BaseItemDto) => {
    if (!api || !item.Id) return undefined;

    const imageApi = getImageApi(api);

    if (item.BackdropImageTags?.length) {
        return imageApi.getItemImageUrlById(item.Id, ImageType.Backdrop, { tag: item.BackdropImageTags[0], maxWidth: TILE_IMAGE_WIDTH });
    }

    const thumbTag = item.ImageTags?.[ImageType.Thumb];
    if (thumbTag) {
        return imageApi.getItemImageUrlById(item.Id, ImageType.Thumb, { tag: thumbTag, maxWidth: TILE_IMAGE_WIDTH });
    }

    const primaryTag = item.ImageTags?.[ImageType.Primary];
    if (primaryTag) {
        return imageApi.getItemImageUrlById(item.Id, ImageType.Primary, { tag: primaryTag, maxWidth: TILE_IMAGE_WIDTH });
    }

    return undefined;
};

/** The position of a tile, used to stagger the entrance animation. */
const getTileStyle = (index: number) => ({ '--search-tile-index': index } as CSSProperties);

/**
 * What is shown before searching: genres to browse and suggested titles as artwork tiles.
 */
const SearchSuggestions: FunctionComponent<SearchSuggestionsProps> = ({ parentId }) => {
    const { api } = useApi();
    const { data: suggestions, isPending } = useSearchSuggestions(parentId || undefined);
    const { data: genres } = useSearchGenres(parentId || undefined);

    return (
        <div className='searchSuggestions'>
            {!!genres?.length && (
                <section className='verticalSection searchExploreSection'>
                    <h2 className='sectionTitle padded-left padded-right'>
                        {globalize.translate('Genres')}
                    </h2>
                    <div className='searchGenreChips padded-left padded-right focuscontainer-x'>
                        {genres.map(genre => (
                            <LinkButton
                                key={genre.Id}
                                className='searchGenreChip'
                                href={appRouter.getRouteUrl(genre, { parentId: parentId || undefined })}
                            >
                                {genre.Name}
                            </LinkButton>
                        ))}
                    </div>
                </section>
            )}

            <section className='verticalSection searchExploreSection'>
                <h2 className='sectionTitle padded-left padded-right'>
                    {globalize.translate('Suggestions')}
                </h2>

                <div className='searchTiles padded-left padded-right' aria-busy={isPending}>
                    {isPending && Array.from({ length: SKELETON_TILES }, (_, index) => (
                        <div key={index} className='searchTileWrapper' aria-hidden='true'>
                            <div className='searchTile searchTile-skeleton' />
                        </div>
                    ))}

                    {suggestions?.map((item, index) => {
                        const imageUrl = getTileImageUrl(api, item);

                        return (
                            <div key={item.Id} className='searchTileWrapper' style={getTileStyle(index)}>
                                <LinkButton
                                    className='searchTile'
                                    href={appRouter.getRouteUrl(item)}
                                    title={item.Name || undefined}
                                >
                                    {imageUrl ? (
                                        <span
                                            className='searchTile-image'
                                            style={{ backgroundImage: `url('${imageUrl}')` }}
                                        />
                                    ) : (
                                        <span className='searchTile-icon material-icons movie' aria-hidden='true' />
                                    )}
                                    <span className='searchTile-title'>{item.Name}</span>
                                </LinkButton>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default SearchSuggestions;

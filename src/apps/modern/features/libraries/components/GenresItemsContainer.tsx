import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import type { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import Box from '@mui/material/Box';
import React, { FC, useEffect, useMemo } from 'react';
import { useIntersectionObserver } from 'usehooks-ts';

import NoItemsMessage from 'components/common/NoItemsMessage';
import Loading from 'components/loading/LoadingComponent';
import type { ParentId } from 'types/library';

import { useGenres } from '../hooks/api/useGenres';
import GenresSectionContainer from './GenresSectionContainer';

interface GenresItemsContainerProps {
    parentId: ParentId;
    collectionType: CollectionType | undefined;
    itemType: BaseItemKind[];
}

const GenresItemsContainer: FC<GenresItemsContainerProps> = ({
    parentId,
    collectionType,
    itemType
}) => {
    // The genres are browsed as rows, without the alphabet picker
    const {
        isLoading,
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useGenres({
        parentId,
        includeItemTypes: itemType
    });

    const genres = useMemo(
        () => data?.pages.flatMap((page) => page?.Items ?? []) ?? [],
        [data]
    );

    const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
        rootMargin: '200px'
    });

    useEffect(() => {
        if (isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const renderGenres = () => {
        if (isLoading) {
            return <Loading />;
        }

        if (!genres.length) {
            return <NoItemsMessage message='MessageNoGenresAvailable' />;
        }

        return (
            <>
                {genres.map((genre) => (
                    <GenresSectionContainer
                        key={genre.Id}
                        collectionType={collectionType}
                        parentId={parentId}
                        itemType={itemType}
                        genre={genre}
                    />
                ))}

                {hasNextPage && <Box ref={sentinelRef} sx={{ height: '1px' }} />}
                {isFetchingNextPage && <Loading />}
            </>
        );
    };

    return renderGenres();
};

export default GenresItemsContainer;

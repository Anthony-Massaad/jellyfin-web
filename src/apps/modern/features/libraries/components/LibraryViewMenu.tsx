import Check from '@mui/icons-material/Check';
import Chip from '@mui/material/Chip/Chip';
import Stack from '@mui/material/Stack/Stack';
import React, { FC } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { LibraryRoutes } from 'apps/modern/features/libraries/constants/libraryRoutes';
import useCurrentTab from 'hooks/useCurrentTab';
import globalize from 'lib/globalize';

/**
 * The views of a library (e.g. Movies, Favorites, Genres) as a row of filter chips.
 */
const LibraryViewMenu: FC = () => {
    const location = useLocation();
    const [ searchParams, setSearchParams ] = useSearchParams();
    const { activeTab } = useCurrentTab();

    const currentRoute = LibraryRoutes.find(({ path }) => path === location.pathname);
    const currentTab = currentRoute?.views.find(({ index }) => index === activeTab);

    if (!currentRoute || !currentTab) return null;

    return (
        <Stack
            component='nav'
            direction='row'
            className='libraryViewChips'
            aria-label={globalize.translate('HeaderViews')}
        >
            {currentRoute.views.map(tab => {
                const isSelected = tab.index === currentTab.index;

                return (
                    <Chip
                        key={tab.view}
                        component='button'
                        type='button'
                        className={`libraryViewChip${isSelected ? ' libraryViewChip-selected' : ''}`}
                        label={globalize.translate(tab.label)}
                        icon={isSelected ? <Check /> : undefined}
                        variant={isSelected ? 'filled' : 'outlined'}
                        aria-current={isSelected ? 'page' : undefined}
                        clickable
                        // eslint-disable-next-line react/jsx-no-bind
                        onClick={() => {
                            if (isSelected) return;
                            searchParams.set('tab', `${tab.index}`);
                            setSearchParams(searchParams);
                        }}
                    />
                );
            })}
        </Stack>
    );
};

export default LibraryViewMenu;

import { useLocation, useSearchParams } from 'react-router-dom';

import { getDefaultViewIndex, isViewIndexAvailable } from 'apps/modern/features/libraries/utils/path';

const useCurrentTab = () => {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsTab = searchParams.get('tab');
    const libraryId = searchParams.get('topParentId');
    const settingsKey = location.pathname === '/livetv' ? 'livetv' : libraryId;
    const requestedTab = searchParamsTab !== null ? parseInt(searchParamsTab, 10) : NaN;
    // Links to views that are no longer listed fall back to the default view
    const activeTab: number =
        !isNaN(requestedTab) && isViewIndexAvailable(location.pathname, requestedTab) ?
            requestedTab :
            getDefaultViewIndex(location.pathname, settingsKey);

    return {
        searchParams,
        setSearchParams,
        libraryId,
        settingsKey,
        activeTab
    };
};

export default useCurrentTab;

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import AppBody from 'components/AppBody';
import CustomCss from 'components/CustomCss';
import ThemeCss from 'components/ThemeCss';
import { useAccent } from 'hooks/useAccent';
import { useMd3Scope } from 'hooks/useMd3Scope';

export default function AppLayout() {
    const location = useLocation();

    // The setup wizard reuses this layout but keeps its original look
    const isMd3Enabled = !location.pathname.startsWith('/wizard');
    useMd3Scope(isMd3Enabled);
    useAccent(isMd3Enabled);

    return (
        <>
            <AppBody>
                <Outlet />
            </AppBody>
            <ThemeCss />
            <CustomCss />
        </>
    );
}

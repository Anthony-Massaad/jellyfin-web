import Favorite from '@mui/icons-material/Favorite';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import HomeIcon from '@mui/icons-material/Home';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import React, { type FC, type ReactNode, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import useCurrentTab from 'hooks/useCurrentTab';
import globalize from 'lib/globalize';
import { mdColor, mdShape, mdTransition } from 'themes/md3/overrides';

/** The height of the floating navigation bar. */
export const NAVIGATION_BAR_HEIGHT = 60;

/** The space between the navigation bar and the bottom of the screen (plus the safe area inset). */
const NAVIGATION_BAR_OFFSET = 14;

/** The inset of the sliding highlight inside the bar. */
const INDICATOR_INSET = 6;

/** The width of each (icon only) destination. */
const ITEM_WIDTH = 80;

/** Class added to <html> while the navigation bar is shown, used to offset the now playing bar and page padding. */
const NAVIGATION_BAR_CLASS = 'md3-withNavigationBar';

enum NavBarDestination {
    None = 'none',
    Home = 'home',
    Favorites = 'favorites',
    Search = 'search'
}

const getDestination = (pathname: string, tab: number): NavBarDestination => {
    if (pathname === '/home') {
        return tab === 1 ? NavBarDestination.Favorites : NavBarDestination.Home;
    }

    if (pathname === '/search') return NavBarDestination.Search;

    return NavBarDestination.None;
};

interface NavItem {
    destination: NavBarDestination
    label: string
    to: string
    icon: ReactNode
    activeIcon: ReactNode
}

const getItems = (): NavItem[] => [
    { destination: NavBarDestination.Home, label: globalize.translate('Home'), to: '/home', icon: <HomeOutlined />, activeIcon: <HomeIcon /> },
    { destination: NavBarDestination.Favorites, label: globalize.translate('Favorites'), to: '/home?tab=1', icon: <FavoriteBorder />, activeIcon: <Favorite /> },
    { destination: NavBarDestination.Search, label: globalize.translate('Search'), to: '/search', icon: <SearchIcon />, activeIcon: <SearchIcon /> }
];

/**
 * Navigation bar for compact (mobile) screens: a compact floating, fully rounded glass bar of icons whose highlight
 * slides between the destinations (the labels are the accessible names and tooltips). The libraries are in the navigation drawer (the menu button in the app bar).
 */
const AppNavigationBar: FC = () => {
    const location = useLocation();
    const { activeTab } = useCurrentTab();
    const destination = getDestination(location.pathname, activeTab);
    const items = getItems();
    const activeIndex = items.findIndex(item => item.destination === destination);

    useLayoutEffect(() => {
        document.documentElement.classList.add(NAVIGATION_BAR_CLASS);

        return () => {
            document.documentElement.classList.remove(NAVIGATION_BAR_CLASS);
        };
    }, []);

    return (
        <Box
            component='nav'
            aria-label={globalize.translate('HeaderNavigation')}
            sx={{
                position: 'fixed',
                left: '50%',
                bottom: `calc(${NAVIGATION_BAR_OFFSET}px + env(safe-area-inset-bottom))`,
                transform: 'translateX(-50%)',
                // Icon only destinations keep the bar compact
                width: ITEM_WIDTH * items.length + INDICATOR_INSET * 2,
                height: NAVIGATION_BAR_HEIGHT,
                // Above page content and the now playing bar, below drawers and dialogs
                zIndex: 1100,
                display: 'flex',
                padding: `${INDICATOR_INSET}px`,
                boxSizing: 'border-box',
                borderRadius: mdShape('full'),
                backgroundColor: mdColor('surface-container-high'),
                // A faint accent tint over the glass
                backgroundImage: `linear-gradient(${mdColor('primary', 0.08)}, ${mdColor('primary', 0.08)})`,
                boxShadow: `0 12px 32px -8px rgba(0, 0, 0, 0.5), inset 0 0 0 1px ${mdColor('primary', 0.18)}`,
                // Glass surface where background blur is supported
                '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))': {
                    backgroundColor: mdColor('surface-container-high', 0.68),
                    backdropFilter: 'blur(24px) saturate(1.6)'
                }
            }}
        >
            {/* The highlight slides to the current destination */}
            <Box
                aria-hidden='true'
                sx={{
                    position: 'absolute',
                    top: INDICATOR_INSET,
                    bottom: INDICATOR_INSET,
                    left: INDICATOR_INSET,
                    width: `calc((100% - ${INDICATOR_INSET * 2}px) / ${items.length})`,
                    borderRadius: mdShape('full'),
                    // The accent color (follows the theme and the accent setting)
                    backgroundColor: mdColor('primary'),
                    boxShadow: `0 6px 16px -4px ${mdColor('primary', 0.55)}`,
                    opacity: activeIndex === -1 ? 0 : 1,
                    transform: `translateX(${Math.max(activeIndex, 0) * 100}%) scale(${activeIndex === -1 ? 0.85 : 1})`,
                    transition: `${mdTransition([ 'transform' ], 'long2', 'expressive-spatial')}, ${mdTransition([ 'opacity' ], 'medium2', 'expressive-effects')}`,
                    '[dir="rtl"] &': {
                        left: 'auto',
                        right: INDICATOR_INSET,
                        transform: `translateX(${Math.max(activeIndex, 0) * -100}%) scale(${activeIndex === -1 ? 0.85 : 1})`
                    }
                }}
            />

            {items.map(item => {
                const isActive = item.destination === destination;

                return (
                    <Box
                        key={item.destination}
                        component={Link}
                        to={item.to}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={item.label}
                        title={item.label}
                        sx={{
                            position: 'relative',
                            zIndex: 1,
                            flex: '1 1 0',
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: mdShape('full'),
                            color: isActive ? mdColor('on-primary') : mdColor('on-surface-variant'),
                            textDecoration: 'none',
                            transition: mdTransition([ 'color' ], 'medium4', 'expressive-effects'),
                            WebkitTapHighlightColor: 'transparent',
                            '& .MuiSvgIcon-root': {
                                fontSize: 24,
                                flexShrink: 0,
                                transition: mdTransition([ 'transform' ], 'short4', 'expressive-spatial-fast')
                            },
                            '&:focus-visible': {
                                outline: `3px solid ${mdColor('secondary')}`,
                                outlineOffset: -3
                            },
                            '&:active .MuiSvgIcon-root': {
                                transform: 'scale(0.9)'
                            }
                        }}
                    >
                        {isActive ? item.activeIcon : item.icon}
                    </Box>
                );
            })}
        </Box>
    );
};

export default AppNavigationBar;

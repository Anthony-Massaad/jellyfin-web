import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';
import React, { type CSSProperties, type FC, type MouseEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { appHost } from 'components/apphost';
import layoutManager from 'components/layoutManager';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import { AppFeature } from 'constants/appFeature';
import LinkButton from 'elements/emby-button/LinkButton';
import { useApi } from 'hooks/useApi';
import { useQuickConnectEnabled } from 'hooks/useQuickConnect';
import { useUsers } from 'hooks/useUsers';
import globalize from 'lib/globalize';
import browser from 'scripts/browser';
import Dashboard from 'utils/dashboard';
import shell from 'scripts/shell';
import keyboardNavigation from 'scripts/keyboardNavigation';

/** The size of the profile picture (px). */
const AVATAR_SIZE = 192;

interface SettingsItemProps {
    /** Extra class for the link (some are hidden by apps/modern/AppOverrides.scss) */
    className: string
    icon: string
    title: string
    description?: string
    href?: string
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
    /** The position of the item on the page, used to stagger the entrance animation */
    index: number
}

/** A settings row: a tonal icon, a title with a description, and a chevron. */
const SettingsItem: FC<SettingsItemProps> = ({ className, icon, title, description, href, onClick, index }) => (
    <LinkButton
        href={href}
        onClick={onClick}
        className={`settingsItem ${className}`}
        style={{ '--settings-item-index': index } as CSSProperties}
    >
        <span className={`settingsItem-icon material-icons ${icon}`} aria-hidden='true' />
        <span className='settingsItem-text'>
            <span className='settingsItem-title'>{title}</span>
            {description && <span className='settingsItem-description'>{description}</span>}
        </span>
        <span className='settingsItem-chevron material-icons chevron_right' aria-hidden='true' />
    </LinkButton>
);

/** A group of settings rows with an optional heading. */
const SettingsGroup: FC<{ className?: string, title?: string, children: ReactNode }> = ({ className = '', title, children }) => (
    <section className={`settingsGroup ${className}`}>
        {title && <h2 className='settingsGroup-title'>{title}</h2>}
        <div className='settingsGroup-items'>
            {children}
        </div>
    </section>
);

const UserSettingsPage: FC = () => {
    const { api, user: currentUser } = useApi();
    const [ searchParams ] = useSearchParams();
    const {
        data: isQuickConnectEnabled,
        isPending: isQuickConnectEnabledPending
    } = useQuickConnectEnabled();
    const { data: users } = useUsers();
    const [ user, setUser ] = useState<UserDto>();

    const userId = useMemo(() => (
        searchParams.get('userId') || currentUser?.Id
    ), [ currentUser, searchParams ]);
    const isLoggedInUser = useMemo(() => (
        userId && userId === currentUser?.Id
    ), [ currentUser, userId ]);

    useEffect(() => {
        if (userId) {
            if (userId === currentUser?.Id) setUser(currentUser);
            else setUser(users?.find(({ Id }) => userId === Id));
        }
    }, [ currentUser, userId, users ]);

    const avatarUrl = useMemo(() => (
        api && user?.PrimaryImageTag ?
            getImageApi(api).getUserImageUrl(user, { tag: user.PrimaryImageTag, width: AVATAR_SIZE, height: AVATAR_SIZE }) :
            undefined
    ), [ api, user ]);

    if (!userId || !user || isQuickConnectEnabledPending) {
        return (
            <Loading />
        );
    }

    // gamepad toggle unavailable on EdgeUWP, and smoothscroll unavailable on non-TV layout
    const isControlsPageEmpty = !keyboardNavigation.canEnableGamepad() && !layoutManager.tv;
    const isAdministrator = !!user.Policy?.IsAdministrator;
    const profileDetails = [
        isAdministrator ? globalize.translate('UserRoleAdministrator') : null,
        user.ServerName
    ].filter(Boolean).join(' • ');

    // Items are numbered in page order for the staggered entrance
    let index = 0;

    return (
        <Page
            id='myPreferencesMenuPage'
            className='libraryPage userPreferencesPage noSecondaryNavPage mainAnimatedPage'
            title={globalize.translate('Settings')}
            shouldAutoFocus
        >
            <div className='padded-left padded-right padded-bottom-page padded-top'>
                <div className='readOnlyContent settingsPage'>
                    <section className='settingsProfile'>
                        <div className='settingsProfile-avatar'>
                            {avatarUrl ? (
                                <img className='settingsProfile-image' src={avatarUrl} alt='' />
                            ) : (
                                <span className='settingsProfile-initial' aria-hidden='true'>
                                    {(user.Name || '?').charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <h1 className='settingsProfile-name headerUsername'>{user.Name}</h1>
                        {profileDetails && <p className='settingsProfile-details'>{profileDetails}</p>}
                        <LinkButton
                            href={`#/userprofile?userId=${userId}`}
                            className='settingsProfile-edit lnkUserProfile'
                        >
                            <span className='material-icons edit' aria-hidden='true' />
                            <span>{globalize.translate('ButtonEditProfile')}</span>
                        </LinkButton>
                    </section>

                    <SettingsGroup>
                        {isQuickConnectEnabled && (
                            <SettingsItem
                                index={index++}
                                className='lnkQuickConnectPreferences'
                                href={`#/quickconnect?userId=${userId}`}
                                icon='phonelink_lock'
                                title={globalize.translate('QuickConnect')}
                                description={globalize.translate('SettingsQuickConnectDescription')}
                            />
                        )}

                        <SettingsItem
                            index={index++}
                            className='lnkDisplayPreferences'
                            href={`#/mypreferencesdisplay?userId=${userId}`}
                            icon='palette'
                            title={globalize.translate('Display')}
                            description={globalize.translate('SettingsDisplayDescription')}
                        />

                        <SettingsItem
                            index={index++}
                            className='lnkHomePreferences'
                            href={`#/mypreferenceshome?userId=${userId}`}
                            icon='home'
                            title={globalize.translate('Home')}
                            description={globalize.translate('SettingsHomeDescription')}
                        />

                        <SettingsItem
                            index={index++}
                            className='lnkPlaybackPreferences'
                            href={`#/mypreferencesplayback?userId=${userId}`}
                            icon='play_circle'
                            title={globalize.translate('TitlePlayback')}
                            description={globalize.translate('SettingsPlaybackDescription')}
                        />

                        <SettingsItem
                            index={index++}
                            className='lnkSubtitlePreferences'
                            href={`#/mypreferencessubtitles?userId=${userId}`}
                            icon='closed_caption'
                            title={globalize.translate('Subtitles')}
                            description={globalize.translate('SettingsSubtitlesDescription')}
                        />

                        {isLoggedInUser && !browser.mobile && !isControlsPageEmpty && (
                            <SettingsItem
                                index={index++}
                                className='lnkControlsPreferences'
                                href={`#/mypreferencescontrols?userId=${userId}`}
                                icon='keyboard'
                                title={globalize.translate('Controls')}
                                description={globalize.translate('SettingsControlsDescription')}
                            />
                        )}
                    </SettingsGroup>

                    {(appHost.supports(AppFeature.DownloadManagement) || appHost.supports(AppFeature.ClientSettings)) && (
                        <SettingsGroup>
                            {appHost.supports(AppFeature.DownloadManagement) && (
                                <SettingsItem
                                    index={index++}
                                    className='downloadManager'
                                    onClick={shell.openDownloadManager}
                                    icon='download'
                                    title={globalize.translate('DownloadManager')}
                                />
                            )}

                            {appHost.supports(AppFeature.ClientSettings) && (
                                <SettingsItem
                                    index={index++}
                                    className='clientSettings'
                                    onClick={shell.openClientSettings}
                                    icon='devices_other'
                                    title={globalize.translate('ClientSettings')}
                                />
                            )}
                        </SettingsGroup>
                    )}

                    {isLoggedInUser && isAdministrator && !layoutManager.tv && (
                        <SettingsGroup className='adminSection' title={globalize.translate('HeaderAdmin')}>
                            <SettingsItem
                                index={index++}
                                className='lnkDashboard'
                                href='#/dashboard'
                                icon='dashboard'
                                title={globalize.translate('TabDashboard')}
                                description={globalize.translate('SettingsDashboardDescription')}
                            />

                            <SettingsItem
                                index={index++}
                                className='lnkMetadataManager'
                                href='#/metadata'
                                icon='edit_note'
                                title={globalize.translate('MetadataManager')}
                                description={globalize.translate('SettingsMetadataDescription')}
                            />
                        </SettingsGroup>
                    )}

                    {isLoggedInUser && (
                        <SettingsGroup className='userSection' title={globalize.translate('HeaderUser')}>
                            {appHost.supports(AppFeature.MultiServer) && (
                                <SettingsItem
                                    index={index++}
                                    className='selectServer'
                                    onClick={Dashboard.selectServer}
                                    icon='storage'
                                    title={globalize.translate('SelectServer')}
                                />
                            )}

                            <SettingsItem
                                index={index++}
                                className='btnLogout'
                                onClick={Dashboard.logout}
                                icon='logout'
                                title={globalize.translate('ButtonSignOut')}
                            />

                            {appHost.supports(AppFeature.ExitMenu) && (
                                <SettingsItem
                                    index={index++}
                                    className='exitApp'
                                    onClick={appHost.exit}
                                    icon='close'
                                    title={globalize.translate('ButtonExitApp')}
                                />
                            )}
                        </SettingsGroup>
                    )}
                </div>
            </div>
        </Page>
    );
};

export default UserSettingsPage;

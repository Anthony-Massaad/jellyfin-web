import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import escapeHtml from 'escape-html';

import dialogHelper from 'components/dialogHelper/dialogHelper';
import layoutManager from 'components/layoutManager';
import { playbackManager } from 'components/playback/playbackmanager';
import globalize from 'lib/globalize';
import ServerConnections from 'lib/jellyfin-apiclient/ServerConnections';
import datetime from 'scripts/datetime';

import 'elements/emby-button/paper-icon-button-light';

/** The class of the sheet, also used by the video OSD to leave its keyboard shortcuts to the sheet. */
export const EPISODES_SHEET_CLASS = 'osdEpisodesSheet';

interface SheetElement extends HTMLDivElement {
    episodesBySeason?: Record<string, BaseItemDto[]>
    selectedSeasonId?: string
}

const getApis = (item: BaseItemDto) => {
    const serverId = item.ServerId || '';
    return {
        api: ServerConnections.getApi(serverId),
        apiClient: ServerConnections.getApiClient(serverId)
    };
};

const fetchSeasons = async (item: BaseItemDto) => {
    const { api, apiClient } = getApis(item);
    if (!api || !apiClient || !item.SeriesId) return [];

    const { data } = await getShowApi(api).getSeasons({
        seriesId: item.SeriesId,
        userId: apiClient.getCurrentUserId(),
        enableImages: false
    });

    return data.Items || [];
};

const fetchEpisodes = async (item: BaseItemDto, seasonId: string) => {
    const { api, apiClient } = getApis(item);
    if (!api || !apiClient || !item.SeriesId) return [];

    const { data } = await getShowApi(api).getEpisodes({
        seriesId: item.SeriesId,
        seasonId,
        userId: apiClient.getCurrentUserId(),
        fields: [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ],
        enableImageTypes: [ ImageType.Primary, ImageType.Thumb ],
        imageTypeLimit: 1,
        enableUserData: true
    });

    return data.Items || [];
};

const getThumbUrl = (item: BaseItemDto) => {
    const { apiClient } = getApis(item);
    const tag = item.ImageTags?.[ImageType.Primary];

    if (!apiClient || !item.Id || !tag) return null;

    return apiClient.getScaledImageUrl(item.Id, { type: ImageType.Primary, tag, maxWidth: 400 });
};

export const getEpisodeHtml = (episode: BaseItemDto, currentId: string | undefined) => {
    const isCurrent = episode.Id === currentId;
    const thumbUrl = getThumbUrl(episode);
    const playedPercentage = episode.UserData?.PlayedPercentage;
    const name = escapeHtml(episode.Name || '');
    const title = episode.IndexNumber == null ? name : `${episode.IndexNumber}. ${name}`;

    let html = `<button type="button" class="osdEpisodes-episode${isCurrent ? ' osdEpisodes-episode-current' : ''}" data-id="${escapeHtml(episode.Id || '')}"${isCurrent ? ' aria-current="true"' : ''}>`;

    html += '<span class="osdEpisodes-thumb">';
    if (thumbUrl) {
        html += `<img class="osdEpisodes-thumbImage" src="${thumbUrl}" alt="" loading="lazy" />`;
    } else {
        html += '<span class="osdEpisodes-thumbIcon material-icons tv" aria-hidden="true"></span>';
    }
    if (isCurrent) {
        html += `<span class="osdEpisodes-badge">${escapeHtml(globalize.translate('NowPlaying'))}</span>`;
    } else if (episode.UserData?.Played) {
        html += `<span class="osdEpisodes-played material-icons check" title="${escapeHtml(globalize.translate('Played'))}" aria-hidden="true"></span>`;
    }
    if (playedPercentage && !isCurrent) {
        html += `<span class="osdEpisodes-progress"><span class="osdEpisodes-progressBar" style="width:${Math.min(100, Math.max(0, playedPercentage))}%"></span></span>`;
    }
    html += '</span>';

    html += '<span class="osdEpisodes-info">';
    html += `<span class="osdEpisodes-name">${title}</span>`;
    if (episode.RunTimeTicks) {
        html += `<span class="osdEpisodes-runtime">${escapeHtml(datetime.getDisplayDuration(episode.RunTimeTicks))}</span>`;
    }
    if (episode.Overview) {
        html += `<span class="osdEpisodes-overview">${escapeHtml(episode.Overview)}</span>`;
    }
    html += '</span>';

    html += '</button>';
    return html;
};

/** Shows the selected season on the season dropdown button. */
const updateSeasonButton = (dlg: SheetElement, seasons: BaseItemDto[]) => {
    const button = dlg.querySelector<HTMLElement>('.osdEpisodes-seasonButton');
    if (!button) return;

    const season = seasons.find(({ Id }) => Id === dlg.selectedSeasonId);
    const name = button.querySelector('.osdEpisodes-seasonName');
    if (name) name.textContent = season?.Name || '';

    // A single season needs no dropdown
    button.classList.toggle('hide', seasons.length < 2);
};

/** The season dropdown: an MD3 menu (a bottom sheet on phones) with the seasons, the selected one checked. */
const showSeasonMenu = (button: HTMLElement, seasons: BaseItemDto[], selectedId: string | undefined) => (
    import('components/actionSheet/actionSheet').then(({ default: actionsheet }) => actionsheet.show({
        title: globalize.translate('HeaderSeasons'),
        items: seasons.map(season => ({
            name: season.Name || '',
            id: season.Id || '',
            selected: season.Id === selectedId
        })),
        positionTo: button,
        positionY: 'below'
    }))
);

const renderEpisodes = async (dlg: SheetElement, item: BaseItemDto, seasonId: string, focusCurrent: boolean) => {
    const list = dlg.querySelector<HTMLElement>('.osdEpisodes-list');
    if (!list) return;

    dlg.episodesBySeason = dlg.episodesBySeason || {};
    let episodes = dlg.episodesBySeason[seasonId];

    if (!episodes) {
        list.setAttribute('aria-busy', 'true');
        episodes = await fetchEpisodes(item, seasonId);
        dlg.episodesBySeason[seasonId] = episodes;
        list.removeAttribute('aria-busy');
    }

    list.innerHTML = episodes.length ?
        episodes.map(episode => getEpisodeHtml(episode, item.Id)).join('') :
        `<p class="osdEpisodes-empty">${escapeHtml(globalize.translate('MessageNoItemsAvailable'))}</p>`;
    list.scrollTop = 0;

    const target = (focusCurrent && list.querySelector<HTMLElement>('.osdEpisodes-episode-current'))
        || list.querySelector<HTMLElement>('.osdEpisodes-episode');

    if (focusCurrent && target) {
        target.scrollIntoView({ block: 'center' });
        target.focus();
    }
};

const selectSeason = (dlg: SheetElement, item: BaseItemDto, seasons: BaseItemDto[], seasonId: string, focusCurrent = false) => {
    dlg.selectedSeasonId = seasonId;
    updateSeasonButton(dlg, seasons);

    return renderEpisodes(dlg, item, seasonId, focusCurrent);
};

/**
 * Shows a side sheet with the seasons and episodes of the series of the playing episode.
 * Choosing an episode plays it the same way as from the series page.
 */
export function showEpisodes(item: BaseItemDto) {
    if (!item.SeriesId) return Promise.resolve();

    const dlg: SheetElement = dialogHelper.createDialog({
        removeOnClose: true,
        scrollY: false,
        autoFocus: false,
        modal: false,
        entryAnimation: 'md3-sheet',
        exitAnimation: 'fadeout',
        size: layoutManager.tv ? 'fullscreen' : undefined
    });

    dlg.classList.add(EPISODES_SHEET_CLASS);
    dlg.setAttribute('aria-label', globalize.translate('Episodes'));

    let html = '<div class="osdEpisodes-header">';
    html += `<h2 class="osdEpisodes-title">${escapeHtml(item.SeriesName || globalize.translate('Episodes'))}</h2>`;
    html += `<button is="paper-icon-button-light" type="button" class="osdEpisodes-close" title="${escapeHtml(globalize.translate('ButtonClose'))}" aria-label="${escapeHtml(globalize.translate('ButtonClose'))}">`;
    html += '<span class="material-icons close" aria-hidden="true"></span>';
    html += '</button>';
    html += '</div>';
    html += '<div class="osdEpisodes-seasons">';
    html += `<button type="button" class="osdEpisodes-seasonButton hide" aria-haspopup="true" title="${escapeHtml(globalize.translate('HeaderSeasons'))}">`;
    html += '<span class="osdEpisodes-seasonName"></span>';
    html += '<span class="material-icons arrow_drop_down" aria-hidden="true"></span>';
    html += '</button>';
    html += '</div>';
    html += '<div class="osdEpisodes-list focuscontainer-y"></div>';
    dlg.innerHTML = html;

    let seasons: BaseItemDto[] = [];

    dlg.addEventListener('click', e => {
        const target = e.target as HTMLElement;

        if (target.closest('.osdEpisodes-close')) {
            dialogHelper.close(dlg);
            return;
        }

        const seasonButton = target.closest<HTMLElement>('.osdEpisodes-seasonButton');
        if (seasonButton) {
            showSeasonMenu(seasonButton, seasons, dlg.selectedSeasonId)
                .then((seasonId: unknown) => {
                    if (typeof seasonId === 'string' && seasonId && seasonId !== (dlg.selectedSeasonId ?? '')) {
                        return selectSeason(dlg, item, seasons, seasonId);
                    }
                })
                .catch(() => {
                    // The menu was closed without choosing a season, or the episodes failed to load
                });
            return;
        }

        const episodeButton = target.closest<HTMLElement>('.osdEpisodes-episode');
        if (episodeButton) {
            const episodeId = episodeButton.getAttribute('data-id') || '';
            const episode = Object.values(dlg.episodesBySeason || {}).flat().find(({ Id }) => (Id || '') === episodeId);

            dialogHelper.close(dlg);

            if (episode && episode.Id !== item.Id) {
                playbackManager.play({ items: [ episode ] }).catch((err: unknown) => {
                    console.error('[OsdEpisodes] failed to play episode', err);
                });
            }
        }
    });

    const opened = dialogHelper.open(dlg);

    fetchSeasons(item)
        .then(result => {
            seasons = result;
            const seasonId = item.SeasonId && seasons.some(({ Id }) => Id === item.SeasonId) ?
                item.SeasonId :
                seasons[0]?.Id;

            return seasonId ? selectSeason(dlg, item, seasons, seasonId, true) : undefined;
        })
        .catch(err => {
            console.error('[OsdEpisodes] failed to load seasons', err);
        });

    return opened;
}

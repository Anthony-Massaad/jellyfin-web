import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import escapeHtml from 'escape-html';
import type { ApiClient } from 'jellyfin-apiclient';

import layoutManager from 'components/layoutManager';
import { getPrimaryMediaInfoHtml } from 'components/mediainfo/mediainfo';
import { playbackManager } from 'components/playback/playbackmanager';
import { appRouter } from 'components/router/appRouter';
import globalize from 'lib/globalize';
import ServerConnections from 'lib/jellyfin-apiclient/ServerConnections';
import { queryClient } from 'utils/query/queryClient';

import 'elements/emby-button/emby-button';

/** The maximum number of items in the spotlight. */
const SPOTLIGHT_LIMIT = 8;
/** The number of items requested from each pool (recently added and random). */
const POOL_LIMIT = 12;
/** The time each item is shown before advancing (ms). */
const ROTATION_INTERVAL = 5000;
/** The time the current item takes to fade out before the next one fades in (ms). Matches the SCSS. */
const FADE_OUT_DURATION = 400;
/** The maximum number of genres shown for an item. */
const MAX_GENRES = 3;
/** The minimum horizontal distance of a swipe (px). */
const SWIPE_THRESHOLD = 50;

interface SpotlightElement extends HTMLElement {
    spotlightItems?: BaseItemDto[]
    spotlightIndex?: number
    /** Timeout that advances to the next item. */
    spotlightTimer?: number
    /** When the next item is due (ms since epoch) while the timer runs. */
    spotlightDeadline?: number
    /** The time left on the timer while the home screen is paused (hidden). */
    spotlightRemaining?: number
    /** Timeout that swaps the items once the current one has faded out. */
    spotlightFadeTimer?: number
    spotlightPaused?: boolean
    spotlightCleanup?: () => void
}

const SPOTLIGHT_QUERY_PARAMS = {
    recursive: true,
    includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
    imageTypes: [ ImageType.Backdrop ],
    hasOverview: true,
    fields: [ ItemFields.Overview, ItemFields.Genres ],
    enableImageTypes: [ ImageType.Backdrop, ImageType.Logo ],
    imageTypeLimit: 1,
    enableTotalRecordCount: false,
    limit: POOL_LIMIT
};

/** Fisher–Yates shuffle (returns a new array). */
const shuffle = <T>(items: T[]) => {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
        // eslint-disable-next-line sonarjs/pseudo-random -- only used to vary the order of the items
        const j = Math.floor(Math.random() * (i + 1));
        [ result[i], result[j] ] = [ result[j], result[i] ];
    }
    return result;
};

/** A shuffled mix of recently added and random movies and series with backdrops. */
const fetchSpotlightItems = (apiClient: ApiClient) => {
    const api = ServerConnections.getApi(apiClient.serverId());
    const userId = apiClient.getCurrentUserId();

    if (!api) return Promise.resolve([]);

    const libraryApi = getLibraryApi(api);

    return queryClient.fetchQuery({
        queryKey: [ 'User', userId, 'HomeSpotlight' ],
        queryFn: async ({ signal }) => {
            const [ { data: latest }, { data: random } ] = await Promise.all([
                libraryApi.getItems({
                    ...SPOTLIGHT_QUERY_PARAMS,
                    userId,
                    sortBy: [ ItemSortBy.DateCreated ],
                    sortOrder: [ SortOrder.Descending ]
                }, { signal }),
                libraryApi.getItems({
                    ...SPOTLIGHT_QUERY_PARAMS,
                    userId,
                    sortBy: [ ItemSortBy.Random ]
                }, { signal })
            ]);

            return [ ...(latest.Items || []), ...(random.Items || []) ];
        }
    }).then(items => {
        const unique = items.filter((item, index) => items.findIndex(({ Id }) => Id === item.Id) === index);
        return shuffle(unique).slice(0, SPOTLIGHT_LIMIT);
    });
};

const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const isAutoAdvanceEnabled = () => !prefersReducedMotion();

// TVs swap the items without fading
const isFadeEnabled = () => !layoutManager.tv && !prefersReducedMotion();

const getBackdropUrl = (apiClient: ApiClient, item: BaseItemDto) => {
    const maxWidth = Math.min(1920, Math.round(window.innerWidth * (window.devicePixelRatio || 1)));

    return apiClient.getScaledImageUrl(item.Id || '', {
        type: ImageType.Backdrop,
        tag: item.BackdropImageTags?.[0],
        maxWidth
    });
};

const getLogoHtml = (apiClient: ApiClient, item: BaseItemDto) => {
    const logoTag = item.ImageTags?.[ImageType.Logo];
    const name = escapeHtml(item.Name || '');

    if (!logoTag) {
        return `<h2 class="homeSpotlight-title">${name}</h2>`;
    }

    const logoUrl = apiClient.getScaledImageUrl(item.Id || '', {
        type: ImageType.Logo,
        tag: logoTag,
        maxWidth: 800
    });

    return `<h2 class="homeSpotlight-title homeSpotlight-title-logo"><img class="homeSpotlight-logo" src="${logoUrl}" alt="${name}" /></h2>`;
};

const getSlideHtml = (apiClient: ApiClient, item: BaseItemDto, index: number) => {
    const genres = (item.Genres || []).slice(0, MAX_GENRES)
        .map(genre => `<span class="homeSpotlight-genre">${escapeHtml(genre)}</span>`)
        .join('');

    let html = `<div class="homeSpotlight-slide${index === 0 ? ' homeSpotlight-slide-active' : ''}" data-index="${index}"${index === 0 ? '' : ' aria-hidden="true"'}>`;
    html += `<div class="homeSpotlight-backdrop" data-src="${getBackdropUrl(apiClient, item)}"></div>`;
    html += '<div class="homeSpotlight-scrim"></div>';
    html += '<div class="homeSpotlight-content padded-left padded-right">';
    html += getLogoHtml(apiClient, item);
    html += '<div class="homeSpotlight-meta">';
    html += `<div class="homeSpotlight-mediaInfo mediaInfo">${getPrimaryMediaInfoHtml(item, {
        interactive: false,
        endsAt: false,
        criticRating: false,
        subtitles: false,
        originalAirDate: false,
        episodeTitle: false
    })}</div>`;
    if (genres) html += `<div class="homeSpotlight-genres">${genres}</div>`;
    html += '</div>';
    html += `<p class="homeSpotlight-overview">${escapeHtml(item.Overview || '')}</p>`;
    html += '<div class="homeSpotlight-actions focuscontainer-x">';
    html += `<button is="emby-button" type="button" class="homeSpotlight-button homeSpotlight-play button-submit" data-action="play" data-index="${index}">`;
    html += '<span class="material-icons play_arrow" aria-hidden="true"></span>';
    html += `<span>${globalize.translate('Play')}</span>`;
    html += '</button>';
    html += `<button is="emby-button" type="button" class="homeSpotlight-button homeSpotlight-info" data-action="info" data-index="${index}">`;
    html += '<span class="material-icons info_outline" aria-hidden="true"></span>';
    html += `<span>${globalize.translate('ButtonInfo')}</span>`;
    html += '</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    return html;
};

/** Segmented progress indicator: one segment per item, the active one fills up until the next item. */
const getPagerHtml = (items: BaseItemDto[]) => {
    if (items.length < 2) return '';

    let html = '<div class="homeSpotlight-pager focuscontainer-x">';
    items.forEach((item, index) => {
        html += `<button type="button" class="homeSpotlight-indicator${index === 0 ? ' homeSpotlight-indicator-active' : ''}" data-action="select" data-index="${index}" aria-label="${escapeHtml(item.Name || '')}"${index === 0 ? ' aria-current="true"' : ''}>`;
        html += `<span class="homeSpotlight-indicatorFill" style="animation-duration:${ROTATION_INTERVAL}ms"></span>`;
        html += '</button>';
    });
    html += '</div>';

    return html;
};

/** Loads the backdrop image of a slide (and the next one, so it is ready when the spotlight advances). */
const loadBackdrops = (elem: SpotlightElement, index: number) => {
    const slides = elem.querySelectorAll<HTMLElement>('.homeSpotlight-slide');
    [ index, (index + 1) % slides.length ].forEach(i => {
        const backdrop = slides[i]?.querySelector<HTMLElement>('.homeSpotlight-backdrop');
        const src = backdrop?.getAttribute('data-src');
        if (backdrop && src) {
            backdrop.style.backgroundImage = `url('${src}')`;
            backdrop.removeAttribute('data-src');
        }
    });
};

const activateSlide = (elem: SpotlightElement, index: number) => {
    // Keep the focus on the same button (Play or Info) when the item changes under it
    const focused = document.activeElement instanceof HTMLElement && document.activeElement.closest('.homeSpotlight-slide') ?
        document.activeElement.getAttribute('data-action') :
        null;

    elem.querySelectorAll<HTMLElement>('.homeSpotlight-slide').forEach((slide, i) => {
        const isActive = i === index;
        slide.classList.remove('homeSpotlight-slide-leaving');
        slide.classList.toggle('homeSpotlight-slide-active', isActive);
        if (isActive) {
            slide.removeAttribute('aria-hidden');
        } else {
            slide.setAttribute('aria-hidden', 'true');
        }
    });

    if (focused) {
        elem.querySelector<HTMLElement>(`.homeSpotlight-slide-active [data-action="${focused}"]`)?.focus({ preventScroll: true });
    }
};

const updateIndicators = (elem: SpotlightElement, index: number) => {
    elem.querySelectorAll<HTMLElement>('.homeSpotlight-indicator').forEach((indicator, i) => {
        indicator.classList.toggle('homeSpotlight-indicator-done', i < index);
        indicator.classList.remove('homeSpotlight-indicator-active');
        if (i === index) {
            // Force a reflow so the fill animation restarts even when the same item is selected again
            indicator.getBoundingClientRect();
            indicator.classList.add('homeSpotlight-indicator-active');
            indicator.setAttribute('aria-current', 'true');
        } else {
            indicator.removeAttribute('aria-current');
        }
    });
};

/** Shows an item: the current one fades out, then the new one fades in. */
const showSlide = (elem: SpotlightElement, index: number) => {
    const slides = elem.querySelectorAll<HTMLElement>('.homeSpotlight-slide');
    if (!slides.length) return;

    const nextIndex = (index + slides.length) % slides.length;
    const current = elem.querySelector<HTMLElement>('.homeSpotlight-slide-active');

    elem.spotlightIndex = nextIndex;
    loadBackdrops(elem, nextIndex);
    updateIndicators(elem, nextIndex);

    clearTimeout(elem.spotlightFadeTimer);
    elem.spotlightFadeTimer = undefined;

    if (current && current !== slides[nextIndex] && isFadeEnabled()) {
        current.classList.add('homeSpotlight-slide-leaving');
        elem.spotlightFadeTimer = window.setTimeout(() => {
            elem.spotlightFadeTimer = undefined;
            activateSlide(elem, nextIndex);
        }, FADE_OUT_DURATION);
    } else {
        activateSlide(elem, nextIndex);
    }
};

const stopTimer = (elem: SpotlightElement) => {
    clearTimeout(elem.spotlightTimer);
    elem.spotlightTimer = undefined;
    elem.spotlightDeadline = undefined;
};

const canAutoAdvance = (elem: SpotlightElement) => (
    !elem.spotlightPaused && isAutoAdvanceEnabled() && (elem.spotlightItems?.length || 0) > 1
);

/** Advances to the next item after `delay` (a full interval unless resuming a held timer). */
const startTimer = (elem: SpotlightElement, delay = ROTATION_INTERVAL) => {
    stopTimer(elem);
    elem.spotlightRemaining = undefined;

    const section = elem.querySelector('.homeSpotlight');
    section?.classList.toggle('homeSpotlight-autoplay', isAutoAdvanceEnabled());
    section?.classList.toggle('homeSpotlight-held', !canAutoAdvance(elem));

    if (!canAutoAdvance(elem)) return;

    elem.spotlightDeadline = Date.now() + delay;
    elem.spotlightTimer = window.setTimeout(() => {
        showSlide(elem, (elem.spotlightIndex || 0) + 1);
        startTimer(elem);
    }, delay);
};

/** Stops the timer (while the home screen is hidden) but remembers the time left, so the progress resumes where it stopped. */
const holdTimer = (elem: SpotlightElement) => {
    if (elem.spotlightDeadline) {
        elem.spotlightRemaining = Math.max(0, elem.spotlightDeadline - Date.now());
    }
    clearTimeout(elem.spotlightTimer);
    elem.spotlightTimer = undefined;
    elem.spotlightDeadline = undefined;
    elem.querySelector('.homeSpotlight')?.classList.add('homeSpotlight-held');
};

const releaseTimer = (elem: SpotlightElement) => {
    startTimer(elem, elem.spotlightRemaining ?? ROTATION_INTERVAL);
};

/** Selects an item from user input and restarts the timer for it. */
const selectSlide = (elem: SpotlightElement, index: number) => {
    showSlide(elem, index);
    startTimer(elem);
};

const bindEvents = (elem: SpotlightElement) => {
    const onClick = (e: Event) => {
        const button = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
        if (!button || !elem.contains(button)) return;

        const action = button.getAttribute('data-action');
        const index = parseInt(button.getAttribute('data-index') || '0', 10);
        const item = elem.spotlightItems?.[index];

        if (action === 'select') {
            selectSlide(elem, index);
        } else if (item && action === 'play') {
            playbackManager.play({ items: [ item ] })
                .catch((err: unknown) => {
                    console.error('[HomeSpotlight] failed to play item', err);
                });
        } else if (item && action === 'info') {
            appRouter.showItem(item);
        }
    };

    // Focusing an indicator (remote/keyboard navigation) shows that item
    const onFocusIn = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('homeSpotlight-indicator')) {
            const index = parseInt(target.getAttribute('data-index') || '0', 10);
            if (index !== elem.spotlightIndex) {
                selectSlide(elem, index);
            }
        }
    };

    let touchStartX: number | undefined;
    let touchStartY = 0;

    const onTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0]?.clientX;
        touchStartY = e.touches[0]?.clientY || 0;
    };

    const onTouchEnd = (e: TouchEvent) => {
        const touch = e.changedTouches[0];
        if (touchStartX === undefined || !touch) return;

        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        touchStartX = undefined;

        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;

        // Swiping left shows the next item (the previous one in RTL)
        const step = (dx < 0) === !globalize.getIsRTL() ? 1 : -1;
        selectSlide(elem, (elem.spotlightIndex || 0) + step);
    };

    elem.addEventListener('click', onClick);
    elem.addEventListener('focusin', onFocusIn);
    elem.addEventListener('touchstart', onTouchStart, { passive: true });
    elem.addEventListener('touchend', onTouchEnd, { passive: true });

    elem.spotlightCleanup = () => {
        elem.removeEventListener('click', onClick);
        elem.removeEventListener('focusin', onFocusIn);
        elem.removeEventListener('touchstart', onTouchStart);
        elem.removeEventListener('touchend', onTouchEnd);
    };
};

/** Renders the spotlight (hero) section at the top of the home screen. */
export function loadSpotlight(elem: SpotlightElement, apiClient: ApiClient) {
    return fetchSpotlightItems(apiClient)
        .then(items => {
            destroySpotlight(elem);

            if (!items.length) {
                elem.innerHTML = '';
                elem.classList.add('hide');
                return;
            }

            elem.classList.remove('hide');
            elem.spotlightItems = items;
            elem.spotlightIndex = 0;

            let html = `<section class="homeSpotlight" aria-label="${escapeHtml(globalize.translate('HeaderSpotlight'))}" aria-roledescription="carousel">`;
            html += '<div class="homeSpotlight-slides">';
            html += items.map((item, index) => getSlideHtml(apiClient, item, index)).join('');
            html += '</div>';
            html += getPagerHtml(items);
            html += '</section>';
            elem.innerHTML = html;

            loadBackdrops(elem, 0);
            bindEvents(elem);
            startTimer(elem);
        })
        .catch(err => {
            console.error('[HomeSpotlight] failed to load items', err);
            elem.innerHTML = '';
            elem.classList.add('hide');
        });
}

export function pauseSpotlight(elem: SpotlightElement) {
    elem.spotlightPaused = true;
    holdTimer(elem);
}

export function resumeSpotlight(elem: SpotlightElement) {
    elem.spotlightPaused = false;
    releaseTimer(elem);
}

export function destroySpotlight(elem: SpotlightElement) {
    stopTimer(elem);
    clearTimeout(elem.spotlightFadeTimer);
    elem.spotlightFadeTimer = undefined;
    elem.spotlightRemaining = undefined;
    elem.spotlightCleanup?.();
    elem.spotlightCleanup = undefined;
    elem.spotlightItems = undefined;
}

import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';

import cardBuilder from 'components/cardbuilder/cardBuilder';
import { getPortraitShape } from 'components/cardbuilder/utils/shape';
import layoutManager from 'components/layoutManager';

import type { SectionContainerElement, SectionOptions } from './section';

interface ItemRowOptions extends SectionOptions {
    /** The (already escaped) row title. */
    title: string
    /** Link for the row title ("see all"). Not used in the TV layout. */
    url?: string
    /** Extra class for the row element. */
    className: string
}

/**
 * Returns the markup for a hidden home row of items with a title.
 * The row is shown by emby-itemscontainer once it loads at least one item (see attachItemRow).
 */
export const getItemRowHtml = ({ title, url, className, enableOverflow }: ItemRowOptions) => {
    let html = `<div class="verticalSection ${className} hide">`;

    html += '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left">';
    if (url && !layoutManager.tv) {
        html += `<a is="emby-linkbutton" href="${url}" class="more button-flat button-flat-mini sectionTitleTextButton">`;
        html += `<h2 class="sectionTitle sectionTitle-cards">${title}</h2>`;
        html += '<span class="material-icons chevron_right" aria-hidden="true"></span>';
        html += '</a>';
    } else {
        html += `<h2 class="sectionTitle sectionTitle-cards">${title}</h2>`;
    }
    html += '</div>';

    if (enableOverflow) {
        html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-centerfocus="true">';
        html += '<div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x"></div>';
        html += '</div>';
    } else {
        html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x"></div>';
    }

    html += '</div>';
    return html;
};

/** Connects a row to its data. The items container fetches when the home screen resumes. */
export const attachItemRow = (
    row: HTMLElement,
    fetchData: () => Promise<BaseItemDto[]>,
    { enableOverflow }: SectionOptions
) => {
    const itemsContainer = row.querySelector<SectionContainerElement & HTMLElement>('.itemsContainer');
    if (!itemsContainer) return;

    itemsContainer.fetchData = fetchData;
    itemsContainer.getItemsHtml = (items: BaseItemDto[]) => cardBuilder.getCardsHtml({
        items,
        shape: getPortraitShape(enableOverflow),
        showTitle: true,
        showYear: true,
        centerText: true,
        overlayPlayButton: true,
        allowBottomPadding: !enableOverflow,
        lazy: true
    });
    itemsContainer.parentContainer = row;
};

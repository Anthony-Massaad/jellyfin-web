import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const layoutManager = vi.hoisted(() => ({ tv: false }));

vi.mock('components/layoutManager', () => ({ default: layoutManager }));
vi.mock('lib/globalize', () => ({
    default: { translate: (key: string) => key }
}));

import { initSectionNav } from './sectionNav';

const createPage = () => {
    const page = document.createElement('div');
    page.innerHTML = `
        <div class="detailPageSecondaryContainer">
            <div class="detailVerticalSection" id="cast"><h2 class="sectionTitle">Cast &amp; Crew</h2></div>
            <div class="detailVerticalSection hide" id="extras"><h2 class="sectionTitle">Extras</h2></div>
            <div class="detailVerticalSection" id="similar"><h2 class="sectionTitle">More Like This</h2></div>
        </div>`;
    document.body.appendChild(page);
    return page;
};

describe('initSectionNav', () => {
    let page: HTMLElement;
    let destroy: () => void;

    beforeEach(() => {
        vi.useFakeTimers();
        layoutManager.tv = false;
        page = createPage();
        // jsdom does not do layout, so treat every element as rendered
        vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockReturnValue(document.body);
    });

    afterEach(() => {
        destroy?.();
        page.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const flush = async () => {
        await Promise.resolve();
        vi.advanceTimersByTime(200);
    };

    it('should list the visible sections once the page changes', async () => {
        destroy = initSectionNav(page);
        page.querySelector('#cast')?.classList.add('rendered');
        await flush();

        const chips = Array.from(page.querySelectorAll('.detailSectionNav-chip')).map(chip => chip.textContent);
        expect(chips).toEqual([ 'Cast & Crew', 'More Like This' ]);
        expect(page.querySelector('.detailSectionNav')?.classList.contains('hide')).toBe(false);
    });

    it('should stay hidden with fewer than two sections', async () => {
        destroy = initSectionNav(page);
        page.querySelector('#similar')?.classList.add('hide');
        await flush();

        expect(page.querySelector('.detailSectionNav')?.classList.contains('hide')).toBe(true);
    });

    it('should scroll to a section when a chip is clicked', async () => {
        const scrollIntoView = vi.fn();
        Element.prototype.scrollIntoView = scrollIntoView;

        destroy = initSectionNav(page);
        page.querySelector('#cast')?.classList.add('rendered');
        await flush();

        page.querySelectorAll<HTMLElement>('.detailSectionNav-chip')[1].click();
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(scrollIntoView.mock.contexts[0]).toBe(page.querySelector('#similar'));
    });

    it('should not render in the TV layout', () => {
        layoutManager.tv = true;
        destroy = initSectionNav(page);

        expect(page.querySelector('.detailSectionNav')).toBeNull();
    });

    it('should remove the shortcuts when destroyed', () => {
        destroy = initSectionNav(page);
        destroy();

        expect(page.querySelector('.detailSectionNav')).toBeNull();
    });
});

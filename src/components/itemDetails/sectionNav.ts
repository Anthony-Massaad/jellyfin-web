import escapeHtml from 'escape-html';

import layoutManager from 'components/layoutManager';
import globalize from 'lib/globalize';

/** The minimum number of visible sections before the shortcuts are shown. */
const MIN_SECTIONS = 2;
/** Delay before rebuilding after the page changes, so rapid section updates are batched (ms). */
const REBUILD_DELAY = 150;

const NAV_CLASS = 'detailSectionNav';

const getVisibleSections = (page: HTMLElement) => (
    Array.from(page.querySelectorAll<HTMLElement>('.detailVerticalSection'))
        .map(section => {
            const title = section.querySelector<HTMLElement>('.sectionTitle');
            const label = title?.textContent?.trim();

            if (section.classList.contains('hide') || !label || !section.offsetParent) return null;

            return { section, label };
        })
        .filter(entry => entry !== null)
);

/**
 * Renders a row of section shortcuts (Episodes, Cast & Crew, More Like This, …) on the item details page.
 * The labels reuse the translated section titles. The TV layout is skipped so remote navigation stays linear.
 * @returns A function that removes the shortcuts and stops observing the page.
 */
export function initSectionNav(page: HTMLElement): () => void {
    const anchor = page.querySelector('.detailPageSecondaryContainer');
    if (layoutManager.tv || !anchor || typeof MutationObserver === 'undefined') {
        return () => { /* no-op */ };
    }

    const nav = document.createElement('nav');
    nav.className = `${NAV_CLASS} focuscontainer-x padded-left padded-right hide`;
    nav.setAttribute('aria-label', globalize.translate('HeaderNavigation'));
    anchor.parentElement?.insertBefore(nav, anchor);

    let sections: HTMLElement[] = [];
    let timeout: number | undefined;

    const rebuild = () => {
        timeout = undefined;

        const visible = getVisibleSections(page);
        sections = visible.map(({ section }) => section);

        if (visible.length < MIN_SECTIONS) {
            nav.classList.add('hide');
            nav.innerHTML = '';
            return;
        }

        nav.innerHTML = visible
            .map(({ label }, index) => (
                `<button type="button" class="detailSectionNav-chip" data-index="${index}">${escapeHtml(label)}</button>`
            ))
            .join('');
        nav.classList.remove('hide');
    };

    const scheduleRebuild = (mutations: MutationRecord[]) => {
        // Ignore changes made by the shortcuts themselves
        if (mutations.every(mutation => nav.contains(mutation.target))) return;

        if (timeout) clearTimeout(timeout);
        timeout = window.setTimeout(rebuild, REBUILD_DELAY);
    };

    const onClick = (e: Event) => {
        const chip = (e.target as HTMLElement).closest<HTMLElement>('.detailSectionNav-chip');
        const section = chip ? sections[parseInt(chip.getAttribute('data-index') || '', 10)] : undefined;
        if (!section) return;

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    };

    const observer = new MutationObserver(scheduleRebuild);
    observer.observe(page, {
        attributes: true,
        attributeFilter: [ 'class' ],
        childList: true,
        characterData: true,
        subtree: true
    });
    nav.addEventListener('click', onClick);

    return () => {
        observer.disconnect();
        if (timeout) clearTimeout(timeout);
        nav.removeEventListener('click', onClick);
        nav.remove();
    };
}

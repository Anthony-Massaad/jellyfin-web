import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';
import ResizeObserver from 'resize-observer-polyfill';
import scrollerFactory from 'lib/scroller';
import globalize from 'lib/globalize';
import IconButton from '../emby-button/IconButton';
import './emby-scrollbuttons.scss';
import { ScrollDirection, scrollerItemSlideIntoView } from './utils';

interface ScrollButtonsProps {
    scrollerFactoryRef: React.MutableRefObject<scrollerFactory | null>;
    scrollState: {
        scrollSize: number;
        scrollPos: number;
        scrollWidth: number;
    }
}

const ScrollButtons: FC<ScrollButtonsProps> = ({ scrollerFactoryRef, scrollState }) => {
    const [localeScrollPos, setLocaleScrollPos] = useState<number>(0);
    const scrollButtonsRef = useRef<HTMLDivElement>(null);

    const onScrollButtonClick = useCallback((direction: ScrollDirection) => {
        scrollerItemSlideIntoView({
            direction,
            scroller: scrollerFactoryRef.current,
            scrollState
        });
    }, [scrollState, scrollerFactoryRef]);

    const triggerScrollLeft = useCallback(() => onScrollButtonClick(ScrollDirection.LEFT), [ onScrollButtonClick ]);
    const triggerScrollRight = useCallback(() => onScrollButtonClick(ScrollDirection.RIGHT), [ onScrollButtonClick ]);

    useEffect(() => {
        const parent = scrollButtonsRef.current?.parentNode as HTMLDivElement;
        parent.classList.add('emby-scroller-container');

        let localeAwarePos = scrollState.scrollPos;
        if (globalize.getIsElementRTL(scrollButtonsRef.current)) {
            localeAwarePos *= -1;
        }
        setLocaleScrollPos(localeAwarePos);
    }, [scrollState.scrollPos]);

    // Expose the scroller size and position so themes can place the buttons over the sides of the slider
    // (the same properties as the legacy emby-scrollbuttons element)
    useEffect(() => {
        const buttons = scrollButtonsRef.current;
        const scroller = buttons?.nextElementSibling as HTMLElement | null;
        if (!buttons || !scroller) return;

        const update = () => {
            const scrollerRect = scroller.getBoundingClientRect();
            const rect = buttons.getBoundingClientRect();

            buttons.style.setProperty('--emby-scroller-height', `${scroller.offsetHeight}px`);
            buttons.style.setProperty('--emby-scroller-left', `${Math.round(scrollerRect.left - rect.left)}px`);
            buttons.style.setProperty('--emby-scroller-right', `${Math.round(rect.right - scrollerRect.right)}px`);
        };

        const observer = new ResizeObserver(update);
        observer.observe(scroller);
        observer.observe(buttons);
        update();

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={scrollButtonsRef} className='emby-scrollbuttons padded-right'>

            <IconButton
                type='button'
                className='emby-scrollbuttons-button btnPrev'
                data-direction='left'
                onClick={triggerScrollLeft}
                icon='chevron_left'
                disabled={localeScrollPos <= 0}
            />

            <IconButton
                type='button'
                className='emby-scrollbuttons-button btnNext'
                data-direction='right'
                onClick={triggerScrollRight}
                icon='chevron_right'
                disabled={scrollState.scrollWidth > 0 && localeScrollPos + scrollState.scrollSize >= scrollState.scrollWidth}
            />
        </div>
    );
};

export default ScrollButtons;


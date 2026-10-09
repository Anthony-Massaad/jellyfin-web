import type { Api } from '@jellyfin/sdk';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@jellyfin/sdk/lib/utils/api/image-api', () => ({
    getImageApi: () => ({
        getItemImageUrlById: (id: string, type: string, { tag }: { tag: string }) => `/Items/${id}/Images/${type}?tag=${tag}`
    })
}));
vi.mock('components/router/appRouter', () => ({ appRouter: {} }));
vi.mock('elements/emby-button/LinkButton', () => ({ default: () => null }));
vi.mock('elements/emby-button/emby-button', () => ({}));
vi.mock('hooks/useApi', () => ({ useApi: () => ({}) }));
vi.mock('lib/globalize', () => ({ default: { translate: (key: string) => key } }));

import { getTileImageUrl } from './SearchSuggestions';

const api = {} as Api;

describe('getTileImageUrl', () => {
    it('should prefer the backdrop, then the thumb, then the primary image', () => {
        expect(getTileImageUrl(api, { Id: 'a', BackdropImageTags: [ 'b1' ], ImageTags: { Thumb: 't1', Primary: 'p1' } }))
            .toBe('/Items/a/Images/Backdrop?tag=b1');
        expect(getTileImageUrl(api, { Id: 'a', ImageTags: { Thumb: 't1', Primary: 'p1' } }))
            .toBe('/Items/a/Images/Thumb?tag=t1');
        expect(getTileImageUrl(api, { Id: 'a', ImageTags: { Primary: 'p1' } }))
            .toBe('/Items/a/Images/Primary?tag=p1');
    });

    it('should return nothing without an image or api', () => {
        expect(getTileImageUrl(api, { Id: 'a' })).toBeUndefined();
        expect(getTileImageUrl(undefined, { Id: 'a', ImageTags: { Primary: 'p1' } })).toBeUndefined();
    });
});

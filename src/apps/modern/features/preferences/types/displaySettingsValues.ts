export interface DisplaySettingsValues {
    /** The accent color id, or an empty string for the theme default. */
    accent: string;
    customCss: string;
    dashboardTheme: string;
    dateTimeLocale: string;
    disableCustomCss: boolean;
    displayMissingEpisodes: boolean;
    enableBlurHash: boolean;
    enableFasterAnimation: boolean;
    enableItemDetailsBanner: boolean;
    enableLibraryBackdrops: boolean;
    enableLibraryThemeSongs: boolean;
    enableLibraryThemeVideos: boolean;
    enableRewatchingInNextUp: boolean;
    episodeImagesInNextUp: boolean;
    language: string;
    layout: string;
    libraryPageSize: number;
    maxDaysForNextUp: number;
    screensaver: string;
    screensaverTime: number;
    backdropScreensaverInterval: number;
    slideshowInterval: number;
    theme: string;
}

import { createTheme } from '@mui/material/styles';
import merge from 'lodash-es/merge';

import { DEFAULT_THEME_OPTIONS } from './_base/theme';
import appletv from './appletv';
import blueradiance from './blueradiance';
import dark from './dark';
import ember from './ember';
import forest from './forest';
import light from './light';
import { MD3_COMPONENTS } from './md3/overrides';
import orchid from './orchid';
import purplehaze from './purplehaze';
import wmc from './wmc';

/** The default theme containing all color scheme variants. */
const DEFAULT_THEME = createTheme({
    cssVariables: {
        cssVarPrefix: 'jf',
        colorSchemeSelector: '[data-theme="%s"]',
        disableCssColorScheme: true
    },
    defaultColorScheme: 'dark',
    ...DEFAULT_THEME_OPTIONS,
    // Material Design 3 overrides are scoped to the user app (see themes/md3/overrides.ts)
    components: merge({}, DEFAULT_THEME_OPTIONS.components, MD3_COMPONENTS),
    colorSchemes: {
        appletv,
        blueradiance,
        dark,
        ember,
        forest,
        light,
        orchid,
        purplehaze,
        wmc
    }
});

export default DEFAULT_THEME;

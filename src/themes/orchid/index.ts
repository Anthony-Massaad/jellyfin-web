import { buildCustomColorScheme } from 'themes/utils';

/**
 * The "Orchid" color scheme: a dark Material Design 3 scheme generated from a pink seed color.
 * The values match the roles in styles/md3/_palettes.generated.scss.
 */
const theme = buildCustomColorScheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#f6b2df',
            contrastText: '#4f1e43'
        },
        secondary: {
            main: '#ddbed0'
        },
        background: {
            default: '#181215',
            paper: '#251e22'
        },
        text: {
            primary: '#ecdfe4',
            secondary: '#d2c2ca'
        },
        divider: '#4f444a',
        AppBar: {
            defaultBg: '#251e22'
        },
        Button: {
            inheritContainedBg: '#3a3337',
            inheritContainedHoverBg: '#2f282c'
        },
        SnackbarContent: {
            bg: '#ecdfe4',
            color: '#362e32'
        }
    }
});

export default theme;

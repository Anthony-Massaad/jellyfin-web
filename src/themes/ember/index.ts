import { buildCustomColorScheme } from 'themes/utils';

/**
 * The "Ember" color scheme: a dark Material Design 3 scheme generated from a warm orange seed color.
 * The values match the roles in styles/md3/_palettes.generated.scss.
 */
const theme = buildCustomColorScheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#ffb68a',
            contrastText: '#522300'
        },
        secondary: {
            main: '#e5bfa9'
        },
        background: {
            default: '#1a120d',
            paper: '#261e19'
        },
        text: {
            primary: '#f0dfd7',
            secondary: '#d7c2b8'
        },
        divider: '#52443c',
        AppBar: {
            defaultBg: '#261e19'
        },
        Button: {
            inheritContainedBg: '#3d332d',
            inheritContainedHoverBg: '#312823'
        },
        SnackbarContent: {
            bg: '#f0dfd7',
            color: '#382e29'
        }
    }
});

export default theme;

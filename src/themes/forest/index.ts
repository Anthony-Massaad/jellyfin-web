import { buildCustomColorScheme } from 'themes/utils';

/**
 * The "Forest" color scheme: a dark Material Design 3 scheme generated from a green seed color.
 * The values match the roles in styles/md3/_palettes.generated.scss.
 */
const theme = buildCustomColorScheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#95d5a7',
            contrastText: '#00391d'
        },
        secondary: {
            main: '#b6ccb9'
        },
        background: {
            default: '#0f1510',
            paper: '#1c211c'
        },
        text: {
            primary: '#dfe4dd',
            secondary: '#c0c9bf'
        },
        divider: '#414942',
        AppBar: {
            defaultBg: '#1c211c'
        },
        Button: {
            inheritContainedBg: '#313631',
            inheritContainedHoverBg: '#262b27'
        },
        SnackbarContent: {
            bg: '#dfe4dd',
            color: '#2c322d'
        }
    }
});

export default theme;

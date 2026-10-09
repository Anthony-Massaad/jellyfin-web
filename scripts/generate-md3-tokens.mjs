/**
 * Generates the Material Design 3 color roles for every theme.
 *
 * Usage: node scripts/generate-md3-tokens.mjs
 *
 * The output is committed to the repository, so this only needs to be run when a seed color changes.
 * Generating at build time keeps @material/material-color-utilities out of the browser bundle.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    Hct,
    SchemeContent,
    SchemeTonalSpot,
    SchemeVibrant,
    hexFromArgb
} from '@material/material-color-utilities';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_FILE = resolve(ROOT, 'src/styles/md3/_palettes.generated.scss');

const SCHEME_VARIANTS = {
    content: SchemeContent,
    tonalSpot: SchemeTonalSpot,
    vibrant: SchemeVibrant
};

/** The seed configuration for each theme id in src/config.json. */
const THEMES = [
    { id: 'dark', seed: '#00a4dc', isDark: true, variant: 'tonalSpot' },
    { id: 'light', seed: '#00a4dc', isDark: false, variant: 'tonalSpot' },
    { id: 'appletv', seed: '#4a90b8', isDark: false, variant: 'tonalSpot' },
    { id: 'blueradiance', seed: '#0a4f9c', isDark: true, variant: 'content' },
    { id: 'purplehaze', seed: '#6a2c91', isDark: true, variant: 'content' },
    { id: 'wmc', seed: '#1a5aa6', isDark: true, variant: 'content' },
    { id: 'ember', seed: '#e8710a', isDark: true, variant: 'tonalSpot' },
    { id: 'forest', seed: '#2e7d4f', isDark: true, variant: 'tonalSpot' },
    { id: 'orchid', seed: '#b4469b', isDark: true, variant: 'tonalSpot' }
];

/**
 * Accent colors that the user can pick in the display settings, on top of any theme (src/scripts/accent.ts).
 * An accent only replaces the accent roles (ACCENT_ROLES), so each theme keeps its own surfaces.
 */
const ACCENTS = [
    { id: 'blue', seed: '#4285f4' },
    { id: 'teal', seed: '#00897b' },
    { id: 'green', seed: '#34a853' },
    { id: 'yellow', seed: '#fbbc04' },
    { id: 'orange', seed: '#fa7b17' },
    { id: 'red', seed: '#ea4335' },
    { id: 'pink', seed: '#e91e63' },
    { id: 'purple', seed: '#9334e6' }
];

/** The scheme variant of the accents: livelier than the tonal spot themes. */
const ACCENT_VARIANT = 'vibrant';

/** The MD3 color roles to export, as [css role name, DynamicScheme getter]. */
const ROLES = [
    [ 'primary', 'primary' ],
    [ 'on-primary', 'onPrimary' ],
    [ 'primary-container', 'primaryContainer' ],
    [ 'on-primary-container', 'onPrimaryContainer' ],
    [ 'inverse-primary', 'inversePrimary' ],
    [ 'secondary', 'secondary' ],
    [ 'on-secondary', 'onSecondary' ],
    [ 'secondary-container', 'secondaryContainer' ],
    [ 'on-secondary-container', 'onSecondaryContainer' ],
    [ 'tertiary', 'tertiary' ],
    [ 'on-tertiary', 'onTertiary' ],
    [ 'tertiary-container', 'tertiaryContainer' ],
    [ 'on-tertiary-container', 'onTertiaryContainer' ],
    [ 'error', 'error' ],
    [ 'on-error', 'onError' ],
    [ 'error-container', 'errorContainer' ],
    [ 'on-error-container', 'onErrorContainer' ],
    [ 'background', 'background' ],
    [ 'on-background', 'onBackground' ],
    [ 'surface', 'surface' ],
    [ 'on-surface', 'onSurface' ],
    [ 'surface-variant', 'surfaceVariant' ],
    [ 'on-surface-variant', 'onSurfaceVariant' ],
    [ 'surface-dim', 'surfaceDim' ],
    [ 'surface-bright', 'surfaceBright' ],
    [ 'surface-container-lowest', 'surfaceContainerLowest' ],
    [ 'surface-container-low', 'surfaceContainerLow' ],
    [ 'surface-container', 'surfaceContainer' ],
    [ 'surface-container-high', 'surfaceContainerHigh' ],
    [ 'surface-container-highest', 'surfaceContainerHighest' ],
    [ 'surface-tint', 'surfaceTint' ],
    [ 'inverse-surface', 'inverseSurface' ],
    [ 'inverse-on-surface', 'inverseOnSurface' ],
    [ 'outline', 'outline' ],
    [ 'outline-variant', 'outlineVariant' ],
    [ 'shadow', 'shadow' ],
    [ 'scrim', 'scrim' ]
];

/** The roles that an accent replaces. */
const ACCENT_ROLES = [
    'primary', 'on-primary', 'primary-container', 'on-primary-container', 'inverse-primary',
    'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
    'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
    'surface-tint'
];

/** Shortens a hex color when possible (#aabbcc -> #abc) to satisfy stylelint's color-hex-length rule. */
const toShortHex = hex => (
    /^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/.test(hex) ? `#${hex[1]}${hex[3]}${hex[5]}` : hex
);

const createScheme = (seed, isDark, variant) => {
    const Scheme = SCHEME_VARIANTS[variant];
    return new Scheme(Hct.fromInt(parseInt(seed.slice(1), 16) | 0xff000000), isDark, 0);
};

const toScssEntries = (scheme, roles) => (
    ROLES
        .filter(([ role ]) => roles.includes(role))
        .map(([ role, getter ]) => `    '${role}': ${toShortHex(hexFromArgb(scheme[getter]))}`)
        .join(',\n')
);

const ALL_ROLES = ROLES.map(([ role ]) => role);

const toScssMap = ({ id, seed, isDark, variant }) => (
    `// ${id}: seed ${seed}, ${variant}, ${isDark ? 'dark' : 'light'}\n`
    + `$${id}: (\n${toScssEntries(createScheme(seed, isDark, variant), ALL_ROLES)}\n);\n`
);

const toAccentScssMaps = ({ id, seed }) => [ true, false ].map(isDark => {
    const brightness = isDark ? 'dark' : 'light';
    return `// accent ${id}: seed ${seed}, ${ACCENT_VARIANT}, ${brightness}\n`
        + `$accent-${id}-${brightness}: (\n${toScssEntries(createScheme(seed, isDark, ACCENT_VARIANT), ACCENT_ROLES)}\n);\n`;
}).join('\n');

const toAccentLookup = () => {
    const entries = ACCENTS.map(({ id }) => `    '${id}': ('dark': $accent-${id}-dark, 'light': $accent-${id}-light)`);
    return `$accent-schemes: (\n${entries.join(',\n')}\n);\n`;
};

/** Returns a SCSS map of theme id to a value. */
const toScssLookup = (name, getValue) => {
    const entries = THEMES.map(theme => `    '${theme.id}': ${getValue(theme)}`);
    return `$${name}: (\n${entries.join(',\n')}\n);\n`;
};

const output = [
    '// GENERATED FILE. DO NOT EDIT.',
    '// Run `node scripts/generate-md3-tokens.mjs` to regenerate.',
    '',
    ...THEMES.map(toScssMap),
    '/// All color schemes by theme id.',
    toScssLookup('schemes', ({ id }) => '$' + id),
    '/// Whether each theme uses a dark color scheme.',
    toScssLookup('is-dark', ({ isDark }) => String(isDark)),
    ...ACCENTS.map(toAccentScssMaps),
    '/// The accent roles of every accent, by accent id and brightness.',
    toAccentLookup()
].join('\n');

writeFileSync(OUTPUT_FILE, output);
console.info(`Wrote ${THEMES.length} MD3 color schemes and ${ACCENTS.length} accents to ${OUTPUT_FILE}`);

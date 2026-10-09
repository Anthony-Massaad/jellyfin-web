import type { Components, CssVarsTheme, Theme } from '@mui/material/styles';

/**
 * Material Design 3 overrides for MUI components.
 *
 * Every style is nested under the MD3 scope selector so the dashboard, which shares this MUI theme, is not affected.
 * Colors come from the `--jf-palette-*` variables, which styles/md3/_roots.scss maps to MD3 roles inside the scope,
 * so these overrides only need to handle shape, typography, elevation, and the MD3 color roles MUI does not model.
 */

/** The MD3 scope selector for use in MUI style overrides. */
export const MD3 = '[data-md3] &';

/** Returns a CSS variable reference for an MD3 color role. */
export const mdColor = (role: string, alpha?: number) => (
    alpha === undefined ? `var(--md-sys-color-${role})` : `rgba(var(--md-sys-color-${role}-rgb), ${alpha})`
);

/** Returns a CSS variable reference for an MD3 shape size. */
export const mdShape = (size: 'none' | 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large' | 'full') => (
    `var(--md-sys-shape-corner-${size})`
);

/** Returns a CSS transition value using MD3 motion tokens. */
export const mdTransition = (properties: string[], duration = 'short4', easing = 'standard') => (
    properties
        .map(property => `${property} var(--md-sys-motion-duration-${duration}) var(--md-sys-motion-easing-${easing})`)
        .join(', ')
);

/**
 * Returns the styles of a glass surface: a translucent tonal color with a background blur, or the opaque tonal color
 * where backdrop-filter is not supported. Mirrors the `glass` mixin in styles/md3/_functions.scss.
 */
export const glass = (role: string, alpha: number, blur = 24) => ({
    backgroundColor: mdColor(role),
    '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))': {
        backgroundColor: mdColor(role, alpha),
        backdropFilter: `blur(${blur}px) saturate(1.6)`
    }
});

/** Pill radius of buttons at rest and while pressed (MD3 Expressive shape morph). */
const SHAPE_MORPH_REST = '2em';
const SHAPE_MORPH_PRESSED = '0.75em';

const MEDIUM_FONT = 'var(--md-sys-typescale-font-medium, inherit)';

const LABEL_LARGE = {
    fontFamily: MEDIUM_FONT,
    fontSize: '0.875rem',
    fontWeight: 500,
    letterSpacing: '0.007em',
    lineHeight: '1.25rem'
};

const BODY_SMALL = {
    fontSize: '0.75rem',
    letterSpacing: '0.033em',
    lineHeight: '1rem'
};

export const MD3_COMPONENTS: Components<Omit<Theme, 'components' | 'palette'> & CssVarsTheme> = {
    MuiAppBar: {
        styleOverrides: {
            root: {
                [MD3]: {
                    boxShadow: 'none',
                    backgroundImage: 'none'
                }
            },
            colorDefault: {
                [MD3]: {
                    ...glass('surface-container', 0.72),
                    color: mdColor('on-surface')
                }
            }
        }
    },
    MuiButton: {
        styleOverrides: {
            root: {
                [MD3]: {
                    ...LABEL_LARGE,
                    // Shape morph: a finite radius so the corners animate smoothly while pressed
                    borderRadius: SHAPE_MORPH_REST,
                    minHeight: 40,
                    paddingLeft: 24,
                    paddingRight: 24,
                    boxShadow: 'none',
                    transition: `${mdTransition([ 'background-color', 'box-shadow', 'color' ])}, ${mdTransition([ 'border-radius' ], 'medium2', 'expressive-spatial')}`,
                    '&:hover, &:active, &.Mui-focusVisible': {
                        boxShadow: 'none'
                    },
                    '&:active': {
                        borderRadius: SHAPE_MORPH_PRESSED
                    }
                }
            },
            // Filled button: hovering lightens it with an accent glow (like the legacy filled buttons) instead of MUI's
            // darker primary
            containedPrimary: {
                [MD3]: {
                    transition: `${mdTransition([ 'background-color', 'box-shadow', 'color', 'filter' ])}, ${mdTransition([ 'border-radius' ], 'medium2', 'expressive-spatial')}`,
                    '&:hover': {
                        backgroundColor: mdColor('primary')
                    },
                    '@media (hover: hover) and (pointer: fine)': {
                        '&:hover': {
                            boxShadow: `0 6px 18px -4px ${mdColor('primary', 0.55)}`,
                            filter: 'brightness(1.1)'
                        }
                    }
                }
            },
            // Filled tonal button
            containedInherit: {
                [MD3]: {
                    backgroundColor: mdColor('secondary-container'),
                    color: mdColor('on-secondary-container'),
                    '&:hover': {
                        backgroundColor: mdColor('secondary-container'),
                        backgroundImage: `linear-gradient(${mdColor('on-secondary-container', 0.08)}, ${mdColor('on-secondary-container', 0.08)})`
                    }
                }
            },
            outlined: {
                [MD3]: {
                    borderColor: mdColor('outline')
                }
            },
            text: {
                [MD3]: {
                    paddingLeft: 12,
                    paddingRight: 12
                }
            },
            sizeSmall: {
                [MD3]: {
                    minHeight: 32,
                    paddingLeft: 16,
                    paddingRight: 16
                }
            }
        }
    },
    // MD3 uses separate buttons with a small gap instead of joined button groups
    MuiButtonGroup: {
        styleOverrides: {
            root: {
                [MD3]: {
                    boxShadow: 'none',
                    borderRadius: 0,
                    alignItems: 'center',
                    gap: 8,
                    '& .MuiButtonGroup-grouped': {
                        borderRadius: SHAPE_MORPH_REST,
                        margin: 0,
                        minHeight: 40,
                        '&:active': {
                            borderRadius: SHAPE_MORPH_PRESSED
                        }
                    },
                    // No dividers between the buttons
                    '& .MuiButtonGroup-groupedText, & .MuiButtonGroup-groupedContained': {
                        border: 0
                    },
                    // Icon-only text buttons (filter, sort, view, paging) are round 40px targets
                    '& .MuiButtonGroup-groupedText': {
                        minWidth: 40,
                        paddingLeft: 8,
                        paddingRight: 8,
                        color: mdColor('on-surface-variant'),
                        '&:hover': {
                            backgroundColor: mdColor('on-surface', 0.08),
                            color: mdColor('on-surface')
                        }
                    },
                    '& .MuiButtonGroup-groupedContained': {
                        paddingLeft: 20,
                        paddingRight: 20
                    }
                }
            }
        }
    },
    MuiChip: {
        styleOverrides: {
            root: {
                [MD3]: {
                    ...LABEL_LARGE,
                    borderRadius: mdShape('small'),
                    height: 32
                }
            },
            outlined: {
                [MD3]: {
                    borderColor: mdColor('outline')
                }
            },
            filled: {
                [MD3]: {
                    backgroundColor: mdColor('secondary-container'),
                    color: mdColor('on-secondary-container')
                }
            }
        }
    },
    MuiDialog: {
        styleOverrides: {
            paper: {
                [MD3]: {
                    ...glass('surface-container-high', 0.86, 32),
                    backgroundImage: 'none',
                    borderRadius: mdShape('extra-large'),
                    boxShadow: 'var(--md-sys-elevation-level3)'
                }
            }
        }
    },
    MuiDialogTitle: {
        styleOverrides: {
            root: {
                [MD3]: {
                    fontSize: '1.5rem',
                    fontWeight: 400,
                    lineHeight: '2rem',
                    color: mdColor('on-surface')
                }
            }
        }
    },
    MuiDrawer: {
        styleOverrides: {
            paper: {
                [MD3]: {
                    backgroundColor: mdColor('surface-container-low'),
                    backgroundImage: 'none',
                    borderRight: 'none'
                }
            },
            modal: {
                [MD3]: {
                    '& .MuiDrawer-paper': {
                        borderTopRightRadius: mdShape('large'),
                        borderBottomRightRadius: mdShape('large')
                    }
                }
            }
        }
    },
    MuiFilledInput: {
        styleOverrides: {
            root: {
                [MD3]: {
                    backgroundColor: mdColor('surface-container-highest'),
                    borderTopLeftRadius: mdShape('extra-small'),
                    borderTopRightRadius: mdShape('extra-small'),
                    '&:hover': {
                        backgroundColor: mdColor('surface-container-highest'),
                        backgroundImage: `linear-gradient(${mdColor('on-surface', 0.08)}, ${mdColor('on-surface', 0.08)})`
                    },
                    '&.Mui-focused': {
                        backgroundColor: mdColor('surface-container-highest')
                    },
                    '&::before': {
                        borderBottomColor: mdColor('on-surface-variant')
                    }
                }
            }
        }
    },
    MuiIconButton: {
        styleOverrides: {
            root: {
                [MD3]: {
                    transition: `${mdTransition([ 'background-color', 'color' ])}, ${mdTransition([ 'border-radius' ], 'medium2', 'expressive-spatial')}`,
                    '&:active': {
                        borderRadius: '30%'
                    }
                }
            }
        }
    },
    MuiListItemButton: {
        styleOverrides: {
            root: {
                [MD3]: {
                    '&.Mui-selected, &.Mui-selected:hover': {
                        backgroundColor: mdColor('secondary-container'),
                        color: mdColor('on-secondary-container')
                    }
                }
            }
        }
    },
    MuiMenu: {
        styleOverrides: {
            paper: {
                [MD3]: {
                    ...glass('surface-container', 0.62, 28),
                    backgroundImage: 'none',
                    borderRadius: mdShape('large'),
                    boxShadow: `var(--md-sys-elevation-level2), inset 0 0 0 1px ${mdColor('outline-variant', 0.35)}`,
                    minWidth: 200
                }
            },
            list: {
                [MD3]: {
                    padding: '8px 0'
                }
            }
        }
    },
    // Menu items: rounded and inset from the menu edges, with a tonal selected state
    MuiMenuItem: {
        styleOverrides: {
            root: {
                [MD3]: {
                    ...LABEL_LARGE,
                    fontSize: '0.9375rem',
                    minHeight: 48,
                    margin: '0 8px',
                    paddingLeft: 12,
                    paddingRight: 16,
                    borderRadius: mdShape('medium'),
                    color: mdColor('on-surface'),
                    transition: `${mdTransition([ 'background-color', 'color' ], 'medium2', 'expressive-effects')}, ${mdTransition([ 'border-radius' ], 'medium2', 'expressive-spatial')}`,
                    '&:hover': {
                        backgroundColor: mdColor('on-surface', 0.08)
                    },
                    '&:active': {
                        borderRadius: mdShape('large')
                    },
                    '&.Mui-focusVisible': {
                        backgroundColor: mdColor('on-surface', 0.1)
                    },
                    '&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': {
                        backgroundColor: mdColor('secondary-container'),
                        color: mdColor('on-secondary-container')
                    },
                    '& .MuiListItemIcon-root': {
                        color: mdColor('on-surface-variant'),
                        minWidth: 40
                    },
                    '&.Mui-selected .MuiListItemIcon-root': {
                        color: mdColor('on-secondary-container')
                    },
                    // Dividers between groups of items
                    '& + .MuiDivider-root': {
                        margin: '8px 16px',
                        borderColor: mdColor('outline-variant', 0.6)
                    }
                }
            }
        }
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                [MD3]: {
                    backgroundImage: 'none'
                }
            },
            rounded: {
                [MD3]: {
                    borderRadius: mdShape('medium')
                }
            }
        }
    },
    MuiSlider: {
        styleOverrides: {
            rail: {
                [MD3]: {
                    backgroundColor: mdColor('secondary-container'),
                    opacity: 1
                }
            },
            thumb: {
                [MD3]: {
                    boxShadow: 'none',
                    '&:hover, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 10px ${mdColor('primary', 0.12)}`
                    }
                }
            }
        }
    },
    MuiSnackbarContent: {
        styleOverrides: {
            root: {
                [MD3]: {
                    backgroundColor: mdColor('inverse-surface'),
                    color: mdColor('inverse-on-surface'),
                    borderRadius: mdShape('extra-small'),
                    boxShadow: 'var(--md-sys-elevation-level3)'
                }
            }
        }
    },
    MuiSwitch: {
        styleOverrides: {
            track: {
                [MD3]: {
                    borderRadius: mdShape('full'),
                    opacity: 1,
                    backgroundColor: mdColor('surface-container-highest'),
                    border: `2px solid ${mdColor('outline')}`,
                    boxSizing: 'border-box'
                }
            },
            thumb: {
                [MD3]: {
                    boxShadow: 'none'
                }
            },
            switchBase: {
                [MD3]: {
                    color: mdColor('outline'),
                    '&.Mui-checked': {
                        color: mdColor('on-primary')
                    },
                    '&.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: mdColor('primary'),
                        borderColor: mdColor('primary'),
                        opacity: 1
                    }
                }
            }
        }
    },
    MuiTab: {
        styleOverrides: {
            root: {
                [MD3]: {
                    ...LABEL_LARGE,
                    minHeight: 48,
                    color: mdColor('on-surface-variant'),
                    '&.Mui-selected': {
                        color: mdColor('primary')
                    }
                }
            }
        }
    },
    MuiTabs: {
        styleOverrides: {
            indicator: {
                [MD3]: {
                    height: 3,
                    borderTopLeftRadius: 3,
                    borderTopRightRadius: 3
                }
            }
        }
    },
    MuiToggleButton: {
        styleOverrides: {
            root: {
                [MD3]: {
                    ...LABEL_LARGE,
                    borderColor: mdColor('outline'),
                    '&.Mui-selected, &.Mui-selected:hover': {
                        backgroundColor: mdColor('secondary-container'),
                        color: mdColor('on-secondary-container')
                    }
                }
            }
        }
    },
    MuiToggleButtonGroup: {
        styleOverrides: {
            root: {
                [MD3]: {
                    borderRadius: mdShape('full'),
                    '& .MuiToggleButtonGroup-firstButton': {
                        borderTopLeftRadius: mdShape('full'),
                        borderBottomLeftRadius: mdShape('full')
                    },
                    '& .MuiToggleButtonGroup-lastButton': {
                        borderTopRightRadius: mdShape('full'),
                        borderBottomRightRadius: mdShape('full')
                    }
                }
            }
        }
    },
    MuiTooltip: {
        styleOverrides: {
            tooltip: {
                [MD3]: {
                    ...BODY_SMALL,
                    backgroundColor: mdColor('inverse-surface'),
                    color: mdColor('inverse-on-surface'),
                    borderRadius: mdShape('extra-small')
                }
            }
        }
    }
};

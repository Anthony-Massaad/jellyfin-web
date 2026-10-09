// @vitest-environment node
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss, { type Rule } from 'postcss';
import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';

const MD3_DIR = resolve(__dirname);
const COMPONENTS = readdirSync(resolve(MD3_DIR, 'components'))
    .filter(file => file.startsWith('_') && file.endsWith('.scss'))
    .map(file => file.slice(1, -'.scss'.length));
const THEMES_DIR = resolve(__dirname, '../../themes');
const THEMES = readdirSync(THEMES_DIR)
    .filter(name => !name.startsWith('_') && existsSync(resolve(THEMES_DIR, name, 'theme.scss')));

const compile = (source: string) => compileString(source, {
    loadPaths: [ MD3_DIR ],
    silenceDeprecations: [ 'import' ]
}).css;

/** Returns the selectors of all style rules, ignoring keyframe steps. */
const getSelectors = (css: string) => {
    const selectors: string[] = [];

    postcss.parse(css).walkRules((rule: Rule) => {
        if (rule.parent?.type === 'atrule' && (rule.parent as { name?: string }).name?.endsWith('keyframes')) return;
        selectors.push(...rule.selectors);
    });

    return selectors;
};

describe('MD3 styles', () => {
    it.each(COMPONENTS)('should scope every rule in components/%s', component => {
        const css = compile(`@use 'functions' with ($theme: 'dark');\n@use 'components/${component}';`);
        const unscoped = getSelectors(css)
            .filter(selector => !/^(html)?\[data-md3\]/.test(selector));

        expect(unscoped).toEqual([]);
    });

    // Legacy TV browsers (Chrome < 49) drop declarations that use var(), so each one needs a static fallback first
    it.each(COMPONENTS)('should provide static fallbacks for custom properties in components/%s', component => {
        const css = compile(`@use 'functions' with ($theme: 'dark');\n@use 'components/${component}';`);
        const missing: string[] = [];

        postcss.parse(css).walkDecls(decl => {
            // Inherited font families degrade gracefully without a fallback, and custom property definitions are only
            // read through var(), whose uses have their own fallbacks
            if (!decl.value.includes('var(--md-sys-') || decl.prop === 'font-family' || decl.prop.startsWith('--')) return;

            const previous = decl.prev();
            const hasFallback = previous?.type === 'decl'
                && previous.prop === decl.prop
                && !previous.value.includes('var(');

            if (!hasFallback) missing.push(`${(decl.parent as Rule).selector} { ${decl.prop} }`);
        });

        expect(missing).toEqual([]);
    });

    it('should only define --md-sys properties outside of the scope', () => {
        const css = compile('@use "functions" with ($theme: "dark");\n@use "roots";');
        const root = postcss.parse(css);
        const invalid: string[] = [];

        root.walkDecls(decl => {
            const selector = (decl.parent as Rule).selector;
            if (selector === ':root' && !decl.prop.startsWith('--md-sys-')) {
                invalid.push(decl.prop);
            } else if (selector !== ':root' && !selector.startsWith('html[data-md3]')) {
                invalid.push(`${selector} ${decl.prop}`);
            }
        });

        expect(invalid).toEqual([]);
    });

    it.each(THEMES)('should include the MD3 layer in the %s theme', theme => {
        const css = compile(`@use 'functions' with ($theme: '${theme}');\n@use 'roots';`);
        expect(css).toContain('--md-sys-color-primary:');
    });
});

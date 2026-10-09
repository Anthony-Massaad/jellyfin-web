import React, { type ChangeEvent, type FC, useCallback, useEffect } from 'react';

import globalize from 'lib/globalize';
import { ACCENT_NAME_KEYS, ACCENTS, applyAccent, isAccentSupported } from 'scripts/accent';
import { currentSettings as userSettings } from 'scripts/settings/userSettings';

interface AccentPickerProps {
    /** The selected accent id, or an empty string for the theme default. */
    value: string
    onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

const OPTIONS = [
    { id: '', nameKey: 'AccentThemeDefault', colorClass: 'accentSwatch-color-default' },
    ...ACCENTS.map(id => ({ id, nameKey: ACCENT_NAME_KEYS[id], colorClass: `accentSwatch-color-${id}` }))
];

/**
 * Accent color swatches (styles/md3/components/_settings.scss). A native radio group, so arrow keys, screen readers
 * and the form's change handler work as usual. The choice is previewed right away and saved with the form.
 */
const AccentPicker: FC<AccentPickerProps> = ({ value, onChange }) => {
    const onAccentChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        applyAccent(e.target.value);
        onChange(e);
    }, [ onChange ]);

    // Restore the saved accent when leaving the page without saving
    useEffect(() => () => {
        applyAccent(userSettings.accent());
    }, []);

    if (!isAccentSupported()) return null;

    return (
        <fieldset className='accentPicker'>
            <legend className='accentPicker-label'>{globalize.translate('LabelAccentColor')}</legend>
            <div className='accentPicker-swatches'>
                {OPTIONS.map(({ id, nameKey, colorClass }) => {
                    const name = globalize.translate(nameKey);

                    return (
                        <label key={id || 'default'} className='accentSwatch' title={name}>
                            <input
                                type='radio'
                                className='accentSwatch-input'
                                name='accent'
                                value={id}
                                checked={value === id}
                                onChange={onAccentChange}
                                aria-label={name}
                            />
                            <span className={`accentSwatch-color ${colorClass}`} aria-hidden='true'>
                                <span className='accentSwatch-check material-icons check' />
                            </span>
                        </label>
                    );
                })}
            </div>
            <p className='accentPicker-help'>{globalize.translate('LabelAccentColorHelp')}</p>
        </fieldset>
    );
};

export default AccentPicker;

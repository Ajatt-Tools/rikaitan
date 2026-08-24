/*
 * Copyright (C) 2026  Ajatt-Tools and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {describe, expect, test, vi} from 'vitest';
import {GenericSettingController} from '../ext/js/pages/settings/generic-setting-controller.js';
import {createDomTest, setupDomTest} from './fixtures/dom-test.js';
import {MutableSettingsController} from './fixtures/mutable-settings-controller.js';

const domTest = createDomTest('ext/settings.html');

/**
 * Runs a parameterized test with the same settings DOM lifecycle as domTest.
 * @param {(window: import('jsdom').DOMWindow) => Promise<void>} callback
 * @returns {Promise<void>}
 */
async function withSettingsDom(callback) {
    const {window, teardown} = await setupDomTest('ext/settings.html');
    try {
        await callback(window);
    } finally {
        // Standard test.each does not support createDomTest's extended fixtures.
        await teardown(global);
    }
}

/**
 * Loads the generic settings binder with the supplied search-window values.
 * @param {boolean} enabled
 * @returns {Promise<{dispose: () => void, modifySettings: import('vitest').Mock}>}
 */
async function prepareGenericSettingController(enabled) {
    const settingsController = new MutableSettingsController({
        'general.openSearchPageInNewWindow': enabled,
        'general.searchPageWindowType': 'popup',
        'general.searchPageWindowState': 'maximized',
    });
    const genericSettingController = new GenericSettingController(settingsController.createDependency());
    await genericSettingController.prepare();
    await genericSettingController.refresh();
    return {
        dispose: () => {
            // Disconnect before the DOM fixture removes its browser globals.
            // eslint-disable-next-line no-underscore-dangle
            genericSettingController._dataBinder.disconnect();
        },
        modifySettings: settingsController.modifySettings,
    };
}

describe('Search Window settings visibility', () => {
    domTest('keeps the sidebar link and section visible in basic mode', ({window}) => {
        const {document} = window;
        const sidebarLink = document.querySelector('.sidebar a[href="#window"]');
        const section = document.querySelector('#window')?.closest('.heading-container');
        // Scope the query to prevent the heading anchor from masking a missing sidebar link.
        expect(sidebarLink).not.toBeNull();
        expect(sidebarLink?.classList.contains('advanced-only')).toBe(false);
        expect(section?.classList.contains('advanced-only')).toBe(false);
    });

    domTest('keeps pre-existing Search Window controls advanced-only', ({window}) => {
        const {document} = window;
        const controlSelectors = [
            '[data-setting="general.stickySearchHeader"]',
            '[data-setting="general.usePopupWindow"]',
            '[data-setting="popupWindow.width"]',
            '[data-setting="popupWindow.height"]',
            '[data-setting="popupWindow.left"]',
            '[data-setting="popupWindow.useLeft"]',
            '[data-setting="popupWindow.top"]',
            '[data-setting="popupWindow.useTop"]',
            '[data-setting="popupWindow.windowType"]',
            '[data-setting="popupWindow.windowState"]',
        ];
        const testWindowLink = document.querySelector('#test-window-open-link');
        expect(testWindowLink?.closest('.heading-container-right')?.classList.contains('advanced-only')).toBe(true);
        for (const selector of controlSelectors) {
            const control = document.querySelector(selector);
            expect(control?.closest('.settings-group')?.classList.contains('advanced-only')).toBe(true);
        }
    });

    domTest('renders all basic Search Window controls', ({window}) => {
        const {document} = window;
        for (const {setting, tagName, values} of [
            {setting: 'general.openSearchPageInNewWindow', tagName: 'INPUT', values: []},
            {setting: 'general.searchPageWindowType', tagName: 'SELECT', values: ['normal', 'popup']},
            {setting: 'general.searchPageWindowState', tagName: 'SELECT', values: ['normal', 'maximized', 'fullscreen']},
        ]) {
            const control = document.querySelector(`[data-setting="${setting}"]`);
            expect(control?.tagName).toBe(tagName);
            expect(control?.closest('.settings-group')?.classList.contains('advanced-only')).toBe(false);
            expect([...control?.querySelectorAll('option') ?? []].map(({value}) => value)).toStrictEqual(values);
        }
    });

    test.each([
        {name: 'enabled', enabled: true, hidden: false},
        {name: 'disabled', enabled: false, hidden: true},
    ])('initially $name shows window style controls only when dedicated windows are enabled', async ({enabled, hidden}) => {
        await withSettingsDom(async (window) => {
            const {document} = window;
            const {dispose} = await prepareGenericSettingController(enabled);
            try {
                const toggle = document.querySelector('[data-setting="general.openSearchPageInNewWindow"]');
                expect(toggle?.getAttribute('type')).toBe('checkbox');
                const styleContainer = /** @type {HTMLElement} */ (document.querySelector('#search-page-window-style-container'));
                expect(styleContainer.hidden).toBe(hidden);
                expect(/** @type {HTMLInputElement} */ (toggle).checked).toBe(enabled);
                const windowType = /** @type {HTMLSelectElement} */ (document.querySelector('[data-setting="general.searchPageWindowType"]'));
                const windowState = /** @type {HTMLSelectElement} */ (document.querySelector('[data-setting="general.searchPageWindowState"]'));
                expect(windowType.value).toBe('popup');
                expect(windowState.value).toBe('maximized');
            } finally {
                // Disconnect even when an initial binding assertion fails before DOM teardown.
                dispose();
            }
        });
    });

    domTest('updates window-style visibility and persists the setting after toggling the checkbox', async ({window}) => {
        const {document} = window;
        const {dispose, modifySettings} = await prepareGenericSettingController(true);
        const toggle = /** @type {HTMLInputElement} */ (document.querySelector('[data-setting="general.openSearchPageInNewWindow"]'));
        const container = /** @type {HTMLElement} */ (document.querySelector('#search-page-window-style-container'));

        try {
            toggle.checked = false;
            toggle.dispatchEvent(new Event('change'));
            await vi.waitFor(() => expect(modifySettings).toHaveBeenCalled());

            expect(container.hidden).toBe(true);
            expect(modifySettings).toHaveBeenCalledWith([{
                action: 'set',
                path: 'general.openSearchPageInNewWindow',
                scope: 'profile',
                optionsContext: null,
                value: false,
            }]);

            // A live false-to-true transition must reveal the controls after persistence.
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change'));
            await vi.waitFor(() => expect(modifySettings).toHaveBeenCalledTimes(2));

            expect(container.hidden).toBe(false);
            expect(modifySettings).toHaveBeenLastCalledWith([{
                action: 'set',
                path: 'general.openSearchPageInNewWindow',
                scope: 'profile',
                optionsContext: null,
                value: true,
            }]);
        } finally {
            // Event listeners must not outlive an assertion failure in this DOM fixture.
            dispose();
        }
    });

    test.each([
        {setting: 'general.searchPageWindowType', value: 'normal'},
        {setting: 'general.searchPageWindowState', value: 'fullscreen'},
    ])('persists $setting through the generic settings binder', async ({setting, value}) => {
        await withSettingsDom(async (window) => {
            const {document} = window;
            const {dispose, modifySettings} = await prepareGenericSettingController(true);
            const control = /** @type {HTMLSelectElement} */ (document.querySelector(`[data-setting="${setting}"]`));
            try {
                control.value = value;
                control.dispatchEvent(new Event('change'));
                await vi.waitFor(() => expect(modifySettings).toHaveBeenCalledTimes(1));

                expect(modifySettings).toHaveBeenCalledWith([{
                    action: 'set',
                    path: setting,
                    scope: 'profile',
                    optionsContext: null,
                    value,
                }]);
            } finally {
                // Disconnect before the DOM fixture removes the browser globals after a failed assertion.
                dispose();
            }
        });
    });

    domTest('keeps scan-popup geometry controls out of the basic Search Window group', ({window}) => {
        const {document} = window;
        const toggle = document.querySelector('[data-setting="general.openSearchPageInNewWindow"]');
        const basicGroup = toggle?.closest('.settings-group');
        const geometryControls = basicGroup?.querySelectorAll('[data-setting^="popupWindow."]');
        expect([...geometryControls ?? []]).toStrictEqual([]);
    });
});

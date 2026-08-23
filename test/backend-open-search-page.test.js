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

import {afterEach, describe, expect, test, vi} from 'vitest';
import {Backend} from '../ext/js/background/backend.js';

/* eslint-disable jsdoc/no-undefined-types */

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

/**
 * Creates a backend shell with only the dependencies needed by these tests.
 * @param {object} overrides
 * @returns {Backend}
 */
function createBackend(overrides) {
    // The command handler is tested without the Backend constructor's unrelated setup.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const backend = /** @type {Backend} */ (Object.create(Backend.prototype));
    Object.assign(backend, overrides);
    return backend;
}

/**
 * Creates the common browser and controller dependencies for a command test.
 * @param {object} [overrides]
 * @returns {{
 *     backend: Backend,
 *     createTab: import('vitest').Mock,
 *     createSearchTabOrWindow: import('vitest').Mock,
 * }}
 */
function createCommandTestContext(overrides = {}) {
    vi.stubGlobal('chrome', {runtime: {getURL: vi.fn(() => 'chrome-extension://test/search.html')}});
    const createTab = vi.fn(async () => {});
    const createSearchTabOrWindow = vi.fn(async () => {});
    return {
        backend: createBackend({
            _createTab: createTab,
            _searchPageWindowController: {createSearchTabOrWindow},
            ...overrides,
        }),
        createTab,
        createSearchTabOrWindow,
    };
}

/**
 * Creates a command backend using the constructor-created window controller
 * and Backend callback wrappers.
 * @param {{incognito?: unknown, optionsAvailable?: boolean, createWindow?: boolean, createWindowError?: object, updateWindowError?: object}} [options]
 * @returns {{backend: Backend, createTab: import('vitest').Mock, createWindow: import('vitest').Mock, updateWindow: import('vitest').Mock}}
 */
function createIntegratedCommandTestContext(options = {}) {
    const {incognito = false, optionsAvailable = true, createWindow = true, createWindowError, updateWindowError} = options;
    const createTab = vi.fn(
        /**
         * @param {chrome.tabs.CreateProperties} createProperties
         * @param {(tab: chrome.tabs.Tab) => void} callback
         * @returns {void}
         */
        (createProperties, callback) => {
            callback(/** @type {chrome.tabs.Tab} */ (/** @type {unknown} */ ({id: 1, url: createProperties.url})));
        },
    );
    const createWindowCallback = vi.fn(
        /**
         * @param {chrome.windows.CreateData} createData
         * @param {(window: chrome.windows.Window) => void} callback
         * @returns {void}
         */
        (createData, callback) => {
            chromeMock.runtime.lastError = createWindowError;
            callback(/** @type {chrome.windows.Window} */ (/** @type {unknown} */ ({id: 2, ...createData})));
            chromeMock.runtime.lastError = void 0;
        },
    );
    const updateWindow = vi.fn(
        /**
         * @param {number} windowId
         * @param {chrome.windows.UpdateInfo} updateInfo
         * @param {(window: chrome.windows.Window) => void} callback
         * @returns {void}
         */
        (windowId, updateInfo, callback) => {
            chromeMock.runtime.lastError = updateWindowError;
            void updateInfo;
            callback(/** @type {chrome.windows.Window} */ (/** @type {unknown} */ ({id: windowId})));
            chromeMock.runtime.lastError = void 0;
        },
    );
    const chromeMock = {
        runtime: {
            getURL: vi.fn(() => 'chrome-extension://test/search.html'),
            lastError: /** @type {object|undefined} */ (void 0),
        },
        tabs: {create: createTab},
        windows: {
            getLastFocused: (/** @type {unknown} */ windowOptions, /** @type {(window: chrome.windows.Window) => void} */ callback) => {
                void windowOptions;
                callback(/** @type {chrome.windows.Window} */ (/** @type {unknown} */ ({incognito})));
            },
            ...(createWindow ? {create: createWindowCallback} : {}),
            update: updateWindow,
        },
    };
    vi.stubGlobal('chrome', chromeMock);
    // Use the constructor so this test detects broken controller dependency wiring.
    const backend = new Backend(/** @type {import('../ext/js/extension/web-extension.js').WebExtension} */ ({}));
    /* eslint-disable no-underscore-dangle */
    if (optionsAvailable) {
        backend._options = /** @type {import('settings').Options} */ (/** @type {unknown} */ ({
            profileCurrent: 0,
            profiles: [{options: {
                general: {
                    openSearchPageInNewWindow: true,
                    searchPageWindowType: 'normal',
                    searchPageWindowState: updateWindowError ? 'maximized' : 'normal',
                },
            }}],
        }));
    }
    backend._findTabs = vi.fn(async () => null);
    /* eslint-enable no-underscore-dangle */
    return {backend, createTab, createWindow: createWindowCallback, updateWindow};
}

/* eslint-enable jsdoc/no-undefined-types */

describe('Backend._onCommandOpenSearchPage', () => {
    test.each([
        {
            name: 'newTab',
            mode: /** @type {import('backend').Mode} */ ('newTab'),
            overrides: {_normalizeOpenSettingsPageMode: vi.fn(() => 'newTab')},
            expectedTabCall: 'create',
        },
        {
            name: 'existingOrCurrentTab',
            mode: /** @type {import('backend').Mode} */ ('existingOrCurrentTab'),
            overrides: {
                _normalizeOpenSettingsPageMode: vi.fn(() => 'existingOrCurrentTab'),
                _findTabs: vi.fn(async () => null),
                _updateTab: vi.fn(async () => {}),
            },
            expectedTabCall: 'update',
        },
    ])('opens an explicit $name command in a tab when the window preference is enabled', async ({mode, overrides, expectedTabCall}) => {
        const {backend, createTab, createSearchTabOrWindow} = createCommandTestContext(overrides);

        // Explicitly tab-scoped commands must not inherit the default window behavior.
        // eslint-disable-next-line no-underscore-dangle
        await backend._onCommandOpenSearchPage({mode, query: 'query'});

        const url = 'chrome-extension://test/search.html?query=query';
        if (expectedTabCall === 'create') {
            expect(createTab).toHaveBeenCalledWith(url);
        } else {
            // eslint-disable-next-line no-underscore-dangle
            expect(overrides._updateTab).toHaveBeenCalledWith(url);
        }
        expect(createSearchTabOrWindow).not.toHaveBeenCalled();
    });

    test('delegates the parameterless default command to the search window controller when no search tab exists', async () => {
        const normalizeOpenSettingsPageMode = vi.fn();
        const {backend, createTab, createSearchTabOrWindow} = createCommandTestContext({
            _normalizeOpenSettingsPageMode: normalizeOpenSettingsPageMode,
            _findTabs: vi.fn(async () => null),
        });

        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(normalizeOpenSettingsPageMode).not.toHaveBeenCalled();
        expect(createSearchTabOrWindow).toHaveBeenCalledWith('chrome-extension://test/search.html');
        expect(createTab).not.toHaveBeenCalled();
    });

    test.each([
        {name: 'a regular window', incognito: false},
        {name: 'a private window', incognito: true},
    ])('opens a dedicated search window from $name through Backend callback wrappers', async ({incognito}) => {
        const {backend, createTab, createWindow} = createIntegratedCommandTestContext({incognito});

        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(createWindow).toHaveBeenCalledWith({
            url: 'chrome-extension://test/search.html', type: 'normal', state: 'normal', incognito,
        }, expect.any(Function));
        expect(createTab).not.toHaveBeenCalled();
    });

    test.each([
        {
            name: 'window creation reports a browser error',
            options: {createWindowError: {message: 'creation failed'}},
            windowCalls: 1,
        },
        // These must traverse Backend's callback wrappers, not just controller mocks.
        {name: 'the windows.create API is missing', options: {createWindow: false}, windowCalls: 0},
        {name: 'options are unavailable during service-worker startup', options: {optionsAvailable: false}, windowCalls: 0},
        {name: 'the private browsing context is malformed', options: {incognito: 'false'}, windowCalls: 0},
    ])('falls back to a tab when $name through Backend callback wrappers', async ({options, windowCalls}) => {
        const {backend, createTab, createWindow} = createIntegratedCommandTestContext(options);

        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(createTab).toHaveBeenCalledWith({url: 'chrome-extension://test/search.html'}, expect.any(Function));
        expect(createWindow).toHaveBeenCalledTimes(windowCalls);
    });

    test('does not open a fallback tab when applying the optional window state reports a browser error', async () => {
        const {backend, createTab, createWindow, updateWindow} = createIntegratedCommandTestContext({
            updateWindowError: {message: 'state update failed'},
        });

        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(createWindow).toHaveBeenCalledTimes(1);
        expect(updateWindow).toHaveBeenCalledTimes(1);
        expect(createTab).not.toHaveBeenCalled();
    });

    test.each([
        {
            name: 'search tab discovery fails',
            findTabs: vi.fn(async () => { throw new Error('tabs query failed'); }),
        },
        {
            name: 'focusing an existing search tab fails',
            findTabs: vi.fn(async () => ({tab: {id: 42}})),
            focusTab: vi.fn(async () => { throw new Error('tab focus failed'); }),
        },
        {
            name: 'updating an existing search query fails',
            findTabs: vi.fn(async () => ({tab: {id: 42}})),
            focusTab: vi.fn(async () => {}),
            updateSearchQuery: vi.fn(async () => { throw new Error('query update failed'); }),
        },
    ])('delegates to the controller when $name', async ({findTabs, focusTab, updateSearchQuery}) => {
        const {backend, createTab, createSearchTabOrWindow} = createCommandTestContext({
            _normalizeOpenSettingsPageMode: vi.fn(() => 'existingOrNewTab'),
            _findTabs: findTabs,
            _focusTab: focusTab,
            _updateSearchQuery: updateSearchQuery,
        });

        // eslint-disable-next-line no-underscore-dangle
        await backend._onCommandOpenSearchPage({mode: 'existingOrNewTab', query: 'query'});

        expect(createSearchTabOrWindow).toHaveBeenCalledWith('chrome-extension://test/search.html?query=query');
        expect(createTab).not.toHaveBeenCalled();
    });

    test('focuses an existing search tab and updates its query', async () => {
        const focusTab = vi.fn(async () => {});
        const updateSearchQuery = vi.fn(async () => {});
        const {backend, createSearchTabOrWindow} = createCommandTestContext({
            _normalizeOpenSettingsPageMode: vi.fn(() => 'existingOrNewTab'),
            _findTabs: vi.fn(async () => ({tab: {id: 42}})),
            _focusTab: focusTab,
            _updateSearchQuery: updateSearchQuery,
        });
        // eslint-disable-next-line no-underscore-dangle
        await backend._onCommandOpenSearchPage({mode: 'existingOrNewTab', query: 'query'});

        expect(focusTab).toHaveBeenCalledWith({id: 42});
        expect(updateSearchQuery).toHaveBeenCalledWith(42, 'query', true);
        expect(createSearchTabOrWindow).not.toHaveBeenCalled();
    });

    test('discovers and focuses an ordinary search page after it moves to another window', async () => {
        const focusTab = vi.fn(async () => {});
        const updateSearchQuery = vi.fn(async () => {});
        const {backend, createSearchTabOrWindow} = createCommandTestContext({
            _normalizeOpenSettingsPageMode: vi.fn(() => 'existingOrNewTab'),
            _focusTab: focusTab,
            _updateSearchQuery: updateSearchQuery,
            // Keep discovery real so the command remains protected against a future current-window query.
            _getTabUrl: vi.fn(async (tabId) => {
                return tabId === 42 ? 'https://extension.test/search.html' : 'https://example.invalid/';
            }),
        });
        /** @type {import('vitest').Mock} */ (chrome.runtime.getURL).mockReturnValue('https://extension.test/search.html');
        const queryTabs = vi.fn((queryInfo, callback) => {
            // Different window IDs prove discovery is not scoped to the command's source window.
            callback([
                {id: 1, windowId: 1},
                {id: 42, windowId: 99},
            ]);
            void queryInfo;
        });
        // This is intentionally callback-only: Backend must support browsers without the Promise overload.
        chrome.tabs = /** @type {import('core').SafeAny} */ ({query: queryTabs});

        // eslint-disable-next-line no-underscore-dangle
        await backend._onCommandOpenSearchPage({mode: 'existingOrNewTab'});

        expect(queryTabs).toHaveBeenCalledWith({}, expect.any(Function));
        expect(focusTab).toHaveBeenCalledWith({id: 42, windowId: 99});
        expect(updateSearchQuery).not.toHaveBeenCalled();
        expect(createSearchTabOrWindow).not.toHaveBeenCalled();
    });
});

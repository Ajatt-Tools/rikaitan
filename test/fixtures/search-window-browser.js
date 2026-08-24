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

import {vi} from 'vitest';

/**
 * @typedef {object} SearchWindowBrowserOptions
 * @property {unknown} [incognito]
 * @property {unknown} [lastFocusedWindowResult]
 * @property {boolean} [getLastFocused]
 * @property {object} [getLastFocusedError]
 * @property {boolean} [createWindow]
 * @property {object} [createWindowError]
 * @property {boolean} [updateWindow]
 * @property {object} [updateWindowError]
 * @property {unknown} [windowResult]
 */

// Both unit and Backend seam tests must reject every non-boolean privacy result.
export const malformedPrivateBrowsingContexts = Object.freeze([null, void 0, 0, 'false']);

/**
 * @typedef {object} SearchWindowBrowserMock
 * @property {{getURL: import('vitest').Mock, lastError: object|undefined}} runtime
 * @property {{create?: import('vitest').Mock}} tabs
 * @property {{getLastFocused?: import('vitest').Mock, update?: import('vitest').Mock, create?: import('vitest').Mock}} windows
 */

/**
 * Invokes a Chrome callback after temporarily exposing a runtime error.
 * @param {{runtime: {lastError: object|undefined}}} chromeMock
 * @param {object|undefined} error
 * @param {(result: unknown) => void} callback
 * @param {unknown} result
 * @returns {void}
 */
function invokeCallback(chromeMock, error, callback, result) {
    chromeMock.runtime.lastError = error;
    callback(result);
    chromeMock.runtime.lastError = void 0;
}

/**
 * Returns a browser response unless a scenario provides a malformed result.
 * @param {SearchWindowBrowserOptions} options
 * @param {{url?: string}} createData
 * @returns {unknown}
 */
function createdWindowResult(options, createData) {
    if (Object.hasOwn(options, 'windowResult')) { return options.windowResult; }
    return {id: 2, ...createData};
}

/**
 * Returns the configured last-focused window response without normalizing
 * malformed private-browsing data that must exercise the fallback path.
 * @param {SearchWindowBrowserOptions} options
 * @returns {unknown}
 */
function lastFocusedWindowResult(options) {
    if (Object.hasOwn(options, 'lastFocusedWindowResult')) { return options.lastFocusedWindowResult; }
    if (Object.hasOwn(options, 'incognito')) { return {incognito: options.incognito}; }
    return {incognito: false};
}

/**
 * Creates callback-only browser APIs for search-window seam tests.
 * Callback APIs ensure Backend's compatibility wrappers remain exercised.
 * @param {SearchWindowBrowserOptions} [options]
 * @returns {{chromeMock: SearchWindowBrowserMock, createTab: import('vitest').Mock, createWindow: import('vitest').Mock, getLastFocused: import('vitest').Mock, updateWindow: import('vitest').Mock}}
 */
export function createSearchWindowBrowserMock(options = {}) {
    /** @type {SearchWindowBrowserMock} */
    const chromeMock = {runtime: {getURL: vi.fn(() => 'chrome-extension://test/search.html'), lastError: void 0}, tabs: {}, windows: {}};
    const createTab = vi.fn(
        /**
         * @param {{url?: string}} createData
         * @param {(result: unknown) => void} callback
         * @returns {void}
         */
        (createData, callback) => { callback({id: 1, url: createData.url}); },
    );
    const createWindow = vi.fn(
        /**
         * @param {{url?: string}} createData
         * @param {(result: unknown) => void} callback
         * @returns {void}
         */
        (createData, callback) => { invokeCallback(chromeMock, options.createWindowError, callback, createdWindowResult(options, createData)); },
    );
    const updateWindow = vi.fn(
        /**
         * @param {number} windowId
         * @param {unknown} updateInfo
         * @param {(result: unknown) => void} callback
         * @returns {void}
         */
        (windowId, updateInfo, callback) => {
            void updateInfo;
            invokeCallback(chromeMock, options.updateWindowError, callback, {id: windowId});
        },
    );
    const getLastFocused = vi.fn(
        /**
         * @param {unknown} windowOptions
         * @param {(result: unknown) => void} callback
         * @returns {void}
         */
        (windowOptions, callback) => {
            void windowOptions;
            invokeCallback(chromeMock, options.getLastFocusedError, callback, lastFocusedWindowResult(options));
        },
    );
    chromeMock.tabs.create = createTab;
    // Omit individual APIs to model partially implemented window namespaces.
    if (options.getLastFocused !== false) { chromeMock.windows.getLastFocused = getLastFocused; }
    if (options.updateWindow !== false) { chromeMock.windows.update = updateWindow; }
    if (options.createWindow !== false) { chromeMock.windows.create = createWindow; }
    // Expose this mock so a seam test verifies the callback-only privacy lookup contract.
    return {chromeMock, createTab, createWindow, getLastFocused, updateWindow};
}

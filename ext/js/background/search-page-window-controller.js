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

import {isObjectNotArray} from '../core/object-utilities.js';

/**
 * This class controls how the search page is opened in a new window and
 * falls back to a tab when window creation is unsupported.
 * The caller scans all windows for an existing page instead of tracking its
 * created tab or window; the narrow startup race is preferable to stale state
 * after users move the search-page tab between browser windows.
 */
export class SearchPageWindowController {
    /**
     * @param {import('search-page-window-controller').BackendDeps} deps
     */
    constructor(deps) {
        /** @type {import('search-page-window-controller').BackendDeps} */
        this._deps = deps;
    }

    /**
     * Opens the search page in a new tab, or in a new window when the
     * general.openSearchPageInNewWindow option is enabled.
     * @param {string} url
     * @returns {Promise<void>}
     */
    async createSearchTabOrWindow(url) {
        if (await this._tryCreateSearchWindow(url)) { return; }
        await this._deps.createTab(url);
    }

    // Private

    /**
     * Attempts to create the configured dedicated search window.
     * @param {string} url
     * @returns {Promise<boolean>}
     */
    async _tryCreateSearchWindow(url) {
        let general;
        try {
            ({general} = this._deps.getProfileOptions({current: true}, false));
        } catch (e) {
            // Keyboard commands can wake the service worker before options finish loading.
            return false;
        }
        if (!general.openSearchPageInNewWindow || !isObjectNotArray(chrome.windows)) {
            // Some platforms (for example, Firefox mobile) expose no usable window API.
            return false;
        }
        // API namespaces can be partially implemented; _createSearchWindow treats absent methods as a tab fallback.
        return this._createSearchWindow(url, general);
    }

    /**
     * Creates a search page window and applies its optional state.
     * @param {string} url
     * @param {import('search-page-window-controller').SearchPageWindowOptions} general
     * @returns {Promise<boolean>}
     */
    async _createSearchWindow(url, general) {
        /** @type {Pick<chrome.windows.Window, 'id'>|undefined} */
        let newWindow = void 0;
        try {
            // Create with the requested URL so fallback remains necessary only for create failures.
            const incognito = await this._getLastFocusedWindowIncognito();
            newWindow = await this._deps.createWindow(this._getSearchPageWindowCreateData(url, general, incognito));
        } catch (e) {
            return false;
        }
        if (typeof newWindow?.id === 'number') {
            try {
                await this._setSearchPageWindowState(newWindow.id, general.searchPageWindowState);
            } catch (e) {
                // The search page is already open, so state application is non-critical.
            }
        }
        return true;
    }

    /**
     * Builds the window creation data for a search page window.
     * The window type has its own setting, decoupled from the scan-popup window:
     * a 'popup' window floats (e.g. in tiling window managers like i3), which is
     * undesirable for the search page, so it defaults to 'normal' instead.
     * @param {string} url
     * @param {import('search-page-window-controller').SearchPageWindowOptions} general
     * @param {boolean} incognito
     * @returns {chrome.windows.CreateData}
     */
    _getSearchPageWindowCreateData(url, general, incognito) {
        return {
            url,
            type: general.searchPageWindowType,
            state: 'normal',
            incognito,
        };
    }

    /**
     * Gets the last-focused window whose private-browsing context is inherited.
     * @returns {Promise<chrome.windows.Window>}
     */
    _getLastFocusedWindow() {
        return new Promise((resolve, reject) => {
            chrome.windows.getLastFocused({}, (window) => {
                const error = chrome.runtime.lastError;
                if (error) {
                    reject(new Error(error.message));
                } else {
                    resolve(window);
                }
            });
        });
    }

    /**
     * Returns the last-focused window's verified private-browsing context.
     * @returns {Promise<boolean>}
     */
    async _getLastFocusedWindowIncognito() {
        const {incognito} = await this._getLastFocusedWindow();
        if (typeof incognito !== 'boolean') { throw new Error('The private browsing context is unavailable.'); }
        return incognito;
    }

    /**
     * Applies the configured non-normal state after creating the window.
     * @param {number} windowId
     * @param {import('settings').PopupWindowState} state
     * @returns {Promise<void>}
     */
    async _setSearchPageWindowState(windowId, state) {
        if (state !== 'normal') { await this._deps.updateWindow(windowId, {state}); }
    }
}

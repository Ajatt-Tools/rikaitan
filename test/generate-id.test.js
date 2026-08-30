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
import {generateId} from '../ext/js/core/utilities.js';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

/**
 * Creates a deterministic Web Crypto mock from a sequence of outcomes.
 * @param {(Uint8Array|Error)[]} outcomes
 * @param {Uint8Array[]} arrays
 * @returns {import('vitest').Mock<(array: Uint8Array) => Uint8Array>}
 * @throws {Error} When the configured outcome is an error.
 */
function createGetRandomValuesMock(outcomes, arrays) {
    return vi.fn((/** @type {Uint8Array} */ array) => {
        arrays.push(array);
        const outcome = outcomes[arrays.length - 1];
        if (outcome instanceof Error) { throw outcome; }
        array.set(outcome);
        return array;
    });
}

/**
 * Returns an error thrown synchronously by an action.
 * @param {() => unknown} action
 * @returns {unknown}
 * @throws {Error} If the action does not throw.
 */
function captureError(action) {
    try {
        action();
    } catch (error) {
        return error;
    }
    throw new Error('Expected the action to throw.');
}

describe('generateId', () => {
    const firstOperationError = new DOMException('first failure', 'OperationError');
    const secondOperationError = new DOMException('second failure', 'OperationError');
    const typeError = new TypeError('invalid random value request');

    test.each([
        {
            name: 'the first secure random request succeeds',
            outcomes: [new Uint8Array([0x00, 0x01, 0x0f, 0x10, 0xff])],
            length: 5,
            expectedId: '00010f10ff',
            expectedCalls: 1,
        },
        {
            name: 'an operation failure is followed by a successful retry',
            outcomes: [firstOperationError, new Uint8Array([0xab, 0xcd])],
            length: 2,
            expectedId: 'abcd',
            expectedCalls: 2,
            expectFreshRetryArray: true,
        },
        {
            name: 'both secure random requests report operation failures',
            outcomes: [firstOperationError, secondOperationError],
            length: 2,
            expectedErrorMessage: 'Secure random number generation failed. Restart the browser and try again.',
            expectedCause: secondOperationError,
            expectedCalls: 2,
            expectFreshRetryArray: true,
        },
        {
            name: 'the first secure random request reports a non-operation error',
            outcomes: [typeError],
            length: 2,
            expectedError: typeError,
            expectedCalls: 1,
        },
        {
            name: 'the retry reports a non-operation error',
            outcomes: [firstOperationError, typeError],
            length: 2,
            expectedError: typeError,
            expectedCalls: 2,
            expectFreshRetryArray: true,
        },
    ])('handles $name', (scenario) => {
        /** @type {Uint8Array[]} */
        const arrays = [];
        const getRandomValues = createGetRandomValuesMock(scenario.outcomes, arrays);
        const mathRandom = vi.spyOn(Math, 'random').mockImplementation(() => {
            throw new Error('Weak randomness must not be used.');
        });
        vi.stubGlobal('crypto', {getRandomValues});

        if (typeof scenario.expectedId === 'string') {
            expect(generateId(scenario.length)).toBe(scenario.expectedId);
        } else {
            const error = captureError(() => generateId(scenario.length));
            if (typeof scenario.expectedErrorMessage === 'string') {
                expect(error).toBeInstanceOf(Error);
                expect(/** @type {Error} */ (error).message).toBe(scenario.expectedErrorMessage);
                expect(/** @type {Error} */ (error).cause).toBe(scenario.expectedCause);
            } else {
                expect(error).toBe(scenario.expectedError);
            }
        }

        expect(getRandomValues).toHaveBeenCalledTimes(scenario.expectedCalls);
        expect(mathRandom).not.toHaveBeenCalled();
        if (scenario.expectFreshRetryArray === true) {
            expect(arrays[1]).not.toBe(arrays[0]);
        }
    });
});

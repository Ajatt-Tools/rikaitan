/*
 * Copyright (C) 2024  Ajatt-Tools and contributors
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

import {collapseEmphaticSequences, convertAlphabeticCharacters, convertHalfWidthCharacters, convertHiraganaToKatakana, convertKatakanaToHiragana, convertNumericCharacters} from './ja/japanese-text-preprocessors.js';
import {capitalizeFirstLetter, decapitalize} from './text-preprocessors.js';

/** @type {import('language-descriptors').LanguageDescriptorAny[]} */
const languageDescriptors = [
    {
        iso: 'en',
        name: 'English',
        exampleText: 'read',
        textPreprocessors: {
            capitalizeFirstLetter,
            decapitalize
        }
    },
    {
        iso: 'ja',
        name: 'Japanese',
        exampleText: '読め',
        textPreprocessors: {
            convertHalfWidthCharacters,
            convertNumericCharacters,
            convertAlphabeticCharacters,
            convertHiraganaToKatakana,
            convertKatakanaToHiragana,
            collapseEmphaticSequences
        }
    }
];

/** @type {Map<string, import('language-descriptors').LanguageDescriptorAny>} */
export const languageDescriptorMap = new Map();
for (const languageDescriptor of languageDescriptors) {
    languageDescriptorMap.set(languageDescriptor.iso, languageDescriptor);
}
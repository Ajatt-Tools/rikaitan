/*
 * Copyright (C) 2023-2025  Ajatt-Tools and contributors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {irishTransforms} from '../../ext/js/language/ga/irish-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* eslint-disable @stylistic/no-multi-spaces */
const tests = [
    {
        category: 'nouns',
        valid: true,
        tests: [
            {term: 'triail', source: 'dtriail',  rule: 'n', reasons: ['eclipsis']},
            {term: 'gairdín', source: 'ngairdín',  rule: 'n', reasons: ['eclipsis']},
            {term: 'dualgas', source: 'ndualgas',  rule: 'n', reasons: ['eclipsis']},
        ],
    },
    {
        category: 'invalid nouns',
        valid: false,
        tests: [
            {term: 'dualgas', source: 'nualgas',  rule: 'n', reasons: ['eclipsis']},
        ],
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(irishTransforms);
testLanguageTransformer(languageTransformer, tests);

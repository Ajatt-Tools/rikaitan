/*
 * Copyright (C) 2024-2026  Ajatt-Tools and contributors
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

import {describe, test} from 'vitest';
import {Handlebars} from '../ext/lib/handlebars.js';

/**
 * @param {string} template
 * @returns {import('handlebars').TemplateDelegate<unknown>}
 */
function compile(template) {
    return Handlebars.compile(template);
}

/**
 * @param {string} template
 * @returns {import('handlebars').TemplateDelegate<unknown>}
 */
function compileAST(template) {
    return Handlebars.compileAST(template);
}

/**
 * Creates an AST whose NumberLiteral value is not a number.
 * @returns {import('test/handlebars').HandlebarsProgram}
 */
function createAstWithInvalidNumberLiteral() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const ast = /** @type {import('test/handlebars').HandlebarsProgramWithNumberLiteral} */ (
        Handlebars.parse('{{lookup this 1}}')
    );
    // Handlebars 4.7.9 rejects this value instead of emitting it as JavaScript.
    ast.body[0].params[1].value = '{},{})) + globalThis.__rikaitanHandlebarsInjection = true //';
    return ast;
}

describe('Handlebars', () => {
    test('compile vs compileAST 1', ({expect}) => {
        const template = '{{~test1~}}';

        const data = {
            test1: '<div style="font-size: 4em;">Test</div>',
        };

        const instance1 = compile(template);
        const instance2 = compileAST(template);

        const result1 = instance1(data);
        const result2 = instance2(data);

        expect.soft(result1).equals('&lt;div style&#x3D;&quot;font-size: 4em;&quot;&gt;Test&lt;/div&gt;');
        expect.soft(result2).equals('&lt;div style&#x3D;&quot;font-size: 4em;&quot;&gt;Test&lt;/div&gt;');
    });
    test('compile vs compileAST 2', ({expect}) => {
        const template = '{{~test1.test2~}}';

        const data = {
            test1: {
                test2: '<div style="font-size: 4em;">Test</div>',
            },
        };

        const instance1 = compile(template);
        const instance2 = compileAST(template);

        const result1 = instance1(data);
        const result2 = instance2(data);

        expect.soft(result1).equals('&lt;div style&#x3D;&quot;font-size: 4em;&quot;&gt;Test&lt;/div&gt;');
        expect.soft(result2).equals('&lt;div style&#x3D;&quot;font-size: 4em;&quot;&gt;Test&lt;/div&gt;');
    });
    test('compile does not execute a crafted AST NumberLiteral value', ({expect}) => {
        const marker = '__rikaitanHandlebarsInjection';
        const globals = /** @type {Record<string, unknown>} */ (globalThis);
        delete globals[marker];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const template = Handlebars.compile(createAstWithInvalidNumberLiteral());
        expect(() => template({}))
            .toThrow('Invalid AST: NumberLiteral.value must be a number');

        expect(globals[marker]).toBeUndefined();
    });
});

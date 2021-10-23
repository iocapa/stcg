import { Stcg } from '../index';
import * as jp from 'jsonpath';

describe('Real life scenario', () => {
    test('Simple text only template', () => {
        let a = new Stcg('abcdmyCode');
        let b = a.run();
        expect(b).toEqual('abcdmyCode');
    });

    test('Simple combined template', () => {
        let a = new Stcg('[!var x = [1,2];x.forEach((x) => {!][>x<],[!})!]');
        let b = a.run();
        expect(b).toEqual('1,2,');
    });

    test('With real life template', () => {
        /* Json data */
        const data = {
            data: [
                [
                    { '1': 1, '2': 1, '3': 1 },
                    { '1': 2, '2': 2, '3': 2 },
                    { '1': 3, '2': 3, '3': 3 },
                    { '1': 4, '2': 4, '3': 4 },
                    { '1': 5, '2': 5, '3': 5 },
                ],
                [
                    { '1': 6, '2': 6, '3': 6 },
                    { '1': 7, '2': 7, '3': 7 },
                    { '1': 8, '2': 8, '3': 8 },
                ],
            ],
        };

        /* Template */
        const template =
            '#include "test.h"\n' +
            '\n' +
            '[!jpath("$.data.*").forEach((arr, index) => {!]\n' +
            'static const struct1_t my_struct_array_[>`${index}`<][[>`${arr.length}`<]] = {\n' +
            '[!jpath(`$.data[${index}].*`).forEach((elem, ind) => {!]\n' +
            '    {\n' +
            '        [>`${elem["1"]}`<],\n' +
            '        [>`${elem["2"]}`<],\n' +
            '        [>`${elem["3"]}`<]\n' +
            "    }[>ind < (arr.length - 1) ? ',' : ''<]\n" +
            '[!})!]\n' +
            '};\n' +
            '\n' +
            '[!})\n' +
            '!]\n' +
            'const struct2_t my_struct[[>jpath("$.data.length")<]] = {\n' +
            '[!jpath("$.data.*.length").forEach((x, i) => {!]\n' +
            "    [>`{ ${x}, my_struct_array_${i} }`<][>i < (jpath(\"$.data.length\") - 1) ? ',' : ''<]\n" +
            '[!})!]\n' +
            '};\n';

        /* Output */
        const outContent =
            '#include "test.h"\n' +
            '\n' +
            'static const struct1_t my_struct_array_0[5] = {\n' +
            '    {\n' +
            '        1,\n' +
            '        1,\n' +
            '        1\n' +
            '    },\n' +
            '    {\n' +
            '        2,\n' +
            '        2,\n' +
            '        2\n' +
            '    },\n' +
            '    {\n' +
            '        3,\n' +
            '        3,\n' +
            '        3\n' +
            '    },\n' +
            '    {\n' +
            '        4,\n' +
            '        4,\n' +
            '        4\n' +
            '    },\n' +
            '    {\n' +
            '        5,\n' +
            '        5,\n' +
            '        5\n' +
            '    }\n' +
            '};\n' +
            '\n' +
            'static const struct1_t my_struct_array_1[3] = {\n' +
            '    {\n' +
            '        6,\n' +
            '        6,\n' +
            '        6\n' +
            '    },\n' +
            '    {\n' +
            '        7,\n' +
            '        7,\n' +
            '        7\n' +
            '    },\n' +
            '    {\n' +
            '        8,\n' +
            '        8,\n' +
            '        8\n' +
            '    }\n' +
            '};\n' +
            '\n' +
            'const struct2_t my_struct[2] = {\n' +
            '    { 5, my_struct_array_0 },\n' +
            '    { 3, my_struct_array_1 }\n' +
            '};\n';

        /* Template function */
        const jpath = (path: string) => {
            return jp.query(data, path);
        };

        let stcg = new Stcg(template);
        stcg.global('jpath', jpath);
        let out = stcg.run();
        expect(out).toEqual(outContent);
    });
});

describe('Marker localization and error reporting', () => {
    test('Code start after output start', () => {
        expect(() => {
            new Stcg('[>[!');
        }).toThrow('Unexpected "[!" marker: "[> >>> [!"');
    });

    test('Output start after code start', () => {
        expect(() => {
            new Stcg('[![>');
        }).toThrow('Unexpected "[>" marker: "[! >>> [>"');
    });

    test('Code end after output start', () => {
        expect(() => {
            new Stcg('[>!]');
        }).toThrow('Unexpected "!]" marker: "[> >>> !]"');
    });

    test('Output end after code start', () => {
        expect(() => {
            new Stcg('[!<]');
        }).toThrow('Unexpected "<]" marker: "[! >>> <]"');
    });

    test('Unclosed code', () => {
        expect(() => {
            new Stcg('[!');
        }).toThrow('Marker not closed: "[!"');
    });

    test('Unclosed output', () => {
        expect(() => {
            new Stcg('[>');
        }).toThrow('Marker not closed: "[>"');
    });

    test('Unopened code', () => {
        expect(() => {
            new Stcg('!]');
        }).toThrow('Unexpected "!]" marker: "!]"');
    });

    test('Unopened output', () => {
        expect(() => {
            new Stcg('<]');
        }).toThrow('Unexpected "<]" marker: "<]"');
    });

    test('Unopened output on other line/column', () => {
        expect(() => {
            new Stcg('\n\n  <]');
        }).toThrow('Unexpected "<]" marker: "\n\n   >>> <]"');
    });
});

describe('Marker options and error reporting', () => {
    test('Marker clash on output', () => {
        expect(() => {
            new Stcg('', {
                codeBegin: 'm1',
                codeEnd: 'm4',
                outputBegin: 'm2',
                outputEnd: 'm2',
            });
        }).toThrow('Marker clash on "m2"');
    });

    test('Marker clash on code', () => {
        expect(() => {
            new Stcg('', {
                codeBegin: 'm1',
                codeEnd: 'm1',
                outputBegin: 'm2',
                outputEnd: 'm3',
            });
        }).toThrow('Marker clash on "m1"');
    });

    test('Marker clash on both', () => {
        expect(() => {
            new Stcg('', {
                codeBegin: 'm1',
                codeEnd: 'm1',
                outputBegin: 'm2',
                outputEnd: 'm2',
            });
        }).toThrow('Marker clash on "m1"');
    });

    test('Marker clash on all', () => {
        expect(() => {
            new Stcg('', {
                codeBegin: 'm1',
                codeEnd: 'm1',
                outputBegin: 'm1',
                outputEnd: 'm1',
            });
        }).toThrow('Marker clash on "m1"');
    });

    test('Marker block on codeBegin', () => {
        expect(() => {
            new Stcg('', {
                codeBegin: 'a',
                codeEnd: 'ab',
                outputBegin: 'abc',
                outputEnd: 'abcd',
            });
        }).toThrow('Marker "a" blocks other markers');
    });

    test('Marker block on codeEnd', () => {
        expect(() => {
            new Stcg('', {
                codeBegin: 'a1',
                codeEnd: 'ab',
                outputBegin: 'abc',
                outputEnd: 'abcd',
            });
        }).toThrow('Marker "ab" blocks other markers');
    });

    test('Marker block on outputBegin', () => {
        expect(() => {
            new Stcg('', {
                codeBegin: 'a1',
                codeEnd: 'a2',
                outputBegin: 'abc',
                outputEnd: 'abcd',
            });
        }).toThrow('Marker "abc" blocks other markers');
    });

    test('Marker block on outputEnd', () => {
        expect(() => {
            new Stcg('', {
                codeBegin: 'a1',
                codeEnd: 'a2',
                outputBegin: 'abcd',
                outputEnd: 'abc',
            });
        }).toThrow('Marker "abc" blocks other markers');
    });
});

describe('Content generation', () => {
    test('Construct with different markers', () => {
        const s1 = new Stcg('t1<output>"text1"</output>t2', {
            codeBegin: '<code>',
            codeEnd: '</code>',
            outputBegin: '<output>',
            outputEnd: '</output>',
        });
        expect(s1.run()).toEqual('t1text1t2');
    });
});

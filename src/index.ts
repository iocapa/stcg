import { VM, VMScript } from 'vm2';

/**
 * Generator error
 */
export class StcgError extends Error {}

/**
 * Generator options
 */
export interface StcgOptions {
    codeBegin?: string;
    codeEnd?: string;
    outputBegin?: string;
    outputEnd?: string;
    trimAfterCode?: boolean;
    debugLen?: number;
}

/**
 * Base for a slice class
 */
interface StcgSlice {
    /**
     * Transform to code string
     */
    toCode(): string;

    /**
     * Produces valid code
     */
    isValid(): boolean;
}

/**
 * A single code slice
 */
class StcgCodeSlice implements StcgSlice {
    private slice: string;

    constructor(slice: string) {
        this.slice = slice.replace(/\r?\n/gm, ' ');
    }

    /**
     * Transform to code
     */
    toCode(): string {
        return `${this.slice}\n`;
    }

    isValid(): boolean {
        return this.slice.trim().length !== 0;
    }
}

/**
 * A single text slice
 */
class StcgTextSlice implements StcgSlice {
    private slice: string;

    constructor(slice: string) {
        this.slice = slice.replace(/\r?\n/gm, '\\n');
    }

    /**
     * Transform to code
     */
    toCode(): string {
        return `__out__('${this.slice}')\n`;
    }

    /**
     * Produces results
     */
    isValid(): boolean {
        return this.slice.length !== 0;
    }

    /**
     * Trim leading spaces untill and includeing the newline
     */
    trimLeading() {
        this.slice = this.slice.replace(/^ *\\n/, '');
    }
}

/**
 * A single output slice
 */
class StcgOutputSlice implements StcgSlice {
    constructor(private slice: string) {}

    /**
     * Transform to code
     */
    toCode(): string {
        return `__out__(${this.slice})\n`;
    }

    /**
     * Produces results
     */
    isValid(): boolean {
        return this.slice.length !== 0;
    }
}

/**
 * Template slicer
 */
class StcgTemplateSlicer {
    /* Character transitions */
    private readonly gotoFunction: {
        [state: number]: {
            [word: string]: number;
        };
    };

    /* Match mapper */
    private readonly outFunction: {
        [state: number]: string;
    };

    /* Slicer state machine */
    private readonly emmiterFunction: {
        [state: number]: {
            [on: string]: {
                to: number;
                factory: (slice: string) => StcgSlice;
            };
        };
    };

    /**
     * Constructor
     * @param debugLen Exception message information length
     * @param cBeg Code begin marker
     * @param cEnd Code end marker
     * @param oBeg Output begin marker
     * @param oEnd Output end marker
     */
    constructor(private readonly debugLen: number, cBeg: string, cEnd: string, oBeg: string, oEnd: string) {
        /* Search for the following */
        const kWords = [cBeg, cEnd, oBeg, oEnd];

        /* Detector state machine function */
        const gotoFunction: { [state: number]: { [word: string]: number } } = {
            0: {},
        };

        /* Output function */
        const outFunction: { [state: number]: string } = {};

        /* Internal states */
        let cGotoState = 0;

        /* Create the detection state machine */
        for (const word of kWords) {
            let cState = 0;
            for (const char of word) {
                if (gotoFunction[cState] && char in gotoFunction[cState]) {
                    cState = gotoFunction[cState][char];
                } else {
                    cGotoState++;
                    gotoFunction[cState][char] = cGotoState;
                    gotoFunction[cGotoState] = {};
                    cState = cGotoState;
                }
            }

            /* Update the output table */
            if (outFunction[cState]) {
                throw new StcgError(`Marker clash on "${word}"`);
            } else {
                outFunction[cState] = word;
            }
        }

        /* Check for blocking markers */
        for (const marker in outFunction) {
            if (Object.keys(gotoFunction[marker]).length !== 0) {
                throw new StcgError(`Marker "${outFunction[marker]}" blocks other markers`);
            }
        }

        /* Update */
        this.gotoFunction = gotoFunction;
        this.outFunction = outFunction;

        /* Slicer states */
        this.emmiterFunction = { 0: {}, 1: {}, 2: {} };
        this.emmiterFunction[0][cBeg] = { to: 1, factory: (slice) => new StcgTextSlice(slice) };
        this.emmiterFunction[0][oBeg] = { to: 2, factory: (slice) => new StcgTextSlice(slice) };
        this.emmiterFunction[1][cEnd] = { to: 0, factory: (slice) => new StcgCodeSlice(slice) };
        this.emmiterFunction[2][oEnd] = { to: 0, factory: (slice) => new StcgOutputSlice(slice) };
    }

    /**
     * Slice the template
     * @param input Input template
     */
    slice(input: string): StcgSlice[] {
        /* Output array */
        const rVal: StcgSlice[] = [];

        /* Error location extractor */
        const errLoc = (ind: number, len: number): string => {
            /* form <leading> >>> <marker> <<< <trailing> */
            const le = ind - len;
            let ls = le - this.debugLen;
            ls = ls < 0 ? 0 : ls;
            let te = ind + this.debugLen;
            te = te > input.length ? input.length : te;
            const lead = le > ls ? `${input.slice(ls, le)} >>> ` : '';
            const emph = input.slice(ind - len, ind);
            const trail = ind < te ? ` <<< ${input.slice(ind, te)}` : '';
            return `${lead}${emph}${trail}`;
        };

        /* Internal states */
        let dState = 0;
        let cState = 0;
        let lIndex = 0;
        let cIndex = 0;
        let lastLen = 0;
        for (const char of input) {
            /* Next index */
            cIndex++;

            /* Reset on failure */
            if (dState > 0 && !(char in this.gotoFunction[dState])) {
                dState = 0;
            }

            /* No match */
            if (!(char in this.gotoFunction[dState])) {
                continue;
            }

            /* Next */
            dState = this.gotoFunction[dState][char];

            /* Call a state function */
            const mWord = this.outFunction[dState];
            if (mWord) {
                /* Last detected length */
                lastLen = mWord.length;

                /* On valid transition */
                if (mWord in this.emmiterFunction[cState]) {
                    /* Create a slice */
                    const lStop = cIndex - lastLen;
                    const nTransition = this.emmiterFunction[cState][mWord];

                    rVal.push(nTransition.factory(input.slice(lIndex, lStop)));

                    /* Advance */
                    cState = nTransition.to;
                    lIndex = cIndex;
                } else {
                    /* Invalid transition */
                    throw new StcgError(`Unexpected "${mWord}" marker: "${errLoc(cIndex, lastLen)}"`);
                }
            }
        }

        /* Last slice */
        const lTransition = this.emmiterFunction[cState];
        if (cState !== 0) {
            throw new StcgError(`Marker not closed: "${errLoc(lIndex, lastLen)}"`);
        } else {
            /* Random factory */
            rVal.push(Object.values(lTransition)[0].factory(input.slice(lIndex)));
        }

        return rVal;
    }
}

/**
 * Scripted Template Content Generator
 */
export class Stcg {
    private script: VMScript;
    private globals: { [key: string]: any } = {};

    constructor(template: string, options?: StcgOptions) {
        /* Default options */
        options = options || {
            codeBegin: '[!',
            codeEnd: '!]',
            outputBegin: '[>',
            outputEnd: '<]',
            trimAfterCode: true,
            debugLen: 6,
        };

        /* Default markers */
        options.codeBegin = options.codeBegin || '[!';
        options.codeEnd = options.codeEnd || '!]';
        options.outputBegin = options.outputBegin || '[>';
        options.outputEnd = options.outputEnd || '<]';
        options.trimAfterCode = options.trimAfterCode || true;
        options.debugLen = options.debugLen || 5;

        /* Debug */
        if (options.debugLen < 1) {
            throw new StcgError('debugLen option must be >= 1');
        }

        /* Create the slicer */
        const slicer = new StcgTemplateSlicer(
            options.debugLen,
            options.codeBegin,
            options.codeEnd,
            options.outputBegin,
            options.outputEnd,
        );

        /* Slice based on markers and apply the rules */
        let lastCode = false;
        const trimLead = options.trimAfterCode;
        const splArr = slicer.slice(template).filter((cVal) => {
            /* Mark a code run */
            if (cVal instanceof StcgCodeSlice) {
                lastCode = true;
            } else if (cVal instanceof StcgTextSlice) {
                if (lastCode && trimLead) {
                    cVal.trimLeading();
                }
                lastCode = false;
            } else {
                lastCode = false;
            }

            return cVal.isValid();
        }, this);

        /* Create the script */
        const prgScript = splArr.reduce((code, data) => {
            return code + data.toCode();
        }, '');

        /* Create script */
        this.script = new VMScript(prgScript);
    }

    /**
     * Add a global symbol
     * @param name Symbol name
     * @param data Symbol data
     */
    global(name: string, data: any) {
        /* Overrides existing globals */
        this.globals[name] = data;
    }

    /**
     * Run the generator
     */
    run(ldata: { [key: string]: any } = {}): string {
        /* Output content */
        let output = '';

        try {
            /* Create the global object */
            const vm = new VM();

            /* Set data */
            Object.entries({...this.globals, ...ldata, ...{"__out__": (str: string) => output += str}}).forEach(([k, v]) => {
                vm.freeze(v, k);
            });

            /* And run */
            vm.run(this.script);
        } catch (err) {
            throw new StcgError(err);
        }

        return output;
    }
}

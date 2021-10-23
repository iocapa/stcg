#!/usr/bin/env node

import { Stcg } from '.';
import { ArgumentParser } from 'argparse';
import * as jc from 'json-schema';
import * as RefParser from "@apidevtools/json-schema-ref-parser";
import * as fs from 'fs';
import * as path from 'path';

/* Usage stcg -s <schema_file> -m <model_file> -o <output_file> <template_file> */
const parser = new ArgumentParser({
    prog: 'stcg',
    version: '1.0.9',
    addHelp: true,
    description: 'Scripted Template Content Generator',
});

/* Code begin marker */
parser.addArgument(['--code_begin'], {
    help: 'Code begin block marker',
    defaultValue: '[!',
});

/* Code end marker */
parser.addArgument(['--code_end'], {
    help: 'Code end block marker',
    defaultValue: '!]',
});

/* Output begin marker */
parser.addArgument(['--output_begin'], {
    help: 'Output begin block marker',
    defaultValue: '[>',
});

/* Output end marker */
parser.addArgument(['--output_end'], {
    help: 'Output end block marker',
    defaultValue: '<]',
});

/* Schema file. Add required validation on the model data */
parser.addArgument(['-s', '--schema'], {
    help: 'Data model json schema file'
});

/* Data objects */
parser.addArgument(['-d', '--data'], {
    help: 'Data schema file.',
    metavar: '<file>'
});

/* Output file */
parser.addArgument(['-o', '--output'], {
    help: 'Output file'
});

/* Template file */
parser.addArgument(['template'], {
    help: 'Template file',
});

/* Main function */
(async () => {
    try {
        const args = parser.parseArgs();
        const cwd = process.cwd();

        /* Extract the data */
        const object = args.data ? await RefParser.dereference(path.resolve(cwd, args.data)) : {};

        const schema = args.schema || object.$schema || undefined;
        delete object.$schema;

        /* Validate */
        if (schema) {
            const sch = await RefParser.dereference(path.resolve(cwd, schema))
            const valid = jc.validate(object, sch);
            jc.mustBeValid(valid);
        }

        /* Get the template */
        const template = await fs.promises.readFile(path.resolve(cwd, args.template), 'utf8');

        /* Create the template */
        const stcg = new Stcg(template, {
            codeBegin: args.code_begin,
            codeEnd: args.code_end,
            outputBegin: args.output_begin,
            outputEnd: args.output_end,
        });

        /* Run and output */
        const output = stcg.run(object);
        if (args.output) {
            await fs.promises.writeFile(path.resolve(cwd, args.output), output);
        } else {
            process.stdout.write(output);
        }

    } catch (err) {
        parser.error(err);
    }
})();



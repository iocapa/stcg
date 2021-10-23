# stcg
Scripted Template Content Generator.
Designed to produce text content from a template containing script and text.
Used mostly for generating code based on a json data model.

## Disclaimer
I started this project some time ago mainly to learn typescript and use this tool in my embedded projects. Seems to work for now, haven't done any real extensive testing. Use at your own risk :).

## Contributing & bugs
Please fork the repository, make the changes in your fork and include tests. Once you're done making changes, send in a pull request.

### Bug reports
Please include a test which shows why the code fails.

## Features
* Creates and runs a script from a custom template format (text mixed with javascript)
* Runs in a secure ([vm2](https://www.npmjs.com/package/vm2)) environment
* Supports addition of extra global data/functions
* Configurable template code/output markers
* Built-in jsonpath evaluator for interaction with the data model

## Usage

### Simple library usage
Simple C structure data generation

```javascript
var Stcg = require('stcg').Stcg;

var data = {
    "data" : [
        {"name": 1, "address": 2, "custom": 3},
        {"name": 4, "address": 5, "custom": 6}
    ]
};

var template = 
'struct my_struct data[[>stcg.dpath(\"$.data.length\")<]] = \n' +
'{\n' +
'[!stcg.dpath(\"$.data.*\").forEach((elem, ind) => {!]\n' +
'   {\n' +
'        .elem = [>`${elem["name"]}`<],\n' +
'        .address = [>`${elem["name"]}`<],\n' +
'        .elem = [>`${elem["custom"]}`<]\n' +
'   },\n' +
'[!})!]\n' +
'};\n'

var stcg = new Stcg(template);
console.log(stcg.run(data));
```

Will produce the following code

```
struct my_struct data[2] = 
{
   {
        .elem = 1,
        .address = 1,
        .elem = 3
   },
   {
        .elem = 4,
        .address = 4,
        .elem = 6
   },
};
```

### Simple CLI usage
Run the generator on given input file.
Before you can use stcg in command line, install it globally with `npm install stcg -g`.

```
usage: stcg [-h] [-v] [--code_begin CODE_BEGIN] [--code_end CODE_END]
            [--output_begin OUTPUT_BEGIN] [--output_end OUTPUT_END]
            [-s SCHEMA] [-d DATA] [-o OUTPUT]
            template

Scripted Template Content Generator

Positional arguments:
  template                      Template file

Optional arguments:
  -h, --help                    Show this help message and exit.
  -v, --version                 Show program's version number and exit.
  --code_begin CODE_BEGIN       Code begin block marker
  --code_end CODE_END           Code end block marker
  --output_begin OUTPUT_BEGIN   Output begin block marker
  --output_end OUTPUT_END       Output end block marker
  -s SCHEMA, --schema SCHEMA    Data model json schema file
  -d DATA, --data DATA          Data model json file
  -o OUTPUT, --output OUTPUT    Output file
```

## Documentation

### Options
* `codeBegin` - Code begin marker, defaults to: `[!`.
* `codeEnd` - Code end marker, defaults to: `!]`.
* `outputBegin` - Output begin marker, defaults to: `[>`.
* `outputEnd` - Output end marker, defaults to: `<]`.
* `trimAfterCode` - Ignore all whitespaces and the first newline after a code run.
* `debugLen` - Determines the number of characters a Error will include in in it's info.

### Built-in functions/data
* `stcg.out(string)` - Prints.
* `stcg.outl(string)` - Prints with newline.
* `stcg.dpath(path)` - Evaluates path on the data model and returns the data. See ([jsonpath](https://www.npmjs.com/package/jsonpath)). 
* `stcg.data` - The data object received by Stcg.run(data).

## Deployment
1. Update the `package.json` version number
2. Commit the changes
3. Run `npm publish`
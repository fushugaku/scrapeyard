# Scrapeyard - VSCode Extension

A powerful VSCode extension for parsing and transforming files using custom JavaScript and TypeScript functions.

## Features

- **Custom Parser Functions**: Create JavaScript and TypeScript functions to transform file content
- **Sidebar Integration**: Dedicated sidebar panel for managing your parser functions
- **Node Modules Support**: Import functions from external npm packages
- **Flexible Execution**: Run functions on entire files or selected text
- **Virtual File Output**: View results in new untitled documents
- **Function Management**: Create, edit, and delete functions with ease

## Installation

1. Open VSCode
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Scrapeyard"
4. Click Install

## Usage

### Creating Functions

1. Open the **Parser Functions** panel in the Explorer sidebar
2. Click the "+" button to create a new JavaScript function
3. Click the TypeScript icon to create a TypeScript function
4. Enter a function name and optional description
5. The function file will open for editing

### Function Structure

#### JavaScript Functions
```javascript
/**
 * Your function description
 */
function myParser(input) {
    // Your parsing logic here
    // Input: string containing file content or selection
    // Output: string with modified content
    
    return input.toUpperCase();
}

module.exports = myParser;
```

#### TypeScript Functions
```typescript
/**
 * Your function description
 */
function myParser(input: string): string {
    // Your parsing logic here
    // Input: string containing file content or selection
    // Output: string with modified content
    
    return input.toUpperCase();
}

export = myParser;
```

### Running Functions

1. Right-click on a function in the sidebar
2. Choose:
   - **"Run on Current File"** - Processes the entire active file
   - **"Run on Selection"** - Processes only the selected text

### Using Node Modules

1. Use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run "Set Node Modules Path"
3. Select your node_modules directory
4. Import packages in your functions:

```javascript
const cheerio = require('cheerio');
const lodash = require('lodash');

function parseHTML(input) {
    const $ = cheerio.load(input);
    // Process HTML with cheerio
    return $.html();
}
```

### Managing Functions

- **Edit**: Click the edit icon next to a function
- **Delete**: Click the trash icon next to a function
- **Refresh**: Click the refresh icon to reload the function list

## Function Examples

### Text Processing
```javascript
function extractEmails(input) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = input.match(emailRegex) || [];
    return emails.join('\n');
}
```

### JSON Formatting
```typescript
function formatJSON(input: string): string {
    try {
        const parsed = JSON.parse(input);
        return JSON.stringify(parsed, null, 2);
    } catch (error) {
        return `Error: ${error.message}`;
    }
}
```

### CSV Processing
```javascript
function csvToJSON(input) {
    const lines = input.trim().split('\n');
    const headers = lines[0].split(',');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const obj = {};
        headers.forEach((header, index) => {
            obj[header.trim()] = values[index]?.trim() || '';
        });
        result.push(obj);
    }
    
    return JSON.stringify(result, null, 2);
}
```

## Configuration

The extension supports the following settings:

- `fileParser.nodeModulesPath`: Path to node_modules directory for importing functions
- `fileParser.functionsPath`: Path to directory containing parser functions

## Commands

- `fileParser.refreshFunctions`: Refresh the function list
- `fileParser.createFunction`: Create a new JavaScript function
- `fileParser.createTypeScriptFunction`: Create a new TypeScript function
- `fileParser.setNodeModulesPath`: Set the node_modules path
- `fileParser.runOnFile`: Run function on current file
- `fileParser.runOnSelection`: Run function on selection

## File Structure

```
.vscode/extensions/scrapeyard/
├── parser-functions/           # Your custom functions
│   ├── function1.js
│   ├── function2.ts
│   └── ...
└── out/                       # Compiled extension
```

## Contributing

Feel free to contribute to this project by submitting issues or pull requests.

## License

MIT License 
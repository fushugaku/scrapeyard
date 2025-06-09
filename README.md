# Scrapeyard - VSCode Extension

A powerful VSCode extension for parsing and transforming files using custom TypeScript functions with full VS Code API access.

## Features

- **TypeScript Functions**: Create powerful parser functions with full type safety
- **Rich Context API**: Access file paths, selection info, and VS Code API in your functions
- **Keyboard Shortcuts**: Bind custom shortcuts to your functions for instant access
- **Auto-Setup**: Automatic TypeScript environment with Node.js and VS Code types
- **Local Management**: Keep shortcuts and functions together for easy editing
- **Sidebar Integration**: Dedicated panel for managing your parser functions

## Installation

1. Open VSCode
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Scrapeyard"
4. Click Install

## Quick Start

### 1. Create Your First Function
1. Open the **Parser Functions** panel in the Explorer sidebar
2. Click the **"+"** button to create a new TypeScript function
3. Enter a function name and optional description
4. The function file will open with a template ready to edit

### 2. Set Up Keyboard Shortcuts
1. Click **"Configure Keyboard Shortcuts"** in the Parser Functions panel
2. This creates a `shortcuts.json` file next to your functions
3. Click **"Sync Keyboard Shortcuts"** to apply them to VS Code
4. Your functions are now accessible via keyboard shortcuts!

## Function Structure

### Basic Template
```typescript
import * as fs from 'fs';
import * as path from 'path';

export default (input: string, ctx: Context): string => {
    // Your parsing logic here
    // Input: string containing file content or selection
    // Context: metadata about the file and selection + VS Code API
    // Output: string with modified content
    
    const result = input.toUpperCase();
    
    // Access context information:
    // ctx.fullPath - path to the file
    // ctx.selection.startLine, endLine, startChar, endChar
    // ctx.params - additional parameters
    // ctx.vscode - VS Code API
    
    return result;
};
```

### Global Context Interface
The `Context` interface is globally available in all functions:

```typescript
interface Context {
    fullPath: string; // full path of file or file of selection
    selection: {
        startLine: number; // start line of selection, if file - 0
        endLine: number; // end line of selection, if file - last line of file
        startChar: number; // start character of selection, if file - 0
        endChar: number; // last character of selection, if file - last char of file
    };
    params: {
        [x: string]: any; // passed parameters from other functions
    };
    vscode: typeof vscode; // Full VS Code API access
}
```

## Advanced Examples

### File Processing with VS Code API
```typescript
import * as fs from 'fs';
import * as path from 'path';

export default (input: string, ctx: Context): string => {
    const result = input.replace(/TODO:/g, '✅ DONE:');
    
    // Show progress notification
    ctx.vscode.window.showInformationMessage(`Processed ${ctx.selection.endLine - ctx.selection.startLine + 1} lines`);
    
    // Save to new file next to original
    const outputPath = path.join(
        path.dirname(ctx.fullPath), 
        `processed_${path.basename(ctx.fullPath)}`
    );
    fs.writeFileSync(outputPath, result, 'utf-8');
    
    // Open the new file
    ctx.vscode.workspace.openTextDocument(outputPath)
        .then(doc => ctx.vscode.window.showTextDocument(doc));
    
    return result;
};
```

### Interactive Function with User Input
```typescript
export default async (input: string, ctx: Context): Promise<string> => {
    // Get user input
    const prefix = await ctx.vscode.window.showInputBox({
        prompt: 'Enter prefix to add to each line:',
        placeHolder: '> '
    });
    
    if (!prefix) return input;
    
    // Process lines
    const lines = input.split('\n');
    const result = lines.map(line => `${prefix}${line}`).join('\n');
    
    // Show completion message
    ctx.vscode.window.showInformationMessage(`Added prefix to ${lines.length} lines`);
    
    return result;
};
```

### JSON Processing with Error Handling
```typescript
export default (input: string, ctx: Context): string => {
    try {
        const parsed = JSON.parse(input);
        const formatted = JSON.stringify(parsed, null, 2);
        
        ctx.vscode.window.showInformationMessage('JSON formatted successfully!');
        return formatted;
    } catch (error) {
        ctx.vscode.window.showErrorMessage(`JSON parsing error: ${error.message}`);
        return input; // Return original if parsing fails
    }
};
```

## Keyboard Shortcuts

### Setting Up Shortcuts
1. **Configure**: Click "Configure Keyboard Shortcuts" in the Parser Functions panel
2. **Edit**: Modify the generated `shortcuts.json` file as needed
3. **Sync**: Click "Sync Keyboard Shortcuts" to apply to VS Code

### Default Shortcut Pattern
```json
[
  {
    "key": "ctrl+shift+f1",
    "command": "fileParser.run.yourFunction.onSelection",
    "when": "editorTextFocus"
  },
  {
    "key": "ctrl+alt+f1",
    "command": "fileParser.run.yourFunction.onFile",
    "when": "editorTextFocus"
  }
]
```

### Custom Shortcuts Example
```json
[
  {
    "key": "cmd+k cmd+u",
    "command": "fileParser.run.toUpper.onSelection",
    "when": "editorTextFocus && editorLangId == 'markdown'"
  },
  {
    "key": "ctrl+shift+j",
    "command": "fileParser.run.formatJSON.onFile",
    "when": "editorTextFocus"
  }
]
```

## Running Functions

### Via Keyboard Shortcuts
- Press your configured shortcut (e.g., `Ctrl+Shift+F1`)
- Functions run on selection or entire file depending on configuration

### Via Context Menu
1. Select text in any editor
2. Right-click → "Scrapeyard"
3. Choose a function from the quick pick list

### Via Sidebar
1. Right-click on a function in the Parser Functions panel
2. Choose "Run on Current File" or "Run on Selection"

## File Management

### Functions Directory Structure
```
parser-functions/
├── myFunction.ts           # Your executable functions
├── anotherFunction.ts      # More functions
├── shortcuts.json          # Keyboard shortcuts (editable)
├── scrapeyard-types.d.ts   # Global type definitions
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies
└── node_modules/           # Auto-installed types
```

### Managing Functions
- **Create**: Click "+" in the Parser Functions panel
- **Edit**: Click the edit icon next to a function
- **Delete**: Click the trash icon next to a function
- **Refresh**: Click the refresh icon to reload the function list

## Configuration

### Extension Settings
- `fileParser.nodeModulesPath`: Path to node_modules for importing external packages
- `fileParser.functionsPath`: Custom path for storing functions

### TypeScript Setup
The extension automatically sets up:
- TypeScript compiler configuration
- Node.js type definitions (`@types/node`)
- VS Code API types (`@types/vscode`)
- Global Context interface

## Using External Packages

### Setting Node Modules Path
1. Use Command Palette: "Set Node Modules Path"
2. Select your project's `node_modules` directory
3. Import packages in your functions:

```typescript
import * as lodash from 'lodash';
import * as cheerio from 'cheerio';

export default (input: string, ctx: Context): string => {
    const $ = cheerio.load(input);
    const links = $('a').map((i, el) => $(el).attr('href')).get();
    return lodash.uniq(links).join('\n');
};
```

## Commands

Access these via Command Palette (`Cmd+Shift+P`):

- `Configure Keyboard Shortcuts` - Set up function shortcuts
- `Sync Keyboard Shortcuts` - Apply shortcuts to VS Code
- `Set Node Modules Path` - Configure external package imports
- `Apply Functions...` - Run function on selection via quick pick

## Tips & Best Practices

### Performance
- Functions are compiled on-demand for optimal performance
- Use async/await for VS Code API calls that return promises

### Error Handling
- Always handle potential errors in your functions
- Use try-catch blocks for file operations and API calls
- Leverage VS Code's notification system for user feedback

### Debugging
- Use `console.log()` for debugging (check Developer Console)
- Use VS Code's built-in TypeScript error detection
- Test functions on small selections before running on large files

### Function Organization
- Use descriptive function names for easy identification
- Add JSDoc comments for function descriptions
- Keep related functions together
- Use the shortcuts.json file for custom key bindings

## Troubleshooting

### TypeScript Errors
- Ensure your functions directory has proper TypeScript setup
- Check that Node.js and VS Code types are installed
- Refresh the function list if types aren't recognized

### Keyboard Shortcuts Not Working
- Verify shortcuts.json syntax is valid JSON
- Check for conflicting keybindings in VS Code
- Use "Sync Keyboard Shortcuts" after editing shortcuts.json

### Function Execution Errors
- Check the Output panel for detailed error messages
- Ensure your function exports a default function
- Verify the function signature matches the expected format

## Contributing

Feel free to contribute to this project by submitting issues or pull requests on GitHub.

## License

MIT License 
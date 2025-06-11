# Scrapeyard - VSCode Extension

A powerful VSCode extension for parsing and transforming files using custom TypeScript functions with full VS Code API access, advanced pipeline management, and intelligent folder organization.

## 🚀 Features

- **🗂️ Hierarchical Function Organization**: Organize functions in folders and subfolders with drag & drop support
- **⚙️ Advanced Pipeline Management**: Chain functions together for complex data transformations
- **📝 TypeScript Functions**: Create powerful parser functions with full type safety and IntelliSense
- **🎯 Smart Execution**: Run functions on selections, current line, or entire files
- **⌨️ Keyboard Shortcuts**: Bind custom shortcuts to functions and pipelines for instant access
- **🖱️ Drag & Drop Interface**: Easily reorganize functions between folders
- **🗂️ Folder Management**: Create, delete, and organize function folders from the interface
- **💻 Terminal Integration**: Quick access to functions directory via integrated terminal
- **🔄 Auto-Setup**: Automatic TypeScript environment with Node.js and VS Code types
- **📍 Rich Context API**: Access file paths, selection info, and VS Code API in functions
- **🎨 Sidebar Integration**: Dedicated panels for functions and pipelines

## 📦 Installation

1. Open VSCode
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Scrapeyard"
4. Click Install

## 🏃‍♂️ Quick Start

### 1. Create Your First Function
1. Open the **Scrapeyard Functions** panel in the Explorer sidebar
2. Click the **"+"** button to create a new TypeScript function
3. Enter a function name (supports folder paths like `utils/stringHelper`)
4. The function file opens with a template ready to edit

### 2. Organize with Folders
1. Click the **📁** button to create folders for organizing functions
2. Use **drag & drop** to move functions between folders
3. **Right-click** folders to delete them (with safety confirmations)

### 3. Create Function Pipelines
1. Open the **Scrapeyard Pipelines** panel
2. Click **"+"** to create a pipeline
3. Select functions to chain together in sequence
4. Run pipelines just like individual functions

### 4. Set Up Keyboard Shortcuts
1. Click **⌨️ "Edit Shortcuts"** in the Functions panel
2. Configure keyboard shortcuts for functions and pipelines
3. Shortcuts automatically update when you create new functions

## 🗂️ Function Organization

### Folder Structure
Functions are organized in a hierarchical folder structure:

```
parser-functions/
├── 📁 utils/
│   ├── stringUtils.ts
│   └── formatters.ts
├── 📁 data/
│   ├── 📁 parsers/
│   │   ├── jsonParser.ts
│   │   └── xmlParser.ts
│   └── validators.ts
├── myFunction.ts
├── 📄 shortcuts.json
└── 📄 scrapeyard-types.d.ts
```

### Folder Management
- **Create folders**: Click 📁 button or use nested paths when creating functions
- **Drag & drop**: Move functions between folders by dragging
- **Delete folders**: Right-click → delete (confirms before removing functions)
- **Auto-organization**: Empty folders are visible for better structure planning

## ⚙️ Pipeline Management

### Creating Pipelines
1. Click **"+"** in the Pipelines panel
2. Enter pipeline name and description
3. Select functions to add to the pipeline sequence
4. Functions execute in order, passing results between steps

### Pipeline Features
- **Step Management**: Enable/disable, reorder, or remove steps
- **Visual Interface**: See pipeline flow with step indicators
- **Error Handling**: Pipeline stops on errors with detailed feedback
- **Context Passing**: Data flows between functions with preserved context

### Example Pipeline
```
Text Input → Remove HTML Tags → Format JSON → Validate Structure → Clean Output
```

## 🔧 Function Structure

### Enhanced Template
```typescript
import * as fs from 'fs';
import * as path from 'path';

export default (input: string, ctx: Context): { result: string; ctx: Context } => {
    // Your parsing logic here
    // Input: string containing file content or selection
    // Context: metadata about the file and selection + VS Code API
    // Output: object with result (transformed text) and ctx (updated context)
    
    const result = input.toUpperCase();
    
    // Access context information:
    // ctx.fullPath - path to the file
    // ctx.selection.startLine, endLine, startChar, endChar - selection bounds
    // ctx.params - additional parameters
    // ctx.vscode - VS Code API (show messages, create files, etc.)
    
    // Example VS Code API usage:
    ctx.vscode.window.showInformationMessage('Processing complete!');
    
    // You can modify the context to pass data to the next function in a pipeline
    ctx.params.processedLines = result.split('\n').length;
    
    // Uncomment to write to file:
    // const outputPath = path.join(path.dirname(ctx.fullPath), 'output.txt');
    // fs.writeFileSync(outputPath, result, 'utf-8');
    
    return { result, ctx };
};
```

### Global Context Interface
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
        [x: string]: any; // passed parameters that can be passed from other functions
    };
    vscode: typeof vscode; // VS Code API for editor interactions
}
```

## 🎯 Running Functions & Pipelines

### Smart Execution Modes
- **With Selection**: Runs on selected text
- **Without Selection**: Automatically runs on current line (no more "No text selected" errors!)
- **Entire File**: Processes the whole document

### Execution Methods

#### Via Keyboard Shortcuts
- Press your configured shortcut (e.g., `Ctrl+Shift+F1`)
- Works on selection, current line, or entire file

#### Via Context Menu
1. Select text in any editor (optional)
2. Right-click → "Scrapeyard"
3. Choose function or pipeline from quick pick

#### Via Sidebar
1. Right-click function/pipeline in the panel
2. Choose "Run on Current File" or "Run on Selection"

#### Via Terminal Integration
1. Click **💻** terminal button in Functions panel
2. Opens integrated terminal in functions directory
3. Use command line tools or scripts directly

## 🗂️ Advanced File Management

### Functions Directory Structure
```
parser-functions/
├── 📁 utilities/
│   ├── 📁 string/
│   │   ├── camelCase.ts
│   │   └── kebabCase.ts
│   └── 📁 array/
│       └── unique.ts
├── 📁 parsers/
│   ├── csvParser.ts
│   └── logParser.ts
├── mainFunction.ts           # Root level functions
├── shortcuts.json            # Keyboard shortcuts (editable)
├── scrapeyard-types.d.ts     # Global type definitions
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies
└── node_modules/             # Auto-installed types
```

### Enhanced Management Features
- **Create**: Click "+" for functions, 📁 for folders
- **Edit**: Click edit icon or double-click items
- **Delete**: Trash icon with confirmation dialogs
- **Move**: Drag & drop functions between folders
- **Terminal**: Direct access to functions directory
- **Auto-refresh**: Automatic updates when files change

## ⌨️ Keyboard Shortcuts

### Auto-Generated Shortcuts
The extension automatically creates shortcuts for:
- All executable functions (`.ts` files)
- All pipelines
- Both "on selection" and "on file" variants

### Shortcut Configuration
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
  },
  {
    "key": "ctrl+shift+p1",
    "command": "pipeline.run.yourPipeline.onSelection",
    "when": "editorTextFocus"
  }
]
```

### Shortcut Management
- **Edit**: Click ⌨️ button in Functions panel
- **Sync**: Automatic synchronization with VS Code
- **Update**: Auto-updates when functions/pipelines change

## 🔧 Configuration

### Extension Settings
- `fileParser.nodeModulesPath`: Path to node_modules for importing external packages
- `fileParser.functionsPath`: Custom path for storing functions

### Advanced TypeScript Setup
The extension automatically configures:
- **Recursive TypeScript scanning**: `"include": ["**/*.ts", "**/*.d.ts"]`
- **Global type definitions**: Available in all subdirectories
- **Node.js types**: `@types/node` with latest definitions
- **VS Code API types**: `@types/vscode` for editor integration
- **Auto-compilation**: On-demand TypeScript compilation

## 📁 Working with External Packages

### Package Integration
```typescript
import * as lodash from 'lodash';
import * as cheerio from 'cheerio';
import axios from 'axios';

export default async (input: string, ctx: Context): Promise<{ result: string; ctx: Context }> => {
    const urls = input.split('\n').filter(line => line.trim());
    
    const results = await Promise.all(
        urls.map(async url => {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);
            return $('title').text();
        })
    );
    
    const result = lodash.uniq(results).join('\n');
    
    ctx.vscode.window.showInformationMessage(`Processed ${urls.length} URLs`);
    
    return { result, ctx };
};
```

## 🔗 Pipeline Examples

### Data Processing Pipeline
```
Raw CSV → Parse CSV → Validate Data → Transform Fields → Generate Report
```

### Web Content Pipeline  
```
HTML Input → Extract Links → Fetch Pages → Parse Metadata → Generate Summary
```

### Code Processing Pipeline
```
Source Code → Remove Comments → Format Code → Add Headers → Optimize Imports
```

## 📋 Available Commands

Access via Command Palette (`Cmd+Shift+P`):

- `Scrapeyard: Create Function` - Create new TypeScript function
- `Scrapeyard: Create Folder` - Create function organization folder
- `Scrapeyard: Create Pipeline` - Create new function pipeline
- `Scrapeyard: Edit Shortcuts` - Configure keyboard shortcuts
- `Scrapeyard: Open Terminal` - Open terminal in functions directory
- `Scrapeyard: Refresh All` - Reload functions and pipelines
- `Scrapeyard: Run Function on Selection` - Quick pick function runner
- `Scrapeyard: Run Pipeline on Selection` - Quick pick pipeline runner

## 💡 Tips & Best Practices

### 🗂️ Organization
- Group related functions in folders (e.g., `text/`, `data/`, `web/`)
- Use descriptive names for functions and pipelines
- Keep utility functions in a dedicated `utils/` folder

### ⚡ Performance
- Functions compile on-demand for optimal performance
- Use async/await for VS Code API calls and external requests
- Cache compiled functions automatically

### 🛡️ Error Handling
- Always handle potential errors in functions
- Use try-catch blocks for file operations and API calls
- Leverage VS Code's notification system for user feedback

### 🔧 Development
- Take advantage of full TypeScript IntelliSense in nested folders
- Use JSDoc comments for better function descriptions
- Test functions on small selections before running on large files

### 🔄 Pipeline Design
- Design functions to be composable and reusable
- Use the context parameter to pass data between pipeline steps
- Handle both string and object return formats for flexibility

## 🐛 Troubleshooting

### TypeScript Issues
- **Nested folder types**: Global types automatically available in all subdirectories
- **Missing IntelliSense**: Extension auto-refreshes TypeScript config
- **Import errors**: Check node_modules path configuration

### Execution Problems
- **Functions not running**: Check Output panel for detailed errors
- **No selection needed**: Functions now work on current line automatically
- **Pipeline failures**: Each step must return valid result format

### Interface Issues
- **Drag & drop not working**: Ensure you're dragging functions (not folders) to folders
- **Folders not showing**: Create folders using the 📁 button or nested function names
- **Terminal not opening**: Check functions directory permissions

## 🤝 Contributing

Feel free to contribute to this project by submitting issues or pull requests on GitHub.

## 📄 License

MIT License 
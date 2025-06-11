"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class FunctionManager {
    constructor(context) {
        this.context = context;
        this.functions = [];
        this.functionsDir = path.join(context.globalStorageUri?.fsPath || context.extensionPath, 'parser-functions');
        this.ensureFunctionsDirectory();
        this.loadFunctions();
        // Ensure TypeScript configuration is up to date on startup
        this.refreshTypeScriptConfig();
    }
    ensureFunctionsDirectory() {
        if (!fs.existsSync(this.functionsDir)) {
            fs.mkdirSync(this.functionsDir, { recursive: true });
        }
        // Create package.json if it doesn't exist
        const packageJsonPath = path.join(this.functionsDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            const packageJsonContent = {
                "name": "parser-functions",
                "version": "1.0.0",
                "description": "TypeScript parser functions for Scrapeyard extension",
                "private": true,
                "devDependencies": {
                    "@types/node": "^16.0.0",
                    "@types/vscode": "^1.74.0",
                    "typescript": "^4.9.0"
                }
            };
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2), 'utf8');
        }
        // Create global types declaration file
        const typesPath = path.join(this.functionsDir, 'scrapeyard-types.d.ts');
        if (!fs.existsSync(typesPath)) {
            const typesContent = `import * as vscode from 'vscode';

declare global {
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
}

export {};`;
            fs.writeFileSync(typesPath, typesContent, 'utf8');
        }
        // Create a tsconfig.json in the functions directory for proper TypeScript support
        const tsconfigPath = path.join(this.functionsDir, 'tsconfig.json');
        if (!fs.existsSync(tsconfigPath)) {
            const tsconfigContent = {
                "compilerOptions": {
                    "target": "ES2020",
                    "module": "commonjs",
                    "lib": ["ES2020"],
                    "esModuleInterop": true,
                    "allowSyntheticDefaultImports": true,
                    "strict": true,
                    "skipLibCheck": true,
                    "forceConsistentCasingInFileNames": true,
                    "moduleResolution": "node",
                    "resolveJsonModule": true,
                    "types": ["node", "vscode"],
                    "typeRoots": ["./node_modules/@types"]
                },
                "include": ["**/*.ts", "**/*.d.ts"],
                "exclude": ["**/*.compiled.js", "node_modules"]
            };
            fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2), 'utf8');
        }
        // Install Node.js types if node_modules doesn't exist
        const nodeModulesPath = path.join(this.functionsDir, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            // Use child_process to run npm install
            const { execSync } = require('child_process');
            try {
                execSync('npm install', {
                    cwd: this.functionsDir,
                    stdio: 'ignore'
                });
            }
            catch (error) {
                console.warn('Failed to install Node.js types automatically:', error);
            }
        }
    }
    loadFunctions() {
        try {
            this.functions = this.scanDirectory(this.functionsDir, '');
        }
        catch (error) {
            console.error('Error loading functions:', error);
            this.functions = [];
        }
    }
    scanDirectory(dirPath, relativePath) {
        const functions = [];
        try {
            const items = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const item of items) {
                // Skip hidden files and directories, node_modules, and other build artifacts
                if (item.name.startsWith('.') ||
                    item.name === 'node_modules' ||
                    item.name === 'out' ||
                    item.name === 'dist' ||
                    item.name.endsWith('.compiled.js')) {
                    continue;
                }
                const fullPath = path.join(dirPath, item.name);
                const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
                if (item.isDirectory()) {
                    // Recursively scan subdirectories
                    functions.push(...this.scanDirectory(fullPath, itemRelativePath));
                }
                else if (item.isFile() &&
                    (item.name.endsWith('.ts') || item.name.endsWith('.d.ts')) &&
                    !item.name.endsWith('.compiled.js')) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const name = path.basename(item.name, path.extname(item.name));
                    const isDeclaration = item.name.endsWith('.d.ts');
                    functions.push({
                        name,
                        filePath: fullPath,
                        relativePath: itemRelativePath,
                        content,
                        type: isDeclaration ? 'declaration' : 'typescript',
                        description: this.extractDescription(content)
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
        return functions;
    }
    extractDescription(content) {
        const match = content.match(/\/\*\*\s*\n\s*\*\s*(.+)\s*\n/);
        return match ? match[1] : undefined;
    }
    getFunctions() {
        return this.functions;
    }
    getFunctionsDirectory() {
        return this.functionsDir;
    }
    getDirectoryStructure() {
        const root = {
            name: '',
            path: '',
            isDirectory: true,
            children: new Map(),
            functions: []
        };
        // First, scan for all directories (including empty ones)
        this.scanDirectoryStructure(this.functionsDir, '', root);
        // Then, add functions to their respective directories
        for (const func of this.functions) {
            const parts = func.relativePath.split(path.sep);
            let current = root;
            // Navigate to the directory containing this function
            for (let i = 0; i < parts.length - 1; i++) {
                const dirName = parts[i];
                current = current.children.get(dirName);
            }
            // Add function to the current directory
            current.functions.push(func);
        }
        return root;
    }
    scanDirectoryStructure(dirPath, relativePath, parentNode) {
        try {
            const items = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const item of items) {
                // Skip hidden files and directories, node_modules, and other build artifacts
                if (item.name.startsWith('.') ||
                    item.name === 'node_modules' ||
                    item.name === 'out' ||
                    item.name === 'dist') {
                    continue;
                }
                if (item.isDirectory()) {
                    const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
                    const dirNode = {
                        name: item.name,
                        path: itemRelativePath,
                        isDirectory: true,
                        children: new Map(),
                        functions: []
                    };
                    parentNode.children.set(item.name, dirNode);
                    // Recursively scan subdirectories
                    this.scanDirectoryStructure(path.join(dirPath, item.name), itemRelativePath, dirNode);
                }
            }
        }
        catch (error) {
            console.error(`Error scanning directory structure ${dirPath}:`, error);
        }
    }
    async createFolder() {
        const folderName = await vscode.window.showInputBox({
            prompt: 'Enter folder name (can include nested path like "utils/helpers")',
            placeHolder: 'folderName or parent/folderName'
        });
        if (!folderName) {
            return;
        }
        const folderPath = path.join(this.functionsDir, folderName);
        try {
            if (fs.existsSync(folderPath)) {
                vscode.window.showErrorMessage(`Folder '${folderName}' already exists`);
                return;
            }
            fs.mkdirSync(folderPath, { recursive: true });
            // Refresh TypeScript configuration to ensure new directories are included
            this.refreshTypeScriptConfig();
            vscode.window.showInformationMessage(`Folder '${folderName}' created successfully!`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error creating folder: ${error}`);
        }
    }
    async createFunction(type = 'typescript') {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter function name (can include folder path like "utils/myFunction")',
            placeHolder: 'myParserFunction or folder/myParserFunction'
        });
        if (!name) {
            return;
        }
        const description = await vscode.window.showInputBox({
            prompt: 'Enter function description (optional)',
            placeHolder: 'What does this function do?'
        });
        const template = this.createFunctionTemplate(name, description, type);
        const filePath = path.join(this.functionsDir, `${name}.ts`);
        try {
            // Ensure the directory exists
            const dirPath = path.dirname(filePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(filePath, template, 'utf8');
            // Refresh TypeScript configuration to ensure new directories are included
            this.refreshTypeScriptConfig();
            // Open the new function file for editing
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            this.loadFunctions();
            vscode.window.showInformationMessage(`TypeScript function '${name}' created successfully!`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error creating function: ${error}`);
        }
    }
    refreshTypeScriptConfig() {
        // Force recreation of tsconfig.json to ensure it includes all directories
        const tsconfigPath = path.join(this.functionsDir, 'tsconfig.json');
        const tsconfigContent = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "commonjs",
                "lib": ["ES2020"],
                "esModuleInterop": true,
                "allowSyntheticDefaultImports": true,
                "strict": true,
                "skipLibCheck": true,
                "forceConsistentCasingInFileNames": true,
                "moduleResolution": "node",
                "resolveJsonModule": true,
                "types": ["node", "vscode"],
                "typeRoots": ["./node_modules/@types"]
            },
            "include": ["**/*.ts", "**/*.d.ts"],
            "exclude": ["**/*.compiled.js", "node_modules"]
        };
        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2), 'utf8');
    }
    async deleteFolder(folderPath) {
        const fullFolderPath = path.join(this.functionsDir, folderPath);
        if (!fs.existsSync(fullFolderPath)) {
            vscode.window.showErrorMessage(`Folder '${folderPath}' not found`);
            return;
        }
        try {
            // Check if folder contains any functions
            const functionsInFolder = this.functions.filter(func => func.relativePath.startsWith(folderPath + path.sep) ||
                path.dirname(func.relativePath) === folderPath);
            if (functionsInFolder.length > 0) {
                const functionNames = functionsInFolder.map(f => f.name).join(', ');
                const confirmation = await vscode.window.showWarningMessage(`Folder '${folderPath}' contains ${functionsInFolder.length} function(s): ${functionNames}. Delete folder and all contents?`, 'Yes, Delete All', 'Cancel');
                if (confirmation !== 'Yes, Delete All') {
                    return;
                }
            }
            else {
                const confirmation = await vscode.window.showWarningMessage(`Are you sure you want to delete the empty folder '${folderPath}'?`, 'Yes', 'Cancel');
                if (confirmation !== 'Yes') {
                    return;
                }
            }
            // Remove folder and all its contents
            fs.rmSync(fullFolderPath, { recursive: true, force: true });
            this.loadFunctions();
            const message = functionsInFolder.length > 0
                ? `Folder '${folderPath}' and ${functionsInFolder.length} function(s) deleted successfully!`
                : `Folder '${folderPath}' deleted successfully!`;
            vscode.window.showInformationMessage(message);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error deleting folder: ${error}`);
        }
    }
    async moveFunction(functionName, targetFolderPath) {
        const func = this.functions.find(f => f.name === functionName);
        if (!func) {
            vscode.window.showErrorMessage(`Function '${functionName}' not found`);
            return;
        }
        try {
            const fileName = path.basename(func.filePath);
            const newPath = path.join(this.functionsDir, targetFolderPath, fileName);
            // Ensure target directory exists
            const targetDir = path.dirname(newPath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            // Move the file
            fs.renameSync(func.filePath, newPath);
            // Also move compiled version if it exists
            const compiledPath = func.filePath.replace('.ts', '.compiled.js');
            if (fs.existsSync(compiledPath)) {
                const newCompiledPath = newPath.replace('.ts', '.compiled.js');
                fs.renameSync(compiledPath, newCompiledPath);
            }
            this.loadFunctions();
            vscode.window.showInformationMessage(`Function '${functionName}' moved to '${targetFolderPath}'`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error moving function: ${error}`);
        }
    }
    async editFunction(name) {
        const func = this.functions.find(f => f.name === name);
        if (!func) {
            vscode.window.showErrorMessage(`Function '${name}' not found`);
            return;
        }
        try {
            const document = await vscode.workspace.openTextDocument(func.filePath);
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error opening function: ${error}`);
        }
    }
    async deleteFunction(name) {
        const func = this.functions.find(f => f.name === name);
        if (!func) {
            vscode.window.showErrorMessage(`Function '${name}' not found`);
            return;
        }
        const confirmation = await vscode.window.showWarningMessage(`Are you sure you want to delete function '${name}'?`, 'Yes', 'No');
        if (confirmation === 'Yes') {
            try {
                fs.unlinkSync(func.filePath);
                // Also delete compiled version if it exists
                const compiledPath = func.filePath.replace('.ts', '.compiled.js');
                if (fs.existsSync(compiledPath)) {
                    fs.unlinkSync(compiledPath);
                }
                this.loadFunctions();
                vscode.window.showInformationMessage(`Function '${name}' deleted successfully!`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error deleting function: ${error}`);
            }
        }
    }
    createFunctionTemplate(name, description, type = 'typescript') {
        const desc = description ? `/**\n * ${description}\n */\n` : '';
        return `${desc}import * as fs from 'fs';
import * as path from 'path';

export default (input: string, ctx: Context): { result: string; ctx: Context } => {
    // Your parsing logic here
    // Input: string containing file content or selection
    // Context: metadata about the file and selection + VS Code API (globally available)
    // Output: object with result (transformed text) and ctx (updated context)
    
    // Example: Convert to uppercase and optionally write to file
    const result = input.toUpperCase();
    
    // Access context information:
    // ctx.fullPath - path to the file
    // ctx.selection.startLine, endLine, startChar, endChar - selection bounds
    // ctx.params - additional parameters
    // ctx.vscode - VS Code API (show messages, create files, etc.)
    
    // Example VS Code API usage:
    // ctx.vscode.window.showInformationMessage('Processing complete!');
    
    // You can modify the context to pass data to the next function in a pipeline
    // ctx.params.processedLines = result.split('\\n').length;
    
    // Uncomment to write to file:
    // const outputPath = path.join(path.dirname(ctx.fullPath), 'output.txt');
    // fs.writeFileSync(outputPath, result, 'utf-8');
    
    return { result, ctx };
};`;
    }
    getFunction(name) {
        return this.functions.find(f => f.name === name);
    }
    async compileTypeScriptFunction(filePath) {
        const ts = require('typescript');
        const sourceCode = fs.readFileSync(filePath, 'utf8');
        const result = ts.transpile(sourceCode, {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true
        });
        // Write compiled JS to a temporary file
        const compiledPath = filePath.replace('.ts', '.compiled.js');
        fs.writeFileSync(compiledPath, result, 'utf8');
        return compiledPath;
    }
    updateShortcutsFile() {
        try {
            const shortcutsPath = path.join(this.functionsDir, 'shortcuts.json');
            const shortcuts = [];
            // Add shortcuts for executable functions only
            const executableFunctions = this.functions.filter(func => func.type === 'typescript');
            executableFunctions.forEach(func => {
                shortcuts.push({
                    "key": "",
                    "command": `fileParser.run.${func.name}.onFile`,
                    "when": "editorTextFocus"
                }, {
                    "key": "",
                    "command": `fileParser.run.${func.name}.onSelection`,
                    "when": "editorHasSelection"
                });
            });
            fs.writeFileSync(shortcutsPath, JSON.stringify(shortcuts, null, 2), 'utf8');
        }
        catch (error) {
            console.error('Error updating shortcuts file:', error);
        }
    }
    async configureKeyboardShortcuts() {
        const shortcutsPath = path.join(this.functionsDir, 'shortcuts.json');
        try {
            // Ensure shortcuts file exists with current functions and pipelines
            if (!fs.existsSync(shortcutsPath)) {
                // Create initial shortcuts file with empty keys for current functions
                // Note: We can't get pipelines here, so just create with functions for now
                this.updateShortcutsWithPipelines([]);
            }
            // Open the shortcuts file for editing
            const document = await vscode.workspace.openTextDocument(shortcutsPath);
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage('Edit keyboard shortcuts here, then use "Sync Keyboard Shortcuts" to apply them to VS Code.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error opening shortcuts file: ${error}`);
        }
    }
    async editShortcuts() {
        const shortcutsPath = path.join(this.functionsDir, 'shortcuts.json');
        try {
            // Ensure shortcuts file exists with current functions and pipelines
            if (!fs.existsSync(shortcutsPath)) {
                // Create initial shortcuts file with empty keys for current functions
                this.updateShortcutsWithPipelines([]);
            }
            // Open the shortcuts file for editing
            const document = await vscode.workspace.openTextDocument(shortcutsPath);
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage('Edit keyboard shortcuts here, then use "Sync Keyboard Shortcuts" to apply them to VS Code.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error opening shortcuts file: ${error}`);
        }
    }
    async syncKeyboardShortcuts() {
        const shortcutsPath = path.join(this.functionsDir, 'shortcuts.json');
        if (!fs.existsSync(shortcutsPath)) {
            vscode.window.showWarningMessage('No shortcuts.json file found. Create one using "Configure Keyboard Shortcuts" first.');
            return;
        }
        try {
            // Get VS Code keybindings file path
            const os = require('os');
            let keybindingsPath;
            if (process.platform === 'win32') {
                keybindingsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'keybindings.json');
            }
            else if (process.platform === 'darwin') {
                keybindingsPath = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'keybindings.json');
            }
            else {
                keybindingsPath = path.join(os.homedir(), '.config', 'Code', 'User', 'keybindings.json');
            }
            // Read existing VS Code keybindings
            let existingKeybindings = [];
            if (fs.existsSync(keybindingsPath)) {
                try {
                    let content = fs.readFileSync(keybindingsPath, 'utf8').trim();
                    // Remove comments and trailing commas for parsing
                    content = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
                    content = content.replace(/,(\s*[}\]])/g, '$1');
                    existingKeybindings = content ? JSON.parse(content) : [];
                }
                catch (parseError) {
                    const choice = await vscode.window.showErrorMessage('Failed to parse existing keybindings.json. Create backup and start fresh?', 'Yes', 'No');
                    if (choice === 'Yes') {
                        const backupPath = keybindingsPath + '.backup.' + Date.now();
                        fs.copyFileSync(keybindingsPath, backupPath);
                        existingKeybindings = [];
                        vscode.window.showInformationMessage(`Backup created: ${backupPath}`);
                    }
                    else {
                        return;
                    }
                }
            }
            // STEP 1: Sync FROM VS Code TO local shortcuts.json
            // Read current local shortcuts
            let localShortcuts = JSON.parse(fs.readFileSync(shortcutsPath, 'utf8'));
            // Find existing scrapeyard shortcuts in VS Code
            const existingScrapeyardShortcuts = existingKeybindings.filter((binding) => binding.command?.startsWith('fileParser.run.') || binding.command?.startsWith('pipeline.run.'));
            // Update local shortcuts with any existing VS Code bindings
            let updatedFromVscode = false;
            localShortcuts.forEach((localShortcut, index) => {
                const matchingVscodeShortcut = existingScrapeyardShortcuts.find((vscodeShortcut) => vscodeShortcut.command === localShortcut.command);
                if (matchingVscodeShortcut && matchingVscodeShortcut.key !== localShortcut.key) {
                    localShortcuts[index].key = matchingVscodeShortcut.key;
                    updatedFromVscode = true;
                }
            });
            // Save updated local shortcuts if changes were made
            if (updatedFromVscode) {
                fs.writeFileSync(shortcutsPath, JSON.stringify(localShortcuts, null, 2), 'utf8');
            }
            // STEP 2: Sync FROM local shortcuts.json TO VS Code
            // Remove existing scrapeyard shortcuts from VS Code
            existingKeybindings = existingKeybindings.filter((binding) => !binding.command?.startsWith('fileParser.run.') && !binding.command?.startsWith('pipeline.run.'));
            // Add updated shortcuts from local file
            existingKeybindings.push(...localShortcuts);
            // Write updated keybindings to VS Code
            fs.writeFileSync(keybindingsPath, JSON.stringify(existingKeybindings, null, 2), 'utf8');
            const syncMessages = [];
            if (updatedFromVscode) {
                syncMessages.push('Local shortcuts updated from VS Code');
            }
            syncMessages.push(`${localShortcuts.length} shortcuts applied to VS Code`);
            vscode.window.showInformationMessage(`Bidirectional sync complete! ${syncMessages.join(', ')}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error syncing shortcuts: ${error}`);
        }
    }
    updateShortcutsWithPipelines(pipelines) {
        try {
            const shortcutsPath = path.join(this.functionsDir, 'shortcuts.json');
            // Read existing shortcuts if they exist
            let existingShortcuts = [];
            if (fs.existsSync(shortcutsPath)) {
                try {
                    existingShortcuts = JSON.parse(fs.readFileSync(shortcutsPath, 'utf8'));
                }
                catch (error) {
                    console.warn('Could not parse existing shortcuts, starting fresh:', error);
                    existingShortcuts = [];
                }
            }
            // Separate scrapeyard shortcuts from custom ones
            const customShortcuts = existingShortcuts.filter((shortcut) => !shortcut.command?.startsWith('fileParser.run.') &&
                !shortcut.command?.startsWith('pipeline.run.'));
            const scrapeyardShortcuts = existingShortcuts.filter((shortcut) => shortcut.command?.startsWith('fileParser.run.') ||
                shortcut.command?.startsWith('pipeline.run.'));
            // Create a map of existing scrapeyard shortcuts to preserve key bindings
            const existingKeyMap = new Map();
            scrapeyardShortcuts.forEach(shortcut => {
                if (shortcut.command && shortcut.key) {
                    existingKeyMap.set(shortcut.command, shortcut.key);
                }
            });
            const updatedShortcuts = [...customShortcuts];
            // Add shortcuts for current executable functions (preserving existing keys)
            const executableFunctions = this.functions.filter(func => func.type === 'typescript');
            executableFunctions.forEach(func => {
                const onFileCommand = `fileParser.run.${func.name}.onFile`;
                const onSelectionCommand = `fileParser.run.${func.name}.onSelection`;
                updatedShortcuts.push({
                    "key": existingKeyMap.get(onFileCommand) || "",
                    "command": onFileCommand,
                    "when": "editorTextFocus"
                }, {
                    "key": existingKeyMap.get(onSelectionCommand) || "",
                    "command": onSelectionCommand,
                    "when": "editorHasSelection"
                });
            });
            // Add shortcuts for current pipelines (preserving existing keys)
            pipelines.forEach(pipeline => {
                const onFileCommand = `pipeline.run.${pipeline.name}.onFile`;
                const onSelectionCommand = `pipeline.run.${pipeline.name}.onSelection`;
                updatedShortcuts.push({
                    "key": existingKeyMap.get(onFileCommand) || "",
                    "command": onFileCommand,
                    "when": "editorTextFocus"
                }, {
                    "key": existingKeyMap.get(onSelectionCommand) || "",
                    "command": onSelectionCommand,
                    "when": "editorHasSelection"
                });
            });
            fs.writeFileSync(shortcutsPath, JSON.stringify(updatedShortcuts, null, 2), 'utf8');
        }
        catch (error) {
            console.error('Error updating shortcuts file with pipelines:', error);
        }
    }
    async refreshAndSyncAll(pipelines) {
        try {
            // Step 1: Refresh functions (reload from disk)
            this.loadFunctions();
            // Step 2: Update shortcuts file with current functions and pipelines
            this.updateShortcutsWithPipelines(pipelines);
            // Step 3: Sync with VS Code keybindings
            await this.syncKeyboardShortcuts();
            vscode.window.showInformationMessage(`✅ Complete refresh: Functions reloaded, shortcuts updated, and synced with VS Code!`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error during refresh and sync: ${error}`);
        }
    }
}
exports.FunctionManager = FunctionManager;
//# sourceMappingURL=functionManager.js.map
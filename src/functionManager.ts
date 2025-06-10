import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ParserFunction {
    name: string;
    description?: string;
    filePath: string;
    content: string;
    type: 'typescript' | 'declaration';
}

export class FunctionManager {
    private functions: ParserFunction[] = [];
    private functionsDir: string;

    constructor(private context: vscode.ExtensionContext) {
        this.functionsDir = path.join(context.globalStorageUri?.fsPath || context.extensionPath, 'parser-functions');
        this.ensureFunctionsDirectory();
        this.loadFunctions();
    }

    private ensureFunctionsDirectory(): void {
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
                "include": ["*.ts", "*.d.ts"],
                "exclude": ["*.compiled.js"]
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
            } catch (error) {
                console.warn('Failed to install Node.js types automatically:', error);
            }
        }
    }

    private loadFunctions(): void {
        try {
            const files = fs.readdirSync(this.functionsDir);
            this.functions = files
                .filter((file: string) =>
                    (file.endsWith('.ts') || file.endsWith('.d.ts')) &&
                    !file.endsWith('.compiled.js') // Exclude compiled TypeScript files
                )
                .map((file: string) => {
                    const filePath = path.join(this.functionsDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const name = path.basename(file, path.extname(file));
                    const isDeclaration = file.endsWith('.d.ts');

                    return {
                        name,
                        filePath,
                        content,
                        type: isDeclaration ? 'declaration' as const : 'typescript' as const,
                        description: this.extractDescription(content)
                    };
                });

        } catch (error) {
            console.error('Error loading functions:', error);
            this.functions = [];
        }
    }

    private extractDescription(content: string): string | undefined {
        const match = content.match(/\/\*\*\s*\n\s*\*\s*(.+)\s*\n/);
        return match ? match[1] : undefined;
    }

    getFunctions(): ParserFunction[] {
        return this.functions;
    }

    getFunctionsDirectory(): string {
        return this.functionsDir;
    }

    async createFunction(type: 'typescript' = 'typescript'): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter function name',
            placeHolder: 'myParserFunction'
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
            fs.writeFileSync(filePath, template, 'utf8');

            // Open the new function file for editing
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);

            this.loadFunctions();
            vscode.window.showInformationMessage(`TypeScript function '${name}' created successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Error creating function: ${error}`);
        }
    }

    async editFunction(name: string): Promise<void> {
        const func = this.functions.find(f => f.name === name);
        if (!func) {
            vscode.window.showErrorMessage(`Function '${name}' not found`);
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(func.filePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Error opening function: ${error}`);
        }
    }

    async deleteFunction(name: string): Promise<void> {
        const func = this.functions.find(f => f.name === name);
        if (!func) {
            vscode.window.showErrorMessage(`Function '${name}' not found`);
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            `Are you sure you want to delete function '${name}'?`,
            'Yes',
            'No'
        );

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
            } catch (error) {
                vscode.window.showErrorMessage(`Error deleting function: ${error}`);
            }
        }
    }

    private createFunctionTemplate(name: string, description?: string, type: 'typescript' = 'typescript'): string {
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

    getFunction(name: string): ParserFunction | undefined {
        return this.functions.find(f => f.name === name);
    }

    async compileTypeScriptFunction(filePath: string): Promise<string> {
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

    private updateShortcutsFile(): void {
        try {
            const shortcutsPath = path.join(this.functionsDir, 'shortcuts.json');
            const shortcuts: any[] = [];

            // Add shortcuts for executable functions only
            const executableFunctions = this.functions.filter(func => func.type === 'typescript');
            executableFunctions.forEach(func => {
                shortcuts.push(
                    {
                        "key": "",
                        "command": `fileParser.run.${func.name}.onFile`,
                        "when": "editorTextFocus"
                    },
                    {
                        "key": "",
                        "command": `fileParser.run.${func.name}.onSelection`,
                        "when": "editorHasSelection"
                    }
                );
            });

            fs.writeFileSync(shortcutsPath, JSON.stringify(shortcuts, null, 2), 'utf8');
        } catch (error) {
            console.error('Error updating shortcuts file:', error);
        }
    }

    async configureKeyboardShortcuts(): Promise<void> {
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

            vscode.window.showInformationMessage(
                'Edit keyboard shortcuts here, then use "Sync Keyboard Shortcuts" to apply them to VS Code.'
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Error opening shortcuts file: ${error}`);
        }
    }

    async editShortcuts(): Promise<void> {
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

            vscode.window.showInformationMessage(
                'Edit keyboard shortcuts here, then use "Sync Keyboard Shortcuts" to apply them to VS Code.'
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Error opening shortcuts file: ${error}`);
        }
    }

    async syncKeyboardShortcuts(): Promise<void> {
        const shortcutsPath = path.join(this.functionsDir, 'shortcuts.json');

        if (!fs.existsSync(shortcutsPath)) {
            vscode.window.showWarningMessage('No shortcuts.json file found. Create one using "Configure Keyboard Shortcuts" first.');
            return;
        }

        try {
            // Get VS Code keybindings file path
            const os = require('os');
            let keybindingsPath: string;

            if (process.platform === 'win32') {
                keybindingsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'keybindings.json');
            } else if (process.platform === 'darwin') {
                keybindingsPath = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'keybindings.json');
            } else {
                keybindingsPath = path.join(os.homedir(), '.config', 'Code', 'User', 'keybindings.json');
            }

            // Read existing VS Code keybindings
            let existingKeybindings: any[] = [];
            if (fs.existsSync(keybindingsPath)) {
                try {
                    let content = fs.readFileSync(keybindingsPath, 'utf8').trim();

                    // Remove comments and trailing commas for parsing
                    content = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
                    content = content.replace(/,(\s*[}\]])/g, '$1');

                    existingKeybindings = content ? JSON.parse(content) : [];
                } catch (parseError) {
                    const choice = await vscode.window.showErrorMessage(
                        'Failed to parse existing keybindings.json. Create backup and start fresh?',
                        'Yes', 'No'
                    );

                    if (choice === 'Yes') {
                        const backupPath = keybindingsPath + '.backup.' + Date.now();
                        fs.copyFileSync(keybindingsPath, backupPath);
                        existingKeybindings = [];
                        vscode.window.showInformationMessage(`Backup created: ${backupPath}`);
                    } else {
                        return;
                    }
                }
            }

            // STEP 1: Sync FROM VS Code TO local shortcuts.json
            // Read current local shortcuts
            let localShortcuts = JSON.parse(fs.readFileSync(shortcutsPath, 'utf8'));

            // Find existing scrapeyard shortcuts in VS Code
            const existingScrapeyardShortcuts = existingKeybindings.filter(
                (binding: any) => binding.command?.startsWith('fileParser.run.') || binding.command?.startsWith('pipeline.run.')
            );

            // Update local shortcuts with any existing VS Code bindings
            let updatedFromVscode = false;
            localShortcuts.forEach((localShortcut: any, index: number) => {
                const matchingVscodeShortcut = existingScrapeyardShortcuts.find(
                    (vscodeShortcut: any) => vscodeShortcut.command === localShortcut.command
                );

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
            existingKeybindings = existingKeybindings.filter(
                (binding: any) => !binding.command?.startsWith('fileParser.run.') && !binding.command?.startsWith('pipeline.run.')
            );

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
        } catch (error) {
            vscode.window.showErrorMessage(`Error syncing shortcuts: ${error}`);
        }
    }

    updateShortcutsWithPipelines(pipelines: any[]): void {
        try {
            const shortcutsPath = path.join(this.functionsDir, 'shortcuts.json');

            // Read existing shortcuts if they exist
            let existingShortcuts: any[] = [];
            if (fs.existsSync(shortcutsPath)) {
                try {
                    existingShortcuts = JSON.parse(fs.readFileSync(shortcutsPath, 'utf8'));
                } catch (error) {
                    console.warn('Could not parse existing shortcuts, starting fresh:', error);
                    existingShortcuts = [];
                }
            }

            // Separate scrapeyard shortcuts from custom ones
            const customShortcuts = existingShortcuts.filter(
                (shortcut: any) =>
                    !shortcut.command?.startsWith('fileParser.run.') &&
                    !shortcut.command?.startsWith('pipeline.run.')
            );

            const scrapeyardShortcuts = existingShortcuts.filter(
                (shortcut: any) =>
                    shortcut.command?.startsWith('fileParser.run.') ||
                    shortcut.command?.startsWith('pipeline.run.')
            );

            // Create a map of existing scrapeyard shortcuts to preserve key bindings
            const existingKeyMap = new Map<string, string>();
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

                updatedShortcuts.push(
                    {
                        "key": existingKeyMap.get(onFileCommand) || "",
                        "command": onFileCommand,
                        "when": "editorTextFocus"
                    },
                    {
                        "key": existingKeyMap.get(onSelectionCommand) || "",
                        "command": onSelectionCommand,
                        "when": "editorHasSelection"
                    }
                );
            });

            // Add shortcuts for current pipelines (preserving existing keys)
            pipelines.forEach(pipeline => {
                const onFileCommand = `pipeline.run.${pipeline.name}.onFile`;
                const onSelectionCommand = `pipeline.run.${pipeline.name}.onSelection`;

                updatedShortcuts.push(
                    {
                        "key": existingKeyMap.get(onFileCommand) || "",
                        "command": onFileCommand,
                        "when": "editorTextFocus"
                    },
                    {
                        "key": existingKeyMap.get(onSelectionCommand) || "",
                        "command": onSelectionCommand,
                        "when": "editorHasSelection"
                    }
                );
            });

            fs.writeFileSync(shortcutsPath, JSON.stringify(updatedShortcuts, null, 2), 'utf8');
        } catch (error) {
            console.error('Error updating shortcuts file with pipelines:', error);
        }
    }

    async refreshAndSyncAll(pipelines: any[]): Promise<void> {
        try {
            // Step 1: Refresh functions (reload from disk)
            this.loadFunctions();

            // Step 2: Update shortcuts file with current functions and pipelines
            this.updateShortcutsWithPipelines(pipelines);

            // Step 3: Sync with VS Code keybindings
            await this.syncKeyboardShortcuts();

            vscode.window.showInformationMessage(
                `✅ Complete refresh: Functions reloaded, shortcuts updated, and synced with VS Code!`
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Error during refresh and sync: ${error}`);
        }
    }
} 
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ParserFunction {
    name: string;
    description?: string;
    filePath: string;
    content: string;
    type: 'typescript';
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
                    file.endsWith('.ts') &&
                    !file.endsWith('.d.ts') && // Exclude TypeScript declaration files
                    !file.endsWith('.compiled.js') // Exclude compiled TypeScript files
                )
                .map((file: string) => {
                    const filePath = path.join(this.functionsDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const name = path.basename(file, path.extname(file));
                    return {
                        name,
                        filePath,
                        content,
                        type: 'typescript' as const,
                        description: this.extractDescription(content)
                    };
                });

            // Update shortcuts.json after loading functions
            this.updateShortcutsFile();
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

export default (input: string, ctx: Context): string => {
    // Your parsing logic here
    // Input: string containing file content or selection
    // Context: metadata about the file and selection + VS Code API (globally available)
    // Output: string with modified content
    
    // Example: Convert to uppercase and optionally write to file
    const result = input.toUpperCase();
    
    // Access context information:
    // ctx.fullPath - path to the file
    // ctx.selection.startLine, endLine, startChar, endChar - selection bounds
    // ctx.params - additional parameters
    // ctx.vscode - VS Code API (show messages, create files, etc.)
    
    // Example VS Code API usage:
    // ctx.vscode.window.showInformationMessage('Processing complete!');
    
    // Uncomment to write to file:
    // const outputPath = path.join(path.dirname(ctx.fullPath), 'output.txt');
    // fs.writeFileSync(outputPath, result, 'utf-8');
    
    return result;
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

            // Generate keybindings
            const keybindings: any[] = [];

            this.functions.forEach((func, index) => {
                keybindings.push({
                    key: `ctrl+shift+f${index + 1}`,
                    command: `fileParser.run.${func.name}.onSelection`,
                    when: "editorTextFocus"
                });
                keybindings.push({
                    key: `ctrl+alt+f${index + 1}`,
                    command: `fileParser.run.${func.name}.onFile`,
                    when: "editorTextFocus"
                });
            });

            fs.writeFileSync(shortcutsPath, JSON.stringify(keybindings, null, 2), 'utf8');
        } catch (error) {
            console.warn('Failed to update shortcuts.json:', error);
        }
    }
} 
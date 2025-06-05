import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ParserFunction {
    name: string;
    description?: string;
    filePath: string;
    content: string;
    type: 'javascript' | 'typescript';
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
    }

    private loadFunctions(): void {
        try {
            const files = fs.readdirSync(this.functionsDir);
            this.functions = files
                .filter((file: string) => 
                    (file.endsWith('.js') || file.endsWith('.ts')) && 
                    !file.endsWith('.compiled.js') // Exclude compiled TypeScript files
                )
                .map((file: string) => {
                    const filePath = path.join(this.functionsDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const name = path.basename(file, path.extname(file));
                    const type = file.endsWith('.ts') ? 'typescript' : 'javascript';
                    return {
                        name,
                        filePath,
                        content,
                        type,
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

    async createFunction(type: 'javascript' | 'typescript' = 'javascript'): Promise<void> {
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
        const extension = type === 'typescript' ? '.ts' : '.js';
        const filePath = path.join(this.functionsDir, `${name}${extension}`);

        try {
            fs.writeFileSync(filePath, template, 'utf8');
            
            // Open the new function file for editing
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            
            this.loadFunctions();
            vscode.window.showInformationMessage(`${type === 'typescript' ? 'TypeScript' : 'JavaScript'} function '${name}' created successfully!`);
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

    private createFunctionTemplate(name: string, description?: string, type: 'javascript' | 'typescript' = 'javascript'): string {
        const desc = description ? `/**\n * ${description}\n */\n` : '';
        
        if (type === 'typescript') {
            return `${desc}export default (input: string): string => {
    // Your parsing logic here
    // Input: string containing file content or selection
    // Output: string with modified content
    
    // Example: Convert to uppercase
    return input.toUpperCase();
};`;
        } else {
            return `${desc}function ${name}(input) {
    // Your parsing logic here
    // Input: string containing file content or selection
    // Output: string with modified content
    
    // Example: Convert to uppercase
    return input.toUpperCase();
}

module.exports = ${name};`;
        }
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
} 
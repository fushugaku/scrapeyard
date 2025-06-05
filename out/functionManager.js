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
    }
    ensureFunctionsDirectory() {
        if (!fs.existsSync(this.functionsDir)) {
            fs.mkdirSync(this.functionsDir, { recursive: true });
        }
    }
    loadFunctions() {
        try {
            const files = fs.readdirSync(this.functionsDir);
            this.functions = files
                .filter((file) => (file.endsWith('.js') || file.endsWith('.ts')) &&
                !file.endsWith('.compiled.js') // Exclude compiled TypeScript files
            )
                .map((file) => {
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
        }
        catch (error) {
            console.error('Error loading functions:', error);
            this.functions = [];
        }
    }
    extractDescription(content) {
        const match = content.match(/\/\*\*\s*\n\s*\*\s*(.+)\s*\n/);
        return match ? match[1] : undefined;
    }
    getFunctions() {
        return this.functions;
    }
    async createFunction(type = 'javascript') {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error creating function: ${error}`);
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
    createFunctionTemplate(name, description, type = 'javascript') {
        const desc = description ? `/**\n * ${description}\n */\n` : '';
        if (type === 'typescript') {
            return `${desc}export default (input: string): string => {
    // Your parsing logic here
    // Input: string containing file content or selection
    // Output: string with modified content
    
    // Example: Convert to uppercase
    return input.toUpperCase();
};`;
        }
        else {
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
}
exports.FunctionManager = FunctionManager;
//# sourceMappingURL=functionManager.js.map
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
exports.FunctionExecutor = void 0;
const vscode = __importStar(require("vscode"));
class FunctionExecutor {
    constructor(functionManager) {
        this.functionManager = functionManager;
    }
    async runOnCurrentFile(functionName) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const content = activeEditor.document.getText();
        await this.executeFunction(functionName, content, `${functionName}-result.txt`, false);
    }
    async runOnSelection(functionName) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const selection = activeEditor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage('No text selected');
            return;
        }
        const content = activeEditor.document.getText(selection);
        await this.executeFunction(functionName, content, '', true, activeEditor, selection);
    }
    async executeFunction(functionName, input, outputFileName, replaceInPlace = false, editor, selection) {
        const func = this.functionManager.getFunction(functionName);
        if (!func) {
            vscode.window.showErrorMessage(`Function '${functionName}' not found`);
            return;
        }
        try {
            let executablePath = func.filePath;
            // Compile TypeScript function
            executablePath = await this.functionManager.compileTypeScriptFunction(func.filePath);
            // Clear require cache to get fresh function
            delete require.cache[executablePath];
            // Get node_modules path from configuration
            const config = vscode.workspace.getConfiguration('fileParser');
            const nodeModulesPath = config.get('nodeModulesPath');
            // Set up module paths if node_modules path is configured
            if (nodeModulesPath) {
                const Module = require('module');
                const originalResolveFilename = Module._resolveFilename;
                Module._resolveFilename = function (request, parent) {
                    if (!request.startsWith('.') && !request.startsWith('/')) {
                        // Try to resolve from configured node_modules first
                        try {
                            return require.resolve(request, { paths: [nodeModulesPath] });
                        }
                        catch (error) {
                            // Fall back to default resolution
                        }
                    }
                    return originalResolveFilename.call(this, request, parent);
                };
            }
            // Load and execute the function
            const moduleExport = require(executablePath);
            // Handle TypeScript export patterns
            let userFunction;
            // For TypeScript with export default, the function is in default property
            if (moduleExport.default && typeof moduleExport.default === 'function') {
                userFunction = moduleExport.default;
            }
            else if (typeof moduleExport === 'function') {
                userFunction = moduleExport;
            }
            else {
                throw new Error(`TypeScript function should export a default function. Got: ${typeof moduleExport}`);
            }
            // Prepare context information
            const activeEditor = vscode.window.activeTextEditor;
            const filePath = activeEditor?.document.uri.fsPath || '';
            let contextSelection = {
                startLine: 0,
                endLine: 0,
                startChar: 0,
                endChar: 0
            };
            if (activeEditor) {
                if (selection && !selection.isEmpty) {
                    // Use the provided selection
                    contextSelection = {
                        startLine: selection.start.line,
                        endLine: selection.end.line,
                        startChar: selection.start.character,
                        endChar: selection.end.character
                    };
                }
                else {
                    // Entire file
                    const document = activeEditor.document;
                    const lastLine = document.lineCount - 1;
                    const lastLineText = document.lineAt(lastLine).text;
                    contextSelection = {
                        startLine: 0,
                        endLine: lastLine,
                        startChar: 0,
                        endChar: lastLineText.length
                    };
                }
            }
            const context = {
                fullPath: filePath,
                selection: contextSelection,
                params: {},
                vscode: vscode // Pass the VS Code API
            };
            const result = await userFunction(input, context);
            if (replaceInPlace && editor && selection) {
                // Replace the selected text in place
                const edit = new vscode.WorkspaceEdit();
                edit.replace(editor.document.uri, selection, result);
                await vscode.workspace.applyEdit(edit);
                vscode.window.showInformationMessage(`TypeScript function '${functionName}' applied to selection!`);
            }
            else {
                // Create virtual document with the result
                const uri = vscode.Uri.parse(`untitled:${outputFileName}`);
                const document = await vscode.workspace.openTextDocument(uri);
                const edit = new vscode.WorkspaceEdit();
                edit.insert(uri, new vscode.Position(0, 0), result);
                await vscode.workspace.applyEdit(edit);
                await vscode.window.showTextDocument(document);
                vscode.window.showInformationMessage(`TypeScript function '${functionName}' executed successfully!`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error executing function: ${error}`);
            console.error('Function execution error:', error);
        }
    }
}
exports.FunctionExecutor = FunctionExecutor;
//# sourceMappingURL=functionExecutor.js.map
import * as vscode from 'vscode';
import { FunctionManager } from './functionManager';

export class FunctionExecutor {
    constructor(private functionManager: FunctionManager) { }

    async runOnCurrentFile(functionName: string): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const content = activeEditor.document.getText();
        await this.executeFunction(functionName, content, `${functionName}-result.txt`, false);
    }

    async runOnSelection(functionName: string): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        let selection = activeEditor.selection;
        let content: string;

        if (selection.isEmpty) {
            // No text selected, use the current line
            const currentLine = activeEditor.document.lineAt(selection.active.line);
            selection = new vscode.Selection(currentLine.range.start, currentLine.range.end);
            content = currentLine.text;
        } else {
            content = activeEditor.document.getText(selection);
        }

        await this.executeFunction(functionName, content, '', true, activeEditor, selection);
    }

    private async executeFunction(
        functionName: string,
        input: string,
        outputFileName: string,
        replaceInPlace: boolean = false,
        editor?: vscode.TextEditor,
        selection?: vscode.Selection
    ): Promise<void> {
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
            const nodeModulesPath = config.get<string>('nodeModulesPath');

            // Set up module paths if node_modules path is configured
            if (nodeModulesPath) {
                const Module = require('module');
                const originalResolveFilename = Module._resolveFilename;

                Module._resolveFilename = function (request: string, parent: any) {
                    if (!request.startsWith('.') && !request.startsWith('/')) {
                        // Try to resolve from configured node_modules first
                        try {
                            return require.resolve(request, { paths: [nodeModulesPath] });
                        } catch (error) {
                            // Fall back to default resolution
                        }
                    }
                    return originalResolveFilename.call(this, request, parent);
                };
            }

            // Load and execute the function
            const moduleExport = require(executablePath);

            // Handle TypeScript export patterns
            let userFunction: Function;

            // For TypeScript with export default, the function is in default property
            if (moduleExport.default && typeof moduleExport.default === 'function') {
                userFunction = moduleExport.default;
            } else if (typeof moduleExport === 'function') {
                userFunction = moduleExport;
            } else {
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
                } else {
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
                params: {}, // Empty for now, can be extended later
                vscode: vscode // Pass the VS Code API
            };

            const functionResult = await userFunction(input, context);

            // Handle both old and new return formats for backward compatibility
            let result: string;
            let updatedContext: any = context;

            if (typeof functionResult === 'string') {
                // Old format: function returns string directly
                result = functionResult;
            } else if (functionResult && typeof functionResult === 'object' && 'result' in functionResult) {
                // New format: function returns {result, ctx}
                result = functionResult.result;
                updatedContext = functionResult.ctx || context;
            } else {
                throw new Error('Function must return either a string or an object with {result, ctx} properties');
            }

            if (replaceInPlace && editor && selection) {
                // Replace the selected text in place
                const edit = new vscode.WorkspaceEdit();
                edit.replace(editor.document.uri, selection, result);
                await vscode.workspace.applyEdit(edit);

                vscode.window.showInformationMessage(`TypeScript function '${functionName}' applied to selection!`);
            } else {
                // Create virtual document with the result
                const uri = vscode.Uri.parse(`untitled:${outputFileName}`);
                const document = await vscode.workspace.openTextDocument(uri);
                const edit = new vscode.WorkspaceEdit();
                edit.insert(uri, new vscode.Position(0, 0), result);
                await vscode.workspace.applyEdit(edit);
                await vscode.window.showTextDocument(document);

                vscode.window.showInformationMessage(`TypeScript function '${functionName}' executed successfully!`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error executing function: ${error}`);
            console.error('Function execution error:', error);
        }
    }
} 
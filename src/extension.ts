import * as vscode from 'vscode';
import { FunctionTreeDataProvider } from './functionTreeProvider';
import { FunctionManager } from './functionManager';
import { FunctionExecutor } from './functionExecutor';

let dynamicCommands: vscode.Disposable[] = [];

export function activate(context: vscode.ExtensionContext) {
    console.log('File Parser Extension is now active!');

    const functionManager = new FunctionManager(context);
    const functionExecutor = new FunctionExecutor(functionManager);
    const treeDataProvider = new FunctionTreeDataProvider(functionManager);

    // Register the tree data provider
    vscode.window.registerTreeDataProvider('fileParserFunctions', treeDataProvider);

    // Function to register dynamic commands for context menu
    function registerDynamicCommands() {
        // Clear existing dynamic commands
        dynamicCommands.forEach(cmd => cmd.dispose());
        dynamicCommands = [];

        const functions = functionManager.getFunctions();

        functions.forEach(func => {
            // Register context menu command
            const contextCommandId = `fileParser.contextMenu.${func.name}`;
            const contextCommand = vscode.commands.registerCommand(contextCommandId, async () => {
                await functionExecutor.runOnSelection(func.name);
            });

            // Register dedicated commands for keyboard shortcuts
            const runOnFileCommandId = `fileParser.run.${func.name}.onFile`;
            const runOnFileCommand = vscode.commands.registerCommand(runOnFileCommandId, async () => {
                await functionExecutor.runOnCurrentFile(func.name);
            });

            const runOnSelectionCommandId = `fileParser.run.${func.name}.onSelection`;
            const runOnSelectionCommand = vscode.commands.registerCommand(runOnSelectionCommandId, async () => {
                await functionExecutor.runOnSelection(func.name);
            });

            dynamicCommands.push(contextCommand, runOnFileCommand, runOnSelectionCommand);
            context.subscriptions.push(contextCommand, runOnFileCommand, runOnSelectionCommand);
        });

        // Update context menu contributions
        updateContextMenuContributions(functions);
    }

    // Function to update context menu contributions
    function updateContextMenuContributions(functions: any[]) {
        // Note: VSCode doesn't support dynamic menu contributions at runtime
        // We need to use a different approach - we'll register all commands
        // and use them through a picker when the context menu is triggered
    }

    // Register main context menu command
    const contextMenuCommand = vscode.commands.registerCommand('fileParser.showContextMenu', async () => {
        const functions = functionManager.getFunctions();

        if (functions.length === 0) {
            vscode.window.showInformationMessage('No functions available. Create some functions first!');
            return;
        }

        const items = functions.map(func => ({
            label: func.name,
            description: func.description || 'No description',
            detail: 'TypeScript',
            iconPath: new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('charts.blue')),
            functionName: func.name
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a function to run on the selected text',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selected) {
            await functionExecutor.runOnSelection(selected.functionName);
        }
    });

    // Register commands
    const refreshCommand = vscode.commands.registerCommand('fileParser.refreshFunctions', () => {
        treeDataProvider.refresh();
        registerDynamicCommands(); // Re-register dynamic commands when functions change
    });

    const createTypeScriptFunctionCommand = vscode.commands.registerCommand('fileParser.createTypeScriptFunction', async () => {
        await functionManager.createFunction('typescript');
        treeDataProvider.refresh();
        registerDynamicCommands(); // Re-register dynamic commands when functions change
    });

    const editFunctionCommand = vscode.commands.registerCommand('fileParser.editFunction', async (item: any) => {
        await functionManager.editFunction(item.label);
        treeDataProvider.refresh();
    });

    const deleteFunctionCommand = vscode.commands.registerCommand('fileParser.deleteFunction', async (item: any) => {
        await functionManager.deleteFunction(item.label);
        treeDataProvider.refresh();
        registerDynamicCommands(); // Re-register dynamic commands when functions change
    });

    const runOnFileCommand = vscode.commands.registerCommand('fileParser.runOnFile', async (item: any) => {
        await functionExecutor.runOnCurrentFile(item.label);
    });

    const runOnSelectionCommand = vscode.commands.registerCommand('fileParser.runOnSelection', async (item: any) => {
        await functionExecutor.runOnSelection(item.label);
    });

    const setNodeModulesPathCommand = vscode.commands.registerCommand('fileParser.setNodeModulesPath', async () => {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            canSelectFolders: true,
            canSelectFiles: false,
            openLabel: 'Select node_modules directory'
        };

        const folderUri = await vscode.window.showOpenDialog(options);
        if (folderUri && folderUri[0]) {
            const config = vscode.workspace.getConfiguration('fileParser');
            await config.update('nodeModulesPath', folderUri[0].fsPath, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Node modules path set to: ${folderUri[0].fsPath}`);
        }
    });

    const configureKeyboardShortcutsCommand = vscode.commands.registerCommand('fileParser.configureKeyboardShortcuts', async () => {
        const functions = functionManager.getFunctions();

        if (functions.length === 0) {
            vscode.window.showInformationMessage('No functions available. Create some functions first!');
            return;
        }

        // Generate keybindings as JSON array
        const keybindings: any[] = [];

        functions.forEach((func, index) => {
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

        // Save to local shortcuts.json file
        const functionsDir = functionManager.getFunctionsDirectory();
        const shortcutsPath = require('path').join(functionsDir, 'shortcuts.json');

        try {
            require('fs').writeFileSync(shortcutsPath, JSON.stringify(keybindings, null, 2), 'utf8');

            // Open the shortcuts.json file for editing
            const document = await vscode.workspace.openTextDocument(shortcutsPath);
            await vscode.window.showTextDocument(document);

            vscode.window.showInformationMessage('Shortcuts saved to shortcuts.json. Edit as needed, then use "Sync Keyboard Shortcuts" to apply.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save shortcuts.json: ${error}`);
        }
    });

    const syncKeyboardShortcutsCommand = vscode.commands.registerCommand('fileParser.syncKeyboardShortcuts', async () => {
        try {
            // Get shortcuts from local shortcuts.json file
            const functionsDir = functionManager.getFunctionsDirectory();
            const shortcutsPath = require('path').join(functionsDir, 'shortcuts.json');
            const fs = require('fs');

            let newKeybindings: any[] = [];

            if (fs.existsSync(shortcutsPath)) {
                try {
                    const content = fs.readFileSync(shortcutsPath, 'utf8');
                    newKeybindings = JSON.parse(content);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to parse shortcuts.json: ${error}\n\nPlease check the file format.`);
                    return;
                }
            } else {
                vscode.window.showWarningMessage('No shortcuts.json file found. Use "Configure Keyboard Shortcuts" first.');
                return;
            }

            // Get VS Code's keybindings file path
            const os = require('os');
            const path = require('path');

            let keybindingsPath: string;
            const platform = os.platform();

            if (platform === 'darwin') {
                // macOS
                keybindingsPath = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'keybindings.json');
            } else if (platform === 'win32') {
                // Windows
                keybindingsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'keybindings.json');
            } else {
                // Linux
                keybindingsPath = path.join(os.homedir(), '.config', 'Code', 'User', 'keybindings.json');
            }

            console.log(`Syncing keyboard shortcuts...`);
            console.log(`Shortcuts file: ${shortcutsPath}`);
            console.log(`VS Code keybindings: ${keybindingsPath}`);
            console.log(`Found ${newKeybindings.length} shortcuts to sync`);

            // Read existing keybindings
            let existingKeybindings: any[] = [];

            if (fs.existsSync(keybindingsPath)) {
                try {
                    const content = fs.readFileSync(keybindingsPath, 'utf8');

                    if (content.trim()) {
                        // Try to clean up common JSON issues in VS Code files
                        let cleanedContent = content.trim();

                        // Remove comments (lines starting with //)
                        cleanedContent = cleanedContent.replace(/^\s*\/\/.*$/gm, '');

                        // Remove trailing commas before } or ]
                        cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, '$1');

                        // Try parsing the cleaned content
                        existingKeybindings = JSON.parse(cleanedContent);

                        // Ensure it's an array
                        if (!Array.isArray(existingKeybindings)) {
                            existingKeybindings = [];
                        }
                    }
                } catch (parseError) {
                    // If parsing still fails, show more helpful error and let user choose
                    const choice = await vscode.window.showErrorMessage(
                        `Cannot parse existing keybindings.json. The file may have syntax errors.\n\nError: ${parseError}\n\nChoose an option:`,
                        'Create backup and replace',
                        'Cancel sync',
                        'View file'
                    );

                    if (choice === 'Create backup and replace') {
                        // Create backup of the problematic file
                        const backupPath = keybindingsPath + '.backup.' + Date.now();
                        fs.copyFileSync(keybindingsPath, backupPath);
                        existingKeybindings = [];
                        vscode.window.showWarningMessage(`Created backup at ${backupPath} and starting with empty keybindings.`);
                    } else if (choice === 'View file') {
                        // Open the problematic file for user to fix
                        const document = await vscode.workspace.openTextDocument(keybindingsPath);
                        await vscode.window.showTextDocument(document);
                        return;
                    } else {
                        // Cancel
                        return;
                    }
                }
            } else {
                console.log('No existing keybindings.json file found, will create new one');
            }

            // Remove old Scrapeyard keybindings
            const originalCount = existingKeybindings.length;
            existingKeybindings = existingKeybindings.filter((binding: any) =>
                !binding.command || !binding.command.startsWith('fileParser.run.')
            );
            const removedCount = originalCount - existingKeybindings.length;

            // Add new Scrapeyard keybindings
            const mergedKeybindings = [...existingKeybindings, ...newKeybindings];

            // Write back to file
            fs.writeFileSync(keybindingsPath, JSON.stringify(mergedKeybindings, null, 2), 'utf8');

            console.log(`Removed ${removedCount} old Scrapeyard shortcuts, added ${newKeybindings.length} new ones`);
            vscode.window.showInformationMessage(`Keyboard shortcuts synced! Removed ${removedCount} old shortcuts, added ${newKeybindings.length} new shortcuts from shortcuts.json to VS Code.`);

        } catch (error) {
            console.error('Sync error:', error);
            vscode.window.showErrorMessage(`Failed to sync keyboard shortcuts: ${error}`);
        }
    });

    // Initial registration of dynamic commands
    registerDynamicCommands();

    // Add all commands to context subscriptions
    context.subscriptions.push(
        refreshCommand,
        createTypeScriptFunctionCommand,
        editFunctionCommand,
        deleteFunctionCommand,
        runOnFileCommand,
        runOnSelectionCommand,
        setNodeModulesPathCommand,
        configureKeyboardShortcutsCommand,
        syncKeyboardShortcutsCommand,
        contextMenuCommand
    );
}

export function deactivate() {
    // Clean up dynamic commands
    dynamicCommands.forEach(cmd => cmd.dispose());
} 
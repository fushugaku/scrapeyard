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
            const commandId = `fileParser.contextMenu.${func.name}`;
            const command = vscode.commands.registerCommand(commandId, async () => {
                await functionExecutor.runOnSelection(func.name);
            });
            
            dynamicCommands.push(command);
            context.subscriptions.push(command);
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
            detail: func.type === 'typescript' ? 'TypeScript' : 'JavaScript',
            iconPath: func.type === 'typescript' 
                ? new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('charts.blue'))
                : new vscode.ThemeIcon('symbol-function', new vscode.ThemeColor('charts.yellow')),
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

    const createFunctionCommand = vscode.commands.registerCommand('fileParser.createFunction', async () => {
        await functionManager.createFunction('javascript');
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

    // Initial registration of dynamic commands
    registerDynamicCommands();

    // Add all commands to context subscriptions
    context.subscriptions.push(
        refreshCommand,
        createFunctionCommand,
        createTypeScriptFunctionCommand,
        editFunctionCommand,
        deleteFunctionCommand,
        runOnFileCommand,
        runOnSelectionCommand,
        setNodeModulesPathCommand,
        contextMenuCommand
    );
}

export function deactivate() {
    // Clean up dynamic commands
    dynamicCommands.forEach(cmd => cmd.dispose());
} 
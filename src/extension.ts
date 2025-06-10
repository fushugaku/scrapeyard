import * as vscode from 'vscode';
import * as path from 'path';
import { FunctionTreeDataProvider } from './functionTreeProvider';
import { FunctionManager } from './functionManager';
import { FunctionExecutor } from './functionExecutor';
import { PipelineManager } from './pipelineManager';
import { PipelineTreeProvider } from './pipelineTreeProvider';

// Dynamic commands tracking
const dynamicCommands: vscode.Disposable[] = [];



export function activate(context: vscode.ExtensionContext) {
    console.log('File Parser Extension is now active!');

    const functionManager = new FunctionManager(context);
    const functionExecutor = new FunctionExecutor(functionManager);
    const pipelineManager = new PipelineManager(context, functionManager, functionExecutor);

    const functionTreeProvider = new FunctionTreeDataProvider(functionManager);
    const pipelineTreeProvider = new PipelineTreeProvider(pipelineManager);

    // Register tree views
    vscode.window.createTreeView('scrapeyardFunctions', {
        treeDataProvider: functionTreeProvider,
        dragAndDropController: functionTreeProvider
    });

    vscode.window.createTreeView('scrapeyardPipelines', {
        treeDataProvider: pipelineTreeProvider
    });

    // Function management commands
    let createFunctionCommand = vscode.commands.registerCommand('scrapeyard.createFunction', async () => {
        await functionManager.createFunction();
        functionTreeProvider.refresh();
        pipelineTreeProvider.refresh(); // Refresh pipelines in case they reference functions
    });

    let createFolderCommand = vscode.commands.registerCommand('scrapeyard.createFolder', async () => {
        await functionManager.createFolder();
        functionTreeProvider.refresh();
    });

    let deleteFolderCommand = vscode.commands.registerCommand('scrapeyard.deleteFolder', async (item: any) => {
        // Handle both direct string calls and tree item object calls
        const folderPath = typeof item === 'string' ? item : item?.directoryNode?.path;
        if (folderPath !== undefined) {
            // Get functions that will be deleted for pipeline cleanup
            const functionsToDelete = functionManager.getFunctions().filter(func =>
                func.relativePath.startsWith(folderPath + path.sep) ||
                path.dirname(func.relativePath) === folderPath
            );

            // Remove deleted functions from all pipelines
            let totalRemovedSteps = 0;
            const affectedPipelines: string[] = [];

            for (const func of functionsToDelete) {
                const cleanup = pipelineManager.removeFunctionFromAllPipelines(func.name);
                totalRemovedSteps += cleanup.totalRemoved;
                affectedPipelines.push(...cleanup.affectedPipelines);
            }

            await functionManager.deleteFolder(folderPath);
            functionTreeProvider.refresh();
            pipelineTreeProvider.refresh();

            // Show pipeline cleanup information if any pipelines were affected
            if (totalRemovedSteps > 0) {
                const uniquePipelines = [...new Set(affectedPipelines)];
                const pipelineList = uniquePipelines.join(', ');
                vscode.window.showInformationMessage(
                    `Removed ${totalRemovedSteps} step(s) from pipeline(s): ${pipelineList}`
                );
            }
        } else {
            vscode.window.showErrorMessage('Could not determine folder path');
        }
    });

    let editFunctionCommand = vscode.commands.registerCommand('scrapeyard.editFunction', async (item: any) => {
        // Handle both direct string calls and tree item object calls
        const functionName = typeof item === 'string' ? item : item?.label;
        if (functionName) {
            await functionManager.editFunction(functionName);
        } else {
            vscode.window.showErrorMessage('Could not determine function name');
        }
    });

    let deleteFunctionCommand = vscode.commands.registerCommand('scrapeyard.deleteFunction', async (item: any) => {
        // Handle both direct string calls and tree item object calls
        const functionName = typeof item === 'string' ? item : item?.label;
        if (functionName) {
            // First remove the function from all pipelines
            const pipelineCleanup = pipelineManager.removeFunctionFromAllPipelines(functionName);

            // Then delete the function itself
            await functionManager.deleteFunction(functionName);
            functionTreeProvider.refresh();
            pipelineTreeProvider.refresh();

            // Show cleanup information if any pipelines were affected
            if (pipelineCleanup.totalRemoved > 0) {
                const pipelineList = pipelineCleanup.affectedPipelines.join(', ');
                vscode.window.showInformationMessage(
                    `Function '${functionName}' removed from ${pipelineCleanup.totalRemoved} step(s) in pipeline(s): ${pipelineList}`
                );
            }
        } else {
            vscode.window.showErrorMessage('Could not determine function name');
        }
    });

    let refreshFunctionsCommand = vscode.commands.registerCommand('scrapeyard.refreshFunctions', () => {
        functionTreeProvider.refresh();
        pipelineTreeProvider.refresh();

        // Update shortcuts when refreshing
        const pipelines = pipelineManager.getPipelines();
        functionManager.updateShortcutsWithPipelines(pipelines);
    });

    // Function execution commands  
    let runFunctionOnFileCommand = vscode.commands.registerCommand('scrapeyard.runFunctionOnFile', async (item: any) => {
        const functionName = typeof item === 'string' ? item : item?.label;
        if (functionName) {
            await functionExecutor.runOnCurrentFile(functionName);
        } else {
            vscode.window.showErrorMessage('Could not determine function name');
        }
    });

    let runFunctionOnSelectionCommand = vscode.commands.registerCommand('scrapeyard.runFunctionOnSelection', async (item: any) => {
        const functionName = typeof item === 'string' ? item : item?.label;
        if (functionName) {
            await functionExecutor.runOnSelection(functionName);
        } else {
            vscode.window.showErrorMessage('Could not determine function name');
        }
    });

    // Pipeline management commands
    let createPipelineCommand = vscode.commands.registerCommand('scrapeyard.createPipeline', async () => {
        await pipelineManager.createPipeline();
        pipelineTreeProvider.refresh();
    });

    let editPipelineCommand = vscode.commands.registerCommand('scrapeyard.editPipeline', async (item: any) => {
        // Handle both direct string calls and tree item object calls
        const pipelineName = typeof item === 'string' ? item : item?.pipeline?.name || item?.label;
        if (pipelineName) {
            await pipelineManager.editPipeline(pipelineName);
            pipelineTreeProvider.refresh();
        } else {
            vscode.window.showErrorMessage('Could not determine pipeline name');
        }
    });

    let deletePipelineCommand = vscode.commands.registerCommand('scrapeyard.deletePipeline', async (item: any) => {
        // Handle both direct string calls and tree item object calls
        const pipelineName = typeof item === 'string' ? item : item?.pipeline?.name || item?.label;
        if (pipelineName) {
            await pipelineManager.deletePipeline(pipelineName);
            pipelineTreeProvider.refresh();
        } else {
            vscode.window.showErrorMessage('Could not determine pipeline name');
        }
    });

    let runPipelineOnFileCommand = vscode.commands.registerCommand('scrapeyard.runPipelineOnFile', async (item: any) => {
        const pipelineName = typeof item === 'string' ? item : item?.pipeline?.name || item?.label;
        if (pipelineName) {
            await pipelineManager.runPipelineOnCurrentFile(pipelineName);
        } else {
            vscode.window.showErrorMessage('Could not determine pipeline name');
        }
    });

    let runPipelineOnSelectionCommand = vscode.commands.registerCommand('scrapeyard.runPipelineOnSelection', async (item: any) => {
        const pipelineName = typeof item === 'string' ? item : item?.pipeline?.name || item?.label;
        if (pipelineName) {
            await pipelineManager.runPipelineOnSelection(pipelineName);
        } else {
            vscode.window.showErrorMessage('Could not determine pipeline name');
        }
    });

    let movePipelineStepUpCommand = vscode.commands.registerCommand('scrapeyard.movePipelineStepUp', async (item: any) => {
        // Handle tree item object
        const pipelineName = item?.pipeline?.name;
        const stepIndex = item?.index;

        if (pipelineName !== undefined && stepIndex !== undefined) {
            await pipelineManager.movePipelineStepUp(pipelineName, stepIndex);
            pipelineTreeProvider.refresh();
        } else {
            vscode.window.showErrorMessage('Could not determine pipeline step information');
        }
    });

    let movePipelineStepDownCommand = vscode.commands.registerCommand('scrapeyard.movePipelineStepDown', async (item: any) => {
        // Handle tree item object
        const pipelineName = item?.pipeline?.name;
        const stepIndex = item?.index;

        if (pipelineName !== undefined && stepIndex !== undefined) {
            await pipelineManager.movePipelineStepDown(pipelineName, stepIndex);
            pipelineTreeProvider.refresh();
        } else {
            vscode.window.showErrorMessage('Could not determine pipeline step information');
        }
    });

    let togglePipelineStepCommand = vscode.commands.registerCommand('scrapeyard.togglePipelineStep', async (item: any) => {
        // Handle tree item object
        const pipelineName = item?.pipeline?.name;
        const stepIndex = item?.index;

        if (pipelineName !== undefined && stepIndex !== undefined) {
            await pipelineManager.togglePipelineStep(pipelineName, stepIndex);
            pipelineTreeProvider.refresh();
        } else {
            vscode.window.showErrorMessage('Could not determine pipeline step information');
        }
    });

    let removePipelineStepCommand = vscode.commands.registerCommand('scrapeyard.removePipelineStep', async (item: any) => {
        // Handle tree item object
        const pipelineName = item?.pipeline?.name;
        const stepIndex = item?.index;
        const stepName = item?.step?.functionName;

        if (pipelineName !== undefined && stepIndex !== undefined) {
            const confirmation = await vscode.window.showWarningMessage(
                `Are you sure you want to remove '${stepName}' from pipeline '${pipelineName}'?`,
                'Yes',
                'No'
            );

            if (confirmation === 'Yes') {
                await pipelineManager.removePipelineStep(pipelineName, stepIndex);
                pipelineTreeProvider.refresh();
            }
        } else {
            vscode.window.showErrorMessage('Could not determine pipeline step information');
        }
    });

    // Keyboard shortcuts commands
    let configureKeyboardShortcutsCommand = vscode.commands.registerCommand('scrapeyard.configureKeyboardShortcuts', async () => {
        await functionManager.configureKeyboardShortcuts();
    });

    let syncKeyboardShortcutsCommand = vscode.commands.registerCommand('scrapeyard.syncKeyboardShortcuts', async () => {
        await functionManager.syncKeyboardShortcuts();
    });

    let editShortcutsCommand = vscode.commands.registerCommand('scrapeyard.editShortcuts', async () => {
        await functionManager.editShortcuts();
    });

    // Context menu picker commands
    let runFunctionOnSelectionPickerCommand = vscode.commands.registerCommand('scrapeyard.runFunctionOnSelectionPicker', async () => {
        const allFunctions = functionManager.getFunctions();
        const executableFunctions = allFunctions.filter(func => func.type === 'typescript');

        if (executableFunctions.length === 0) {
            vscode.window.showInformationMessage('No executable functions available. Create some TypeScript functions first!');
            return;
        }

        const functionItems = executableFunctions.map(func => ({
            label: func.name,
            description: func.description || 'No description'
        }));

        const selectedFunction = await vscode.window.showQuickPick(functionItems, {
            placeHolder: 'Select a function to run on the selected text'
        });

        if (selectedFunction) {
            await functionExecutor.runOnSelection(selectedFunction.label);
        }
    });

    let runPipelineOnSelectionPickerCommand = vscode.commands.registerCommand('scrapeyard.runPipelineOnSelectionPicker', async () => {
        const pipelines = pipelineManager.getPipelines();

        if (pipelines.length === 0) {
            vscode.window.showInformationMessage('No pipelines available. Create some pipelines first!');
            return;
        }

        const pipelineItems = pipelines.map(pipeline => ({
            label: pipeline.name,
            description: pipeline.description || 'No description',
            detail: `${pipeline.steps.length} step(s)`
        }));

        const selectedPipeline = await vscode.window.showQuickPick(pipelineItems, {
            placeHolder: 'Select a pipeline to run on the selected text'
        });

        if (selectedPipeline) {
            await pipelineManager.runPipelineOnSelection(selectedPipeline.label);
        }
    });

    // Update shortcuts whenever functions or pipelines change
    let updateShortcutsCommand = vscode.commands.registerCommand('scrapeyard.updateShortcuts', async () => {
        const pipelines = pipelineManager.getPipelines();
        functionManager.updateShortcutsWithPipelines(pipelines);
        vscode.window.showInformationMessage('Shortcuts updated with current functions and pipelines');
    });

    // Unified refresh and sync command
    let refreshAndSyncAllCommand = vscode.commands.registerCommand('scrapeyard.refreshAndSyncAll', async () => {
        const pipelines = pipelineManager.getPipelines();
        await functionManager.refreshAndSyncAll(pipelines);
        functionTreeProvider.refresh();
        pipelineTreeProvider.refresh();
    });

    // Open terminal with functions directory
    let openTerminalWithContentsCommand = vscode.commands.registerCommand('scrapeyard.openTerminalWithContents', async () => {
        const functionsDirectory = functionManager.getFunctionsDirectory();

        const terminal = vscode.window.createTerminal({
            name: 'Scrapeyard Functions',
            cwd: functionsDirectory
        });

        terminal.show();
        vscode.window.showInformationMessage(`Terminal opened in functions directory: ${functionsDirectory}`);
    });

    // Register all commands with the context
    context.subscriptions.push(
        createFunctionCommand,
        createFolderCommand,
        deleteFolderCommand,
        editFunctionCommand,
        deleteFunctionCommand,
        refreshFunctionsCommand,
        runFunctionOnFileCommand,
        runFunctionOnSelectionCommand,
        createPipelineCommand,
        editPipelineCommand,
        deletePipelineCommand,
        runPipelineOnFileCommand,
        runPipelineOnSelectionCommand,
        movePipelineStepUpCommand,
        movePipelineStepDownCommand,
        togglePipelineStepCommand,
        removePipelineStepCommand,
        configureKeyboardShortcutsCommand,
        syncKeyboardShortcutsCommand,
        editShortcutsCommand,
        updateShortcutsCommand,
        refreshAndSyncAllCommand,
        runFunctionOnSelectionPickerCommand,
        runPipelineOnSelectionPickerCommand,
        openTerminalWithContentsCommand
    );

    // Dynamic command registration for existing functions
    const functions = functionManager.getFunctions();
    const executableFunctions = functions.filter(func => func.type === 'typescript');
    for (const func of executableFunctions) {
        const onFileCommand = vscode.commands.registerCommand(`fileParser.run.${func.name}.onFile`, async () => {
            await functionExecutor.runOnCurrentFile(func.name);
        });

        const onSelectionCommand = vscode.commands.registerCommand(`fileParser.run.${func.name}.onSelection`, async () => {
            await functionExecutor.runOnSelection(func.name);
        });

        context.subscriptions.push(onFileCommand, onSelectionCommand);
    }

    // Dynamic command registration for existing pipelines
    const pipelines = pipelineManager.getPipelines();
    for (const pipeline of pipelines) {
        const onFileCommand = vscode.commands.registerCommand(`pipeline.run.${pipeline.name}.onFile`, async () => {
            await pipelineManager.runPipelineOnCurrentFile(pipeline.name);
        });

        const onSelectionCommand = vscode.commands.registerCommand(`pipeline.run.${pipeline.name}.onSelection`, async () => {
            await pipelineManager.runPipelineOnSelection(pipeline.name);
        });

        context.subscriptions.push(onFileCommand, onSelectionCommand);
    }
}

export function deactivate() {
    // Clean up dynamic commands
    dynamicCommands.forEach(cmd => cmd.dispose());
} 
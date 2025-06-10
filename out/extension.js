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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const functionTreeProvider_1 = require("./functionTreeProvider");
const functionManager_1 = require("./functionManager");
const functionExecutor_1 = require("./functionExecutor");
const pipelineManager_1 = require("./pipelineManager");
const pipelineTreeProvider_1 = require("./pipelineTreeProvider");
// Dynamic commands tracking
const dynamicCommands = [];
function activate(context) {
    console.log('File Parser Extension is now active!');
    const functionManager = new functionManager_1.FunctionManager(context);
    const functionExecutor = new functionExecutor_1.FunctionExecutor(functionManager);
    const pipelineManager = new pipelineManager_1.PipelineManager(context, functionManager, functionExecutor);
    const functionTreeProvider = new functionTreeProvider_1.FunctionTreeDataProvider(functionManager);
    const pipelineTreeProvider = new pipelineTreeProvider_1.PipelineTreeProvider(pipelineManager);
    // Register tree views
    vscode.window.createTreeView('scrapeyardFunctions', {
        treeDataProvider: functionTreeProvider
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
    let editFunctionCommand = vscode.commands.registerCommand('scrapeyard.editFunction', async (item) => {
        // Handle both direct string calls and tree item object calls
        const functionName = typeof item === 'string' ? item : item?.label;
        if (functionName) {
            await functionManager.editFunction(functionName);
        }
        else {
            vscode.window.showErrorMessage('Could not determine function name');
        }
    });
    let deleteFunctionCommand = vscode.commands.registerCommand('scrapeyard.deleteFunction', async (item) => {
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
                vscode.window.showInformationMessage(`Function '${functionName}' removed from ${pipelineCleanup.totalRemoved} step(s) in pipeline(s): ${pipelineList}`);
            }
        }
        else {
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
    let runFunctionOnFileCommand = vscode.commands.registerCommand('scrapeyard.runFunctionOnFile', async (item) => {
        const functionName = typeof item === 'string' ? item : item?.label;
        if (functionName) {
            await functionExecutor.runOnCurrentFile(functionName);
        }
        else {
            vscode.window.showErrorMessage('Could not determine function name');
        }
    });
    let runFunctionOnSelectionCommand = vscode.commands.registerCommand('scrapeyard.runFunctionOnSelection', async (item) => {
        const functionName = typeof item === 'string' ? item : item?.label;
        if (functionName) {
            await functionExecutor.runOnSelection(functionName);
        }
        else {
            vscode.window.showErrorMessage('Could not determine function name');
        }
    });
    // Pipeline management commands
    let createPipelineCommand = vscode.commands.registerCommand('scrapeyard.createPipeline', async () => {
        await pipelineManager.createPipeline();
        pipelineTreeProvider.refresh();
    });
    let editPipelineCommand = vscode.commands.registerCommand('scrapeyard.editPipeline', async (item) => {
        // Handle both direct string calls and tree item object calls
        const pipelineName = typeof item === 'string' ? item : item?.pipeline?.name || item?.label;
        if (pipelineName) {
            await pipelineManager.editPipeline(pipelineName);
            pipelineTreeProvider.refresh();
        }
        else {
            vscode.window.showErrorMessage('Could not determine pipeline name');
        }
    });
    let deletePipelineCommand = vscode.commands.registerCommand('scrapeyard.deletePipeline', async (item) => {
        // Handle both direct string calls and tree item object calls
        const pipelineName = typeof item === 'string' ? item : item?.pipeline?.name || item?.label;
        if (pipelineName) {
            await pipelineManager.deletePipeline(pipelineName);
            pipelineTreeProvider.refresh();
        }
        else {
            vscode.window.showErrorMessage('Could not determine pipeline name');
        }
    });
    let runPipelineOnFileCommand = vscode.commands.registerCommand('scrapeyard.runPipelineOnFile', async (item) => {
        const pipelineName = typeof item === 'string' ? item : item?.pipeline?.name || item?.label;
        if (pipelineName) {
            await pipelineManager.runPipelineOnCurrentFile(pipelineName);
        }
        else {
            vscode.window.showErrorMessage('Could not determine pipeline name');
        }
    });
    let runPipelineOnSelectionCommand = vscode.commands.registerCommand('scrapeyard.runPipelineOnSelection', async (item) => {
        const pipelineName = typeof item === 'string' ? item : item?.pipeline?.name || item?.label;
        if (pipelineName) {
            await pipelineManager.runPipelineOnSelection(pipelineName);
        }
        else {
            vscode.window.showErrorMessage('Could not determine pipeline name');
        }
    });
    let movePipelineStepUpCommand = vscode.commands.registerCommand('scrapeyard.movePipelineStepUp', async (item) => {
        // Handle tree item object
        const pipelineName = item?.pipeline?.name;
        const stepIndex = item?.index;
        if (pipelineName !== undefined && stepIndex !== undefined) {
            await pipelineManager.movePipelineStepUp(pipelineName, stepIndex);
            pipelineTreeProvider.refresh();
        }
        else {
            vscode.window.showErrorMessage('Could not determine pipeline step information');
        }
    });
    let movePipelineStepDownCommand = vscode.commands.registerCommand('scrapeyard.movePipelineStepDown', async (item) => {
        // Handle tree item object
        const pipelineName = item?.pipeline?.name;
        const stepIndex = item?.index;
        if (pipelineName !== undefined && stepIndex !== undefined) {
            await pipelineManager.movePipelineStepDown(pipelineName, stepIndex);
            pipelineTreeProvider.refresh();
        }
        else {
            vscode.window.showErrorMessage('Could not determine pipeline step information');
        }
    });
    let togglePipelineStepCommand = vscode.commands.registerCommand('scrapeyard.togglePipelineStep', async (item) => {
        // Handle tree item object
        const pipelineName = item?.pipeline?.name;
        const stepIndex = item?.index;
        if (pipelineName !== undefined && stepIndex !== undefined) {
            await pipelineManager.togglePipelineStep(pipelineName, stepIndex);
            pipelineTreeProvider.refresh();
        }
        else {
            vscode.window.showErrorMessage('Could not determine pipeline step information');
        }
    });
    let removePipelineStepCommand = vscode.commands.registerCommand('scrapeyard.removePipelineStep', async (item) => {
        // Handle tree item object
        const pipelineName = item?.pipeline?.name;
        const stepIndex = item?.index;
        const stepName = item?.step?.functionName;
        if (pipelineName !== undefined && stepIndex !== undefined) {
            const confirmation = await vscode.window.showWarningMessage(`Are you sure you want to remove '${stepName}' from pipeline '${pipelineName}'?`, 'Yes', 'No');
            if (confirmation === 'Yes') {
                await pipelineManager.removePipelineStep(pipelineName, stepIndex);
                pipelineTreeProvider.refresh();
            }
        }
        else {
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
    // Register all commands with the context
    context.subscriptions.push(createFunctionCommand, editFunctionCommand, deleteFunctionCommand, refreshFunctionsCommand, runFunctionOnFileCommand, runFunctionOnSelectionCommand, createPipelineCommand, editPipelineCommand, deletePipelineCommand, runPipelineOnFileCommand, runPipelineOnSelectionCommand, movePipelineStepUpCommand, movePipelineStepDownCommand, togglePipelineStepCommand, removePipelineStepCommand, configureKeyboardShortcutsCommand, syncKeyboardShortcutsCommand, editShortcutsCommand, updateShortcutsCommand, refreshAndSyncAllCommand, runFunctionOnSelectionPickerCommand, runPipelineOnSelectionPickerCommand);
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
exports.activate = activate;
function deactivate() {
    // Clean up dynamic commands
    dynamicCommands.forEach(cmd => cmd.dispose());
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
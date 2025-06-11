import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FunctionManager } from './functionManager';
import { FunctionExecutor } from './functionExecutor';

interface Pipeline {
  name: string;
  description?: string;
  steps: PipelineStep[];
}

interface PipelineStep {
  functionName: string;
  enabled: boolean;
}

export class PipelineManager {
  private pipelines: Pipeline[] = [];
  private pipelinesDir: string;

  constructor(
    private context: vscode.ExtensionContext,
    private functionManager: FunctionManager,
    private functionExecutor: FunctionExecutor
  ) {
    this.pipelinesDir = path.join(context.globalStorageUri?.fsPath || context.extensionPath, 'pipelines');
    this.ensurePipelinesDirectory();
    this.loadPipelines();
  }

  private ensurePipelinesDirectory(): void {
    if (!fs.existsSync(this.pipelinesDir)) {
      fs.mkdirSync(this.pipelinesDir, { recursive: true });
    }
  }

  private loadPipelines(): void {
    try {
      const pipelinesFile = path.join(this.pipelinesDir, 'pipelines.json');
      if (fs.existsSync(pipelinesFile)) {
        const content = fs.readFileSync(pipelinesFile, 'utf8');
        this.pipelines = JSON.parse(content);
      }
    } catch (error) {
      console.error('Error loading pipelines:', error);
      this.pipelines = [];
    }
  }

  private savePipelines(): void {
    try {
      const pipelinesFile = path.join(this.pipelinesDir, 'pipelines.json');
      fs.writeFileSync(pipelinesFile, JSON.stringify(this.pipelines, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving pipelines:', error);
    }
  }

  getPipelines(): Pipeline[] {
    return this.pipelines;
  }

  async createPipeline(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter pipeline name',
      placeHolder: 'myPipeline'
    });

    if (!name) {
      return;
    }

    const description = await vscode.window.showInputBox({
      prompt: 'Enter pipeline description (optional)',
      placeHolder: 'What does this pipeline do?'
    });

    const newPipeline: Pipeline = {
      name,
      description,
      steps: []
    };

    this.pipelines.push(newPipeline);
    this.savePipelines();

    vscode.window.showInformationMessage(`Pipeline '${name}' created successfully!`);
  }

  async editPipeline(pipelineName: string): Promise<void> {
    const pipeline = this.pipelines.find(p => p.name === pipelineName);
    if (!pipeline) {
      vscode.window.showErrorMessage(`Pipeline '${pipelineName}' not found`);
      return;
    }

    const functions = this.functionManager.getFunctions();
    if (functions.length === 0) {
      vscode.window.showInformationMessage('No functions available. Create some functions first!');
      return;
    }

    // Show function selection for adding to pipeline
    const functionItems = functions.map(func => ({
      label: func.name,
      description: func.description || 'No description',
      picked: pipeline.steps.some(step => step.functionName === func.name)
    }));

    const selectedFunctions = await vscode.window.showQuickPick(functionItems, {
      placeHolder: `Select functions for pipeline '${pipelineName}'`,
      canPickMany: true
    });

    if (selectedFunctions) {
      pipeline.steps = selectedFunctions.map(func => ({
        functionName: func.label,
        enabled: true
      }));

      this.savePipelines();
      vscode.window.showInformationMessage(`Pipeline '${pipelineName}' updated with ${selectedFunctions.length} functions`);
    }
  }

  async deletePipeline(pipelineName: string): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
      `Are you sure you want to delete pipeline '${pipelineName}'?`,
      'Yes',
      'No'
    );

    if (confirmation === 'Yes') {
      this.pipelines = this.pipelines.filter(p => p.name !== pipelineName);
      this.savePipelines();
      vscode.window.showInformationMessage(`Pipeline '${pipelineName}' deleted successfully!`);
    }
  }

  async movePipelineStepUp(pipelineName: string, stepIndex: number): Promise<void> {
    const pipeline = this.pipelines.find(p => p.name === pipelineName);
    if (!pipeline) {
      vscode.window.showErrorMessage(`Pipeline '${pipelineName}' not found`);
      return;
    }

    if (stepIndex <= 0 || stepIndex >= pipeline.steps.length) {
      vscode.window.showErrorMessage('Cannot move step up');
      return;
    }

    // Swap with previous step
    const temp = pipeline.steps[stepIndex];
    pipeline.steps[stepIndex] = pipeline.steps[stepIndex - 1];
    pipeline.steps[stepIndex - 1] = temp;

    this.savePipelines();
    vscode.window.showInformationMessage(`Moved step '${temp.functionName}' up in pipeline '${pipelineName}'`);
  }

  async movePipelineStepDown(pipelineName: string, stepIndex: number): Promise<void> {
    const pipeline = this.pipelines.find(p => p.name === pipelineName);
    if (!pipeline) {
      vscode.window.showErrorMessage(`Pipeline '${pipelineName}' not found`);
      return;
    }

    if (stepIndex < 0 || stepIndex >= pipeline.steps.length - 1) {
      vscode.window.showErrorMessage('Cannot move step down');
      return;
    }

    // Swap with next step
    const temp = pipeline.steps[stepIndex];
    pipeline.steps[stepIndex] = pipeline.steps[stepIndex + 1];
    pipeline.steps[stepIndex + 1] = temp;

    this.savePipelines();
    vscode.window.showInformationMessage(`Moved step '${temp.functionName}' down in pipeline '${pipelineName}'`);
  }

  async togglePipelineStep(pipelineName: string, stepIndex: number): Promise<void> {
    const pipeline = this.pipelines.find(p => p.name === pipelineName);
    if (!pipeline) {
      vscode.window.showErrorMessage(`Pipeline '${pipelineName}' not found`);
      return;
    }

    if (stepIndex < 0 || stepIndex >= pipeline.steps.length) {
      vscode.window.showErrorMessage('Invalid step index');
      return;
    }

    const step = pipeline.steps[stepIndex];
    step.enabled = !step.enabled;

    this.savePipelines();
    const status = step.enabled ? 'enabled' : 'disabled';
    vscode.window.showInformationMessage(`Step '${step.functionName}' ${status} in pipeline '${pipelineName}'`);
  }

  async removePipelineStep(pipelineName: string, stepIndex: number): Promise<void> {
    const pipeline = this.pipelines.find(p => p.name === pipelineName);
    if (!pipeline) {
      vscode.window.showErrorMessage(`Pipeline '${pipelineName}' not found`);
      return;
    }

    if (stepIndex < 0 || stepIndex >= pipeline.steps.length) {
      vscode.window.showErrorMessage('Invalid step index');
      return;
    }

    const removedStep = pipeline.steps.splice(stepIndex, 1)[0];
    this.savePipelines();
    vscode.window.showInformationMessage(`Removed step '${removedStep.functionName}' from pipeline '${pipelineName}'`);
  }

  removeFunctionFromAllPipelines(functionName: string): { affectedPipelines: string[], totalRemoved: number } {
    let totalRemoved = 0;
    const affectedPipelines: string[] = [];

    this.pipelines.forEach(pipeline => {
      const originalLength = pipeline.steps.length;
      pipeline.steps = pipeline.steps.filter(step => step.functionName !== functionName);
      const removedFromThisPipeline = originalLength - pipeline.steps.length;

      if (removedFromThisPipeline > 0) {
        affectedPipelines.push(pipeline.name);
        totalRemoved += removedFromThisPipeline;
      }
    });

    if (totalRemoved > 0) {
      this.savePipelines();
    }

    return { affectedPipelines, totalRemoved };
  }

  async executePipeline(pipelineName: string, input: string, initialContext: any): Promise<string> {
    const pipeline = this.pipelines.find(p => p.name === pipelineName);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineName}' not found`);
    }

    let currentInput = input;
    let currentContext = { ...initialContext };

    vscode.window.showInformationMessage(`Executing pipeline '${pipelineName}' with ${pipeline.steps.length} steps...`);

    for (let i = 0; i < pipeline.steps.length; i++) {
      const step = pipeline.steps[i];

      const func = this.functionManager.getFunction(step.functionName);
      if (!func) {
        throw new Error(`Function '${step.functionName}' not found in pipeline step ${i + 1}`);
      }

      try {
        // Execute the function
        let executablePath = func.filePath;
        executablePath = await this.functionManager.compileTypeScriptFunction(func.filePath);

        // Clear require cache
        delete require.cache[executablePath];

        // Load and execute the function
        const moduleExport = require(executablePath);
        let userFunction: Function;

        if (moduleExport.default && typeof moduleExport.default === 'function') {
          userFunction = moduleExport.default;
        } else if (typeof moduleExport === 'function') {
          userFunction = moduleExport;
        } else {
          throw new Error(`Function '${step.functionName}' should export a default function`);
        }

        const functionResult = await userFunction(currentInput, currentContext);

        // Handle both old and new return formats
        if (typeof functionResult === 'string') {
          currentInput = functionResult;
        } else if (functionResult && typeof functionResult === 'object' && 'result' in functionResult) {
          currentInput = functionResult.result;
          currentContext = functionResult.ctx || currentContext;
        } else {
          throw new Error(`Function '${step.functionName}' must return either a string or {result, ctx}`);
        }

        // Update context with step info
        currentContext.params.pipelineStep = i + 1;
        currentContext.params.pipelineName = pipelineName;

      } catch (error) {
        throw new Error(`Error in pipeline step ${i + 1} (${step.functionName}): ${error}`);
      }
    }

    vscode.window.showInformationMessage(`Pipeline '${pipelineName}' completed successfully!`);
    return currentInput;
  }

  async runPipelineOnCurrentFile(pipelineName: string): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const content = activeEditor.document.getText();
    const filePath = activeEditor.document.uri.fsPath;

    const context = {
      fullPath: filePath,
      selection: {
        startLine: 0,
        endLine: activeEditor.document.lineCount - 1,
        startChar: 0,
        endChar: activeEditor.document.lineAt(activeEditor.document.lineCount - 1).text.length
      },
      params: {},
      vscode: vscode
    };

    try {
      const result = await this.executePipeline(pipelineName, content, context);

      // Create virtual document with the result
      const uri = vscode.Uri.parse(`untitled:${pipelineName}-result.txt`);
      const document = await vscode.workspace.openTextDocument(uri);
      const edit = new vscode.WorkspaceEdit();
      edit.insert(uri, new vscode.Position(0, 0), result);
      await vscode.workspace.applyEdit(edit);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Pipeline execution failed: ${error}`);
    }
  }

  async runPipelineOnSelection(pipelineName: string): Promise<void> {
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

    const filePath = activeEditor.document.uri.fsPath;

    const context = {
      fullPath: filePath,
      selection: {
        startLine: selection.start.line,
        endLine: selection.end.line,
        startChar: selection.start.character,
        endChar: selection.end.character
      },
      params: {},
      vscode: vscode
    };

    try {
      const result = await this.executePipeline(pipelineName, content, context);

      // Replace the selected text in place
      const edit = new vscode.WorkspaceEdit();
      edit.replace(activeEditor.document.uri, selection, result);
      await vscode.workspace.applyEdit(edit);
    } catch (error) {
      vscode.window.showErrorMessage(`Pipeline execution failed: ${error}`);
    }
  }
} 
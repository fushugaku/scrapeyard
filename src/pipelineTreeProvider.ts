import * as vscode from 'vscode';
import { PipelineManager } from './pipelineManager';

interface PipelineStep {
  functionName: string;
  enabled: boolean;
}

interface Pipeline {
  name: string;
  description?: string;
  steps: PipelineStep[];
}

export class PipelineTreeProvider implements vscode.TreeDataProvider<PipelineTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<PipelineTreeItem | undefined | null | void> = new vscode.EventEmitter<PipelineTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<PipelineTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private pipelineManager: PipelineManager) { }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PipelineTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PipelineTreeItem): Thenable<PipelineTreeItem[]> {
    if (!element) {
      // Root level - show pipelines
      const pipelines = this.pipelineManager.getPipelines();
      return Promise.resolve(pipelines.map(pipeline => new PipelineTreeItem(
        pipeline.name,
        pipeline.description || 'No description',
        vscode.TreeItemCollapsibleState.Collapsed,
        'pipeline',
        pipeline
      )));
    } else if (element.contextValue === 'pipeline' && element.pipeline) {
      // Show steps for this pipeline
      return Promise.resolve(element.pipeline.steps.map((step: PipelineStep, index: number) => new PipelineTreeItem(
        `${index + 1}. ${step.functionName}`,
        step.functionName,
        vscode.TreeItemCollapsibleState.None,
        'pipelineStep',
        element.pipeline,
        step,
        index
      )));
    }

    return Promise.resolve([]);
  }
}

export class PipelineTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly pipeline?: Pipeline,
    public readonly step?: PipelineStep,
    public readonly index?: number
  ) {
    super(label, collapsibleState);
    this.tooltip = this.description;
    this.description = this.description;

    if (contextValue === 'pipeline') {
      this.iconPath = new vscode.ThemeIcon('symbol-array');
    } else if (contextValue === 'pipelineStep') {
      this.iconPath = new vscode.ThemeIcon('symbol-method');
    }
  }
} 
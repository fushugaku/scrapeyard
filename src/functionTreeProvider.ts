import * as vscode from 'vscode';
import { FunctionManager, ParserFunction } from './functionManager';

export class FunctionTreeDataProvider implements vscode.TreeDataProvider<FunctionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FunctionItem | undefined | null | void> = new vscode.EventEmitter<FunctionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FunctionItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private functionManager: FunctionManager) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FunctionItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FunctionItem): Promise<FunctionItem[]> {
        if (!element) {
            // Return root level items (all functions)
            const functions = this.functionManager.getFunctions();
            return Promise.resolve(functions.map((func: ParserFunction) => new FunctionItem(func.name, func.description || 'No description', func.type)));
        }
        return Promise.resolve([]);
    }
}

class FunctionItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly functionType: 'typescript'
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `${this.label} (TypeScript): ${this.description}`;
        this.contextValue = 'parserFunction';

        // Use TypeScript icon
        this.iconPath = new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('charts.blue'));
    }
} 
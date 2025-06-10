import * as vscode from 'vscode';
import { FunctionManager, ParserFunction, DirectoryNode } from './functionManager';

export class FunctionTreeDataProvider implements vscode.TreeDataProvider<TreeItem>, vscode.TreeDragAndDropController<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    dropMimeTypes = ['application/vnd.code.tree.scrapeyard-functions'];
    dragMimeTypes = ['application/vnd.code.tree.scrapeyard-functions'];

    constructor(private functionManager: FunctionManager) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (!element) {
            // Return root level items
            const directoryStructure = this.functionManager.getDirectoryStructure();
            return Promise.resolve(this.getChildrenFromNode(directoryStructure));
        } else if (element instanceof FolderItem) {
            // Return children of a folder
            return Promise.resolve(this.getChildrenFromNode(element.directoryNode));
        }
        return Promise.resolve([]);
    }

    private getChildrenFromNode(node: DirectoryNode): TreeItem[] {
        const items: TreeItem[] = [];

        // Add subdirectories first
        const sortedDirs = Array.from(node.children.entries()).sort(([a], [b]) => a.localeCompare(b));
        for (const [_, childNode] of sortedDirs) {
            items.push(new FolderItem(childNode));
        }

        // Add functions in this directory
        const sortedFunctions = node.functions.sort((a, b) => a.name.localeCompare(b.name));
        for (const func of sortedFunctions) {
            items.push(new FunctionItem(func));
        }

        return items;
    }

    async handleDrag(source: TreeItem[], treeDataTransfer: vscode.DataTransfer): Promise<void> {
        // Only allow dragging functions, not folders
        const functionItems = source.filter(item => item instanceof FunctionItem) as FunctionItem[];
        if (functionItems.length === 0) {
            return;
        }

        treeDataTransfer.set('application/vnd.code.tree.scrapeyard-functions', new vscode.DataTransferItem(functionItems));
    }

    async handleDrop(target: TreeItem | undefined, sources: vscode.DataTransfer): Promise<void> {
        const transferItem = sources.get('application/vnd.code.tree.scrapeyard-functions');
        if (!transferItem) {
            return;
        }

        const functionItems = transferItem.value as FunctionItem[];

        // Determine target folder path
        let targetFolderPath = '';
        if (target instanceof FolderItem) {
            targetFolderPath = target.directoryNode.path;
        } else if (target === undefined) {
            // Dropped on root
            targetFolderPath = '';
        } else {
            // Can't drop on functions
            vscode.window.showErrorMessage('Cannot drop functions on other functions. Drop on folders only.');
            return;
        }

        // Move each function
        for (const functionItem of functionItems) {
            await this.functionManager.moveFunction(functionItem.func.name, targetFolderPath);
        }

        this.refresh();
    }
}

abstract class TreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

class FolderItem extends TreeItem {
    public readonly directoryNode: DirectoryNode;

    constructor(directoryNode: DirectoryNode) {
        super(directoryNode.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.directoryNode = directoryNode;
        this.tooltip = `Folder: ${directoryNode.path || 'Root'}`;
        this.contextValue = 'folder';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

class FunctionItem extends TreeItem {
    public readonly func: ParserFunction;

    constructor(func: ParserFunction) {
        super(func.name, vscode.TreeItemCollapsibleState.None);
        this.func = func;

        if (func.type === 'declaration') {
            this.tooltip = `${func.name} (Type Declaration): ${func.description || 'No description'}`;
            this.contextValue = 'declarationFile';
            this.iconPath = new vscode.ThemeIcon('symbol-interface', new vscode.ThemeColor('charts.purple'));
        } else {
            this.tooltip = `${func.name} (TypeScript): ${func.description || 'No description'}`;
            this.contextValue = 'function';
            this.iconPath = new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('charts.blue'));
        }

        // Store the label for command compatibility
        this.label = func.name;
    }
} 
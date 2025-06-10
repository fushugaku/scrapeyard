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
exports.FunctionTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
class FunctionTreeDataProvider {
    constructor(functionManager) {
        this.functionManager = functionManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.dropMimeTypes = ['application/vnd.code.tree.scrapeyard-functions'];
        this.dragMimeTypes = ['application/vnd.code.tree.scrapeyard-functions'];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Return root level items
            const directoryStructure = this.functionManager.getDirectoryStructure();
            return Promise.resolve(this.getChildrenFromNode(directoryStructure));
        }
        else if (element instanceof FolderItem) {
            // Return children of a folder
            return Promise.resolve(this.getChildrenFromNode(element.directoryNode));
        }
        return Promise.resolve([]);
    }
    getChildrenFromNode(node) {
        const items = [];
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
    async handleDrag(source, treeDataTransfer) {
        // Only allow dragging functions, not folders
        const functionItems = source.filter(item => item instanceof FunctionItem);
        if (functionItems.length === 0) {
            return;
        }
        treeDataTransfer.set('application/vnd.code.tree.scrapeyard-functions', new vscode.DataTransferItem(functionItems));
    }
    async handleDrop(target, sources) {
        const transferItem = sources.get('application/vnd.code.tree.scrapeyard-functions');
        if (!transferItem) {
            return;
        }
        const functionItems = transferItem.value;
        // Determine target folder path
        let targetFolderPath = '';
        if (target instanceof FolderItem) {
            targetFolderPath = target.directoryNode.path;
        }
        else if (target === undefined) {
            // Dropped on root
            targetFolderPath = '';
        }
        else {
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
exports.FunctionTreeDataProvider = FunctionTreeDataProvider;
class TreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState) {
        super(label, collapsibleState);
    }
}
class FolderItem extends TreeItem {
    constructor(directoryNode) {
        super(directoryNode.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.directoryNode = directoryNode;
        this.tooltip = `Folder: ${directoryNode.path || 'Root'}`;
        this.contextValue = 'folder';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}
class FunctionItem extends TreeItem {
    constructor(func) {
        super(func.name, vscode.TreeItemCollapsibleState.None);
        this.func = func;
        if (func.type === 'declaration') {
            this.tooltip = `${func.name} (Type Declaration): ${func.description || 'No description'}`;
            this.contextValue = 'declarationFile';
            this.iconPath = new vscode.ThemeIcon('symbol-interface', new vscode.ThemeColor('charts.purple'));
        }
        else {
            this.tooltip = `${func.name} (TypeScript): ${func.description || 'No description'}`;
            this.contextValue = 'function';
            this.iconPath = new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('charts.blue'));
        }
        // Store the label for command compatibility
        this.label = func.name;
    }
}
//# sourceMappingURL=functionTreeProvider.js.map
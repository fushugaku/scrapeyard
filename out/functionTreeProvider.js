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
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Return root level items (all functions)
            const functions = this.functionManager.getFunctions();
            return Promise.resolve(functions.map((func) => new FunctionItem(func.name, func.description || 'No description', func.type)));
        }
        return Promise.resolve([]);
    }
}
exports.FunctionTreeDataProvider = FunctionTreeDataProvider;
class FunctionItem extends vscode.TreeItem {
    constructor(label, description, functionType) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.description = description;
        this.functionType = functionType;
        if (functionType === 'declaration') {
            this.tooltip = `${this.label} (Type Declaration): ${this.description}`;
            this.contextValue = 'declarationFile';
            // Use a different icon for .d.ts files
            this.iconPath = new vscode.ThemeIcon('symbol-interface', new vscode.ThemeColor('charts.purple'));
        }
        else {
            this.tooltip = `${this.label} (TypeScript): ${this.description}`;
            this.contextValue = 'function';
            // Use TypeScript icon for regular functions
            this.iconPath = new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('charts.blue'));
        }
    }
}
//# sourceMappingURL=functionTreeProvider.js.map
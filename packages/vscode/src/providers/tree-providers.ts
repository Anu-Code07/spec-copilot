import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { parseTasks } from '@specdrive/core';

export type TreeItemType = 'spec' | 'doc' | 'task' | 'taskPending' | 'taskDone';

export class SpecTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: TreeItemType,
    public readonly slug?: string,
    public readonly filePath?: string,
    public readonly taskId?: string,
  ) {
    super(label, collapsibleState);
    if (itemType === 'spec') {
      this.contextValue = 'spec';
      this.iconPath = new vscode.ThemeIcon('notebook');
      this.command = {
        command: 'specdrive.selectSpec',
        title: 'Select Spec',
        arguments: [this],
      };
    } else if (itemType === 'doc') {
      this.contextValue = 'doc';
      this.iconPath = new vscode.ThemeIcon('markdown');
      this.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [vscode.Uri.file(filePath!)],
      };
    } else if (itemType === 'taskPending') {
      this.contextValue = 'taskPending';
      this.iconPath = new vscode.ThemeIcon('circle-outline');
    } else if (itemType === 'taskDone') {
      this.contextValue = 'taskDone';
      this.iconPath = new vscode.ThemeIcon('pass-filled');
    }
  }
}

export class SpecExplorerProvider implements vscode.TreeDataProvider<SpecTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SpecTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SpecTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SpecTreeItem): Promise<SpecTreeItem[]> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return [];

    const specsDir = path.join(root, '.specdrive', 'specs');
    try {
      await fs.access(specsDir);
    } catch {
      return [];
    }

    if (!element) {
      const slugs = await fs.readdir(specsDir);
      const items: SpecTreeItem[] = [];
      for (const slug of slugs) {
        const metaPath = path.join(specsDir, slug, 'meta.yaml');
        try {
          await fs.access(metaPath);
          items.push(
            new SpecTreeItem(slug, vscode.TreeItemCollapsibleState.Collapsed, 'spec', slug),
          );
        } catch {
          // not a spec folder
        }
      }
      return items;
    }

    if (element.itemType === 'spec' && element.slug) {
      const specDir = path.join(specsDir, element.slug);
      const docs = ['requirements.md', 'design.md', 'tasks.md'];
      return docs.map((doc) => {
        const fp = path.join(specDir, doc);
        return new SpecTreeItem(doc, vscode.TreeItemCollapsibleState.None, 'doc', element.slug, fp);
      });
    }

    return [];
  }
}

export class TaskExplorerProvider implements vscode.TreeDataProvider<SpecTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SpecTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private selectedSlug: string | undefined;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  setSelectedSlug(slug: string): void {
    this.selectedSlug = slug;
    this.refresh();
  }

  getTreeItem(element: SpecTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<SpecTreeItem[]> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root || !this.selectedSlug) {
      return [new SpecTreeItem('Select a spec from Specs view', vscode.TreeItemCollapsibleState.None, 'doc')];
    }

    const tasksPath = path.join(root, '.specdrive', 'specs', this.selectedSlug, 'tasks.md');
    try {
      const content = await fs.readFile(tasksPath, 'utf-8');
      const tasks = parseTasks(content);
      return tasks.map(
        (t) =>
          new SpecTreeItem(
            `${t.id}: ${t.title} [${t.status}]`,
            vscode.TreeItemCollapsibleState.None,
            t.status === 'done' ? 'taskDone' : 'taskPending',
            this.selectedSlug,
            undefined,
            t.id,
          ),
      );
    } catch {
      return [new SpecTreeItem('No tasks.md — run spec tasks', vscode.TreeItemCollapsibleState.None, 'doc')];
    }
  }
}

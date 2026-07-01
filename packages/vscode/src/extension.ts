import * as vscode from 'vscode';
import * as path from 'path';
import {
  createSpec,
  getImplementContext,
  formatImplementContext,
  reviewSpec,
  formatReviewReport,
  completeTask,
} from '@specdrive/core';
import { SpecExplorerProvider, TaskExplorerProvider, SpecTreeItem } from './providers/tree-providers';

let selectedSpecSlug: string | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const specProvider = new SpecExplorerProvider();
  const taskProvider = new TaskExplorerProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('specdrive.specs', specProvider),
    vscode.window.registerTreeDataProvider('specdrive.tasks', taskProvider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('specdrive.refresh', () => {
      specProvider.refresh();
      taskProvider.refresh();
    }),

    vscode.commands.registerCommand('specdrive.createSpec', async () => {
      const title = await vscode.window.showInputBox({
        prompt: 'Feature title',
        placeHolder: 'Add product review screen',
      });
      if (!title) return;

      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) return;

      const quick = await vscode.window.showQuickPick(['Gated workflow', 'Quick (all docs)'], {
        placeHolder: 'Workflow mode',
      });

      try {
        const result = await createSpec(root, {
          title,
          quick: quick?.startsWith('Quick'),
        });
        vscode.window.showInformationMessage(`Created spec: ${result.slug}`);
        specProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage(String(err));
      }
    }),

    vscode.commands.registerCommand('specdrive.selectSpec', (item: SpecTreeItem) => {
      if (item.slug) {
        selectedSpecSlug = item.slug;
        taskProvider.setSelectedSlug(item.slug);
      }
    }),

    vscode.commands.registerCommand('specdrive.openDesign', async (item: SpecTreeItem) => {
      const slug = item.slug ?? selectedSpecSlug;
      if (!slug) return;
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) return;
      const designPath = path.join(root, '.specdrive', 'specs', slug, 'design.md');
      const doc = await vscode.workspace.openTextDocument(designPath);
      await vscode.window.showTextDocument(doc);
    }),

    vscode.commands.registerCommand('specdrive.implementNext', async (item?: SpecTreeItem) => {
      const slug = item?.slug ?? selectedSpecSlug;
      if (!slug) {
        vscode.window.showWarningMessage('Select a spec first');
        return;
      }
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) return;

      try {
        const result = await getImplementContext(root, { spec: slug });
        const panel = vscode.window.createWebviewPanel(
          'specdriveImplement',
          `Implement: ${result.context.task.id}`,
          vscode.ViewColumn.Beside,
          { enableScripts: false },
        );
        panel.webview.html = `<pre style="font-family:monospace;padding:1em;white-space:pre-wrap">${escapeHtml(formatImplementContext(result))}</pre>`;
        selectedSpecSlug = slug;
        taskProvider.setSelectedSlug(slug);
      } catch (err) {
        vscode.window.showErrorMessage(String(err));
      }
    }),

    vscode.commands.registerCommand('specdrive.review', async (item?: SpecTreeItem) => {
      const slug = item?.slug ?? selectedSpecSlug;
      if (!slug) {
        vscode.window.showWarningMessage('Select a spec first');
        return;
      }
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) return;

      try {
        const report = await reviewSpec(root, slug);
        const panel = vscode.window.createWebviewPanel(
          'specdriveReview',
          `Review: ${slug}`,
          vscode.ViewColumn.Beside,
          { enableScripts: false },
        );
        panel.webview.html = `<pre style="font-family:monospace;padding:1em;white-space:pre-wrap">${escapeHtml(formatReviewReport(report))}</pre>`;
      } catch (err) {
        vscode.window.showErrorMessage(String(err));
      }
    }),

    vscode.commands.registerCommand('specdrive.completeTask', async (item: SpecTreeItem) => {
      if (!item.slug || !item.taskId) return;
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) return;

      try {
        await completeTask(root, item.slug, item.taskId);
        vscode.window.showInformationMessage(`Task ${item.taskId} complete`);
        taskProvider.refresh();
        specProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage(String(err));
      }
    }),
  );

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!editor) return;
    const match = editor.document.uri.fsPath.match(/\.specdrive\/specs\/([^/]+)\//);
    if (match) {
      selectedSpecSlug = match[1];
      taskProvider.setSelectedSlug(match[1]);
    }
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function deactivate(): void {}

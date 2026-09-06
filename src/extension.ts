import * as vscode from "vscode";
import { GitCommandError, removeFromGitIndex as removeResourceFromGitIndex } from "./git";
import { appendGitignoreRule, buildGitignoreRule, findNearestGitignore } from "./gitignore";
import { resolveResourceContext } from "./path";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("git-tools.addToGitignore", (resourceUri?: vscode.Uri) => addToGitignore(resourceUri)),
    vscode.commands.registerCommand(
      "git-tools.removeFromGitIndex",
      (resourceUri?: vscode.Uri) => removeFromGitIndex(resourceUri),
    ),
  );
}

export function deactivate() {}

async function addToGitignore(resourceUri?: vscode.Uri): Promise<void> {
  try {
    const context = await resolveResourceContext(resourceUri ?? getActiveEditorResource());
    const gitignorePath = await findNearestGitignore(context.resourcePath, context.isDirectory, context.repoRoot);
    const rule = buildGitignoreRule(context.resourcePath, context.isDirectory, gitignorePath);
    const added = await appendGitignoreRule(gitignorePath, rule);
    const relativeGitignore = vscode.workspace.asRelativePath(gitignorePath, false);
    const message = added
      ? `已将 ${vscode.workspace.asRelativePath(context.resourcePath, false)} 添加到 ${relativeGitignore}。`
      : `${vscode.workspace.asRelativePath(context.resourcePath, false)} 已存在于 ${relativeGitignore}。`;
    void vscode.window.showInformationMessage(message);
  } catch (error) {
    showOperationError("加入 .gitignore", error);
  }
}

async function removeFromGitIndex(resourceUri?: vscode.Uri): Promise<void> {
  try {
    const context = await resolveResourceContext(resourceUri ?? getActiveEditorResource());
    await removeResourceFromGitIndex(context.repoRoot, context.resourcePath, context.isDirectory);
    void vscode.window.showInformationMessage(
      `已将 ${vscode.workspace.asRelativePath(context.resourcePath, false)} 从 Git 索引移除，本地文件已保留。`,
    );
  } catch (error) {
    showOperationError("从 Git 索引移除", error);
  }
}

function getActiveEditorResource(): vscode.Uri {
  const resourceUri = vscode.window.activeTextEditor?.document.uri;
  if (!resourceUri) {
    throw new Error("请在资源管理器中选择文件或文件夹，或打开一个本地文件。");
  }
  return resourceUri;
}

function showOperationError(operation: string, error: unknown): void {
  const message = error instanceof GitCommandError ? error.message : error instanceof Error ? error.message : String(error);
  void vscode.window.showErrorMessage(`${operation}失败：${message}`);
}

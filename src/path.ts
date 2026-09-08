import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { findRepositoryRoot } from "./git";
import { isPathWithin } from "./path-utils";

export interface ResourceContext {
  resourcePath: string;
  workspaceRoot: string;
  repoRoot: string;
  isDirectory: boolean;
}

export async function resolveResourceContext(resourceUri: vscode.Uri): Promise<ResourceContext> {
  if (resourceUri.scheme !== "file") {
    throw new Error("Git Good Tools 只支持本地文件和文件夹。");
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(resourceUri);
  if (!workspaceFolder) {
    throw new Error("请先打开包含该资源的工作区。");
  }

  const [resourcePath, workspaceRoot] = await Promise.all([
    fs.realpath(resourceUri.fsPath),
    fs.realpath(workspaceFolder.uri.fsPath),
  ]);
  if (!isPathWithin(resourcePath, workspaceRoot)) {
    throw new Error("所选资源不在当前工作区范围内。");
  }

  const resourceStat = await fs.stat(resourcePath);
  const repoRoot = await findRepositoryRoot(resourceStat.isDirectory() ? resourcePath : path.dirname(resourcePath));
  if (!isPathWithin(repoRoot, workspaceRoot)) {
    throw new Error("Git 仓库根目录超出了当前工作区范围，已取消操作。");
  }
  if (!isPathWithin(resourcePath, repoRoot)) {
    throw new Error("所选资源不在当前 Git 仓库范围内。");
  }

  return {
    resourcePath,
    workspaceRoot,
    repoRoot,
    isDirectory: resourceStat.isDirectory(),
  };
}

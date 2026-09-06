import * as fs from "node:fs/promises";
import * as path from "node:path";
import { isPathWithin, pathsEqual } from "./path-utils";

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function findNearestGitignore(resourcePath: string, isDirectory: boolean, repoRoot: string): Promise<string> {
  if (!isPathWithin(resourcePath, repoRoot)) {
    throw new Error("所选资源不在当前 Git 仓库范围内。");
  }

  let currentDirectory = isDirectory ? resourcePath : path.dirname(resourcePath);
  while (true) {
    const candidate = path.join(currentDirectory, ".gitignore");
    if (await isFile(candidate)) {
      return candidate;
    }
    if (pathsEqual(currentDirectory, repoRoot)) {
      return candidate;
    }
    const parentDirectory = path.dirname(currentDirectory);
    if (pathsEqual(parentDirectory, currentDirectory) || !isPathWithin(parentDirectory, repoRoot)) {
      return path.join(repoRoot, ".gitignore");
    }
    currentDirectory = parentDirectory;
  }
}

function escapeGitignorePath(relativePath: string): string {
  return relativePath
    .split("/")
    .map((segment) => segment.replace(/[\\#\s!*?\[\]]/g, (character) => `\\${character}`))
    .join("/");
}

export function buildGitignoreRule(resourcePath: string, isDirectory: boolean, gitignorePath: string): string {
  const baseDirectory = path.dirname(gitignorePath);
  const relativePath = path.relative(baseDirectory, resourcePath).split(path.sep).join("/") || ".";
  if (isDirectory && relativePath === ".") {
    return "/*";
  }
  const escapedPath = escapeGitignorePath(relativePath);
  return `/${escapedPath}${isDirectory ? "/" : ""}`;
}

export async function appendGitignoreRule(gitignorePath: string, rule: string): Promise<boolean> {
  let existing = "";
  try {
    existing = await fs.readFile(gitignorePath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }

  const lines = existing.split(/\r?\n/);
  if (lines.includes(rule)) {
    return false;
  }

  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  let updated: string;
  if (!existing) {
    updated = `${rule}${eol}`;
  } else if (existing.endsWith("\n")) {
    updated = `${existing}${rule}${eol}`;
  } else {
    updated = `${existing}${eol}${rule}${eol}`;
  }
  await fs.writeFile(gitignorePath, updated, "utf8");
  return true;
}

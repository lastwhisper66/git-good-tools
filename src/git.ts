import { execFile } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import { isPathWithin } from "./path-utils";

const execFileAsync = promisify(execFile);

export class GitCommandError extends Error {
  public constructor(message: string, public readonly stderr?: string) {
    super(message);
    this.name = "GitCommandError";
  }
}

async function runGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync("git", args, { cwd, windowsHide: true, maxBuffer: 1024 * 1024 });
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  } catch (error) {
    const commandError = error as { stderr?: string | Buffer; message?: string };
    const stderr = commandError.stderr?.toString().trim();
    throw new GitCommandError(stderr || commandError.message || "Git 命令执行失败。", stderr);
  }
}

export async function findRepositoryRoot(startPath: string): Promise<string> {
  const { stdout } = await runGit(["-C", startPath, "rev-parse", "--show-toplevel"], startPath);
  const repoRoot = stdout.trim();
  if (!repoRoot) {
    throw new GitCommandError("无法确定 Git 仓库根目录。");
  }
  return path.resolve(repoRoot);
}

export async function removeFromGitIndex(repoRoot: string, resourcePath: string, isDirectory: boolean): Promise<void> {
  if (!isPathWithin(resourcePath, repoRoot)) {
    throw new Error("所选资源不在当前 Git 仓库范围内。");
  }

  const relativePath = path.relative(repoRoot, resourcePath).split(path.sep).join("/") || ".";
  const args = ["rm", "--cached"];
  if (isDirectory) {
    args.push("-r");
  }
  args.push("--", relativePath);
  await runGit(args, repoRoot);
}

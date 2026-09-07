import { removeFromGitIndex } from "./git";
import {
  appendGitignoreRule,
  buildGitignoreRule,
  findNearestGitignore,
} from "./gitignore";

export interface GitignoreUpdate {
  gitignorePath: string;
  rule: string;
  added: boolean;
}

export async function ensureResourceIgnored(
  resourcePath: string,
  isDirectory: boolean,
  repoRoot: string,
): Promise<GitignoreUpdate> {
  const gitignorePath = await findNearestGitignore(
    resourcePath,
    isDirectory,
    repoRoot,
  );
  const rule = buildGitignoreRule(resourcePath, isDirectory, gitignorePath);
  const added = await appendGitignoreRule(gitignorePath, rule);
  return { gitignorePath, rule, added };
}

export async function removeFromGitIndexAndIgnore(
  repoRoot: string,
  resourcePath: string,
  isDirectory: boolean,
): Promise<GitignoreUpdate> {
  const update = await ensureResourceIgnored(
    resourcePath,
    isDirectory,
    repoRoot,
  );
  await removeFromGitIndex(repoRoot, resourcePath, isDirectory);
  return update;
}

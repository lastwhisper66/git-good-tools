import * as assert from "node:assert/strict";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { GitCommandError } from "../git";
import { removeFromGitIndexAndIgnore } from "../operations";

const execFileAsync = promisify(execFile);

suite("Git index and ignore operations", () => {
  let temporaryDirectory: string;

  setup(async () => {
    temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "git-tools-operations-"),
    );
  });

  teardown(async () => {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  test("creates an ignore rule before removing a tracked file from the index", async () => {
    const repoRoot = await createRepository(temporaryDirectory, "file-repo");
    const filePath = path.join(repoRoot, "secret.env");
    await fs.writeFile(filePath, "TOKEN=value\n");
    await commitAll(repoRoot);

    const update = await removeFromGitIndexAndIgnore(repoRoot, filePath, false);

    assert.deepEqual(update, {
      gitignorePath: path.join(repoRoot, ".gitignore"),
      rule: "/secret.env",
      added: true,
    });
    assert.equal(
      await fs.readFile(update.gitignorePath, "utf8"),
      "/secret.env\n",
    );
    assert.equal(await fs.readFile(filePath, "utf8"), "TOKEN=value\n");
    assert.equal(
      (await runGit(repoRoot, ["ls-files", "--", "secret.env"])).trim(),
      "",
    );
  });

  test("does not duplicate an existing ignore rule", async () => {
    const repoRoot = await createRepository(
      temporaryDirectory,
      "existing-rule-repo",
    );
    const filePath = path.join(repoRoot, "secret.env");
    const gitignorePath = path.join(repoRoot, ".gitignore");
    await fs.writeFile(filePath, "TOKEN=value\n");
    await commitAll(repoRoot);
    await fs.writeFile(gitignorePath, "/secret.env\r\n", "utf8");

    const update = await removeFromGitIndexAndIgnore(repoRoot, filePath, false);

    assert.equal(update.added, false);
    assert.equal(await fs.readFile(gitignorePath, "utf8"), "/secret.env\r\n");
    assert.equal(
      (await runGit(repoRoot, ["ls-files", "--", "secret.env"])).trim(),
      "",
    );
  });

  test("ignores and recursively removes a tracked directory while keeping its contents", async () => {
    const repoRoot = await createRepository(
      temporaryDirectory,
      "directory-repo",
    );
    const directoryPath = path.join(repoRoot, "generated");
    const filePath = path.join(directoryPath, "output.txt");
    await fs.mkdir(directoryPath);
    await fs.writeFile(filePath, "generated\n");
    await commitAll(repoRoot);

    const update = await removeFromGitIndexAndIgnore(
      repoRoot,
      directoryPath,
      true,
    );

    assert.equal(update.rule, "/generated/");
    assert.equal(
      await fs.readFile(update.gitignorePath, "utf8"),
      "/generated/\n",
    );
    assert.equal(await fs.readFile(filePath, "utf8"), "generated\n");
    assert.equal(
      (await runGit(repoRoot, ["ls-files", "--", "generated"])).trim(),
      "",
    );
  });

  test("keeps the ignore rule when removing from the index fails", async () => {
    const repoRoot = await createRepository(temporaryDirectory, "failure-repo");
    const filePath = path.join(repoRoot, "untracked.txt");
    await fs.writeFile(filePath, "untracked\n");

    await assert.rejects(
      removeFromGitIndexAndIgnore(repoRoot, filePath, false),
      (error: unknown) => error instanceof GitCommandError,
    );
    assert.equal(
      await fs.readFile(path.join(repoRoot, ".gitignore"), "utf8"),
      "/untracked.txt\n",
    );
  });
});

async function createRepository(
  parentDirectory: string,
  name: string,
): Promise<string> {
  const repoRoot = path.join(parentDirectory, name);
  await fs.mkdir(repoRoot);
  await runGit(repoRoot, ["init"]);
  await runGit(repoRoot, ["config", "user.email", "git-tools@example.invalid"]);
  await runGit(repoRoot, ["config", "user.name", "Git Tools Tests"]);
  return repoRoot;
}

async function commitAll(repoRoot: string): Promise<void> {
  await runGit(repoRoot, ["add", "--all"]);
  await runGit(repoRoot, ["commit", "-m", "test"]);
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const result = await execFileAsync("git", args, { cwd, windowsHide: true });
  return result.stdout.toString();
}

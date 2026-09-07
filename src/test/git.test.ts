import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { findRepositoryRoot, removeFromGitIndex } from "../git";
import { isPathWithin } from "../path-utils";

suite("Git helpers", () => {
  let temporaryDirectory: string;

  setup(async () => {
    temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "git-tools-git-"),
    );
  });

  teardown(async () => {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  test("finds the repository root from a nested directory", async () => {
    const repoRoot = path.join(temporaryDirectory, "repo");
    const nestedDirectory = path.join(repoRoot, "src", "nested");
    await fs.mkdir(nestedDirectory, { recursive: true });
    await runGit(repoRoot, ["init"]);

    assert.equal(
      await findRepositoryRoot(nestedDirectory),
      await fs.realpath(repoRoot),
    );
  });

  test("removes a tracked file from the index while keeping it on disk", async () => {
    const repoRoot = path.join(temporaryDirectory, "repo");
    await fs.mkdir(repoRoot, { recursive: true });
    const filePath = path.join(repoRoot, "secret.env");
    await fs.writeFile(filePath, "TOKEN=value\n");
    await runGit(repoRoot, ["init"]);
    await runGit(repoRoot, [
      "config",
      "user.email",
      "git-tools@example.invalid",
    ]);
    await runGit(repoRoot, ["config", "user.name", "Git Tools Tests"]);
    await runGit(repoRoot, ["add", "--", "secret.env"]);
    await runGit(repoRoot, ["commit", "-m", "test"]);

    await removeFromGitIndex(repoRoot, filePath, false);

    assert.equal(await fs.readFile(filePath, "utf8"), "TOKEN=value\n");
    assert.equal(
      (await runGit(repoRoot, ["ls-files", "--", "secret.env"])).trim(),
      "",
    );
  });

  test("removes a tracked directory recursively while keeping its contents", async () => {
    const repoRoot = path.join(temporaryDirectory, "repo-folder");
    const directoryPath = path.join(repoRoot, "generated");
    const filePath = path.join(directoryPath, "output.txt");
    await fs.mkdir(directoryPath, { recursive: true });
    await fs.writeFile(filePath, "generated\n");
    await runGit(repoRoot, ["init"]);
    await runGit(repoRoot, [
      "config",
      "user.email",
      "git-tools@example.invalid",
    ]);
    await runGit(repoRoot, ["config", "user.name", "Git Tools Tests"]);
    await runGit(repoRoot, ["add", "--", "generated"]);
    await runGit(repoRoot, ["commit", "-m", "test"]);

    await removeFromGitIndex(repoRoot, directoryPath, true);

    assert.equal(await fs.readFile(filePath, "utf8"), "generated\n");
    assert.equal(
      (await runGit(repoRoot, ["ls-files", "--", "generated"])).trim(),
      "",
    );
  });

  test("recognizes workspace boundaries", () => {
    const workspaceRoot = path.join(temporaryDirectory, "workspace");
    assert.equal(
      isPathWithin(path.join(workspaceRoot, "src"), workspaceRoot),
      true,
    );
    assert.equal(
      isPathWithin(path.join(temporaryDirectory, "outside"), workspaceRoot),
      false,
    );
  });
});

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  const result = await execFileAsync("git", args, { cwd, windowsHide: true });
  return result.stdout.toString();
}

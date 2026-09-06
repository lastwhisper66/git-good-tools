import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  appendGitignoreRule,
  buildGitignoreRule,
  findNearestGitignore,
} from "../gitignore";

suite(".gitignore helpers", () => {
  let temporaryDirectory: string;

  setup(async () => {
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "git-tools-ignore-"));
  });

  teardown(async () => {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  test("uses the nearest .gitignore without walking above the repository root", async () => {
    const repoRoot = path.join(temporaryDirectory, "repo");
    const nestedDirectory = path.join(repoRoot, "packages", "app");
    await fs.mkdir(nestedDirectory, { recursive: true });
    await fs.writeFile(path.join(repoRoot, ".gitignore"), "/root-entry\n");
    await fs.writeFile(path.join(repoRoot, "packages", ".gitignore"), "/package-entry\n");
    const resourcePath = path.join(nestedDirectory, "cache.json");
    await fs.writeFile(resourcePath, "cache");

    const result = await findNearestGitignore(resourcePath, false, repoRoot);

    assert.equal(result, path.join(repoRoot, "packages", ".gitignore"));
  });

  test("falls back to a repository-root .gitignore and creates it when needed", async () => {
    const repoRoot = path.join(temporaryDirectory, "repo");
    const nestedDirectory = path.join(repoRoot, "packages", "app");
    await fs.mkdir(nestedDirectory, { recursive: true });

    const gitignorePath = await findNearestGitignore(nestedDirectory, true, repoRoot);
    const rule = buildGitignoreRule(path.join(nestedDirectory, "cache"), true, gitignorePath);
    const added = await appendGitignoreRule(gitignorePath, rule);

    assert.equal(gitignorePath, path.join(repoRoot, ".gitignore"));
    assert.equal(rule, "/packages/app/cache/");
    assert.equal(added, true);
    assert.equal(await fs.readFile(gitignorePath, "utf8"), "/packages/app/cache/\n");
  });

  test("does not duplicate a rule and preserves CRLF line endings", async () => {
    const gitignorePath = path.join(temporaryDirectory, ".gitignore");
    await fs.writeFile(gitignorePath, "# existing\r\n/cache/\r\n", "utf8");

    assert.equal(await appendGitignoreRule(gitignorePath, "/cache/"), false);
    assert.equal(await appendGitignoreRule(gitignorePath, "/tmp/"), true);
    assert.equal(await fs.readFile(gitignorePath, "utf8"), "# existing\r\n/cache/\r\n/tmp/\r\n");
  });

  test("escapes gitignore pattern characters in resource names", () => {
    const result = buildGitignoreRule(
      path.join(temporaryDirectory, "a folder", "[cache]*.json"),
      false,
      path.join(temporaryDirectory, ".gitignore"),
    );

    assert.equal(result, "/a\\ folder/\\[cache\\]\\*.json");
  });
});

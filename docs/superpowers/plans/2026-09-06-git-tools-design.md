# Git Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Explorer context-menu commands for adding a file or folder to the nearest in-repository `.gitignore`, and for removing a tracked file or folder from the Git index while keeping local files.

**Architecture:** Resolve a local resource to its containing VS Code workspace folder, canonicalize its path, and use Git to find the repository root. Reject repository roots outside the selected workspace folder. Search `.gitignore` from the selected directory upward to the repository root, write a repository-relative escaped rule, and execute `git rm --cached` with argument arrays for index removal.

**Tech Stack:** VS Code Extension API, TypeScript, Node.js `fs/promises`, `path`, and `child_process.execFile`; Mocha-based VS Code extension tests.

**Spec:** User-approved chat design and path rules in the conversation.

## Global Constraints

- Work only on local `file:` resources inside the selected VS Code workspace folder.
- A repository root outside that workspace folder is rejected.
- `.gitignore` lookup starts at a selected folder, or at the parent of a selected file, and stops at the repository root.
- If no `.gitignore` exists in that range, create or update the repository-root `.gitignore`.
- `git rm --cached` must preserve the local file or folder.
- Do not add runtime dependencies.

---

### Task 1: Implement path and Git helpers

**Files:**

- Create: `src/path.ts`
- Create: `src/git.ts`
- Test: `src/test/git.test.ts`

**Interfaces:**

- `resolveResourceContext(resourceUri: vscode.Uri): Promise<ResourceContext>` returns the canonical resource path, workspace root, and file/directory kind.
- `findRepositoryRoot(startPath: string): Promise<string>` resolves Git's repository root.
- `removeFromGitIndex(repoRoot: string, resourcePath: string, isDirectory: boolean): Promise<void>` runs `git rm --cached` safely.

- [x] Add canonical workspace-boundary checks and Git path conversion.
- [x] Wrap Git execution with `execFile`, preserving stderr in typed errors.
- [x] Add tests for repository discovery and index removal while checking local-file preservation.

### Task 2: Implement `.gitignore` lookup and rule writing

**Files:**

- Create: `src/gitignore.ts`
- Test: `src/test/gitignore.test.ts`

**Interfaces:**

- `findNearestGitignore(resourcePath: string, isDirectory: boolean, repoRoot: string): Promise<string>` returns the nearest file or the repository-root target.
- `buildGitignoreRule(resourcePath: string, isDirectory: boolean, gitignorePath: string): string` creates an escaped repository-relative rule.
- `appendGitignoreRule(gitignorePath: string, rule: string): Promise<boolean>` appends only when the exact rule is absent.

- [x] Search only between the resource and repository root.
- [x] Preserve existing newline style and avoid duplicate exact rules.
- [x] Test nearest-file selection, root fallback, directory rules, special characters, and CRLF handling.

### Task 3: Register commands and update extension manifest

**Files:**

- Modify: `src/extension.ts`
- Modify: `package.json`

**Interfaces:**

- Register `git-tools.addToGitignore` and `git-tools.removeFromGitIndex` for `explorer/context` local resources.
- Command handlers show actionable success or error messages and reject missing resources.

- [x] Remove `helloWorld` registration.
- [x] Add Explorer menu contributions and Git-focused command titles.
- [x] Connect each handler to the path, Git, and `.gitignore` helpers with workspace/repository boundary validation.

### Task 4: Replace template documentation and tests

**Files:**

- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Delete: `vsc-extension-quickstart.md`
- Delete: `src/test/extension.test.ts`

- [x] Document prerequisites, commands, nested `.gitignore` lookup, multi-root behavior, and development scripts.
- [x] Record the initial feature release.
- [x] Remove the generated Hello World documentation and sample test.

### Task 5: Verify the extension

**Files:**

- Generated: `dist/extension.js`, `dist/extension.js.map`

- [x] Run `npm run check-types`.
- [x] Run `npm run lint`.
- [x] Run `npm run compile`.
- [x] Run the compiled tests with the locally installed VS Code test runtime; 7 tests passed.

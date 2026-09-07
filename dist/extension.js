"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));

// src/git.ts
var import_node_child_process = require("node:child_process");
var path2 = __toESM(require("node:path"));
var import_node_util = require("node:util");

// src/path-utils.ts
var path = __toESM(require("node:path"));
function isPathWithin(childPath, parentPath) {
  const child = path.resolve(childPath);
  const parent = path.resolve(parentPath);
  const relative4 = path.relative(parent, child);
  return relative4 === "" || relative4 !== ".." && !relative4.startsWith(`..${path.sep}`) && !path.isAbsolute(relative4);
}
function pathsEqual(left, right) {
  return isPathWithin(left, right) && isPathWithin(right, left);
}

// src/git.ts
var execFileAsync = (0, import_node_util.promisify)(import_node_child_process.execFile);
var GitCommandError = class extends Error {
  constructor(message, stderr) {
    super(message);
    this.stderr = stderr;
    this.name = "GitCommandError";
  }
  stderr;
};
async function runGit(args, cwd) {
  try {
    const result = await execFileAsync("git", args, { cwd, windowsHide: true, maxBuffer: 1024 * 1024 });
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString()
    };
  } catch (error) {
    const commandError = error;
    const stderr = commandError.stderr?.toString().trim();
    throw new GitCommandError(stderr || commandError.message || "Git \u547D\u4EE4\u6267\u884C\u5931\u8D25\u3002", stderr);
  }
}
async function findRepositoryRoot(startPath) {
  const { stdout } = await runGit(["-C", startPath, "rev-parse", "--show-toplevel"], startPath);
  const repoRoot = stdout.trim();
  if (!repoRoot) {
    throw new GitCommandError("\u65E0\u6CD5\u786E\u5B9A Git \u4ED3\u5E93\u6839\u76EE\u5F55\u3002");
  }
  return path2.resolve(repoRoot);
}
async function removeFromGitIndex(repoRoot, resourcePath, isDirectory) {
  if (!isPathWithin(resourcePath, repoRoot)) {
    throw new Error("\u6240\u9009\u8D44\u6E90\u4E0D\u5728\u5F53\u524D Git \u4ED3\u5E93\u8303\u56F4\u5185\u3002");
  }
  const relativePath = path2.relative(repoRoot, resourcePath).split(path2.sep).join("/") || ".";
  const args = ["rm", "--cached"];
  if (isDirectory) {
    args.push("-r");
  }
  args.push("--", relativePath);
  await runGit(args, repoRoot);
}

// src/gitignore.ts
var fs = __toESM(require("node:fs/promises"));
var path3 = __toESM(require("node:path"));
async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}
async function findNearestGitignore(resourcePath, isDirectory, repoRoot) {
  if (!isPathWithin(resourcePath, repoRoot)) {
    throw new Error("\u6240\u9009\u8D44\u6E90\u4E0D\u5728\u5F53\u524D Git \u4ED3\u5E93\u8303\u56F4\u5185\u3002");
  }
  let currentDirectory = isDirectory ? resourcePath : path3.dirname(resourcePath);
  while (true) {
    const candidate = path3.join(currentDirectory, ".gitignore");
    if (await isFile(candidate)) {
      return candidate;
    }
    if (pathsEqual(currentDirectory, repoRoot)) {
      return candidate;
    }
    const parentDirectory = path3.dirname(currentDirectory);
    if (pathsEqual(parentDirectory, currentDirectory) || !isPathWithin(parentDirectory, repoRoot)) {
      return path3.join(repoRoot, ".gitignore");
    }
    currentDirectory = parentDirectory;
  }
}
function escapeGitignorePath(relativePath) {
  return relativePath.split("/").map((segment) => segment.replace(/[\\#\s!*?\[\]]/g, (character) => `\\${character}`)).join("/");
}
function buildGitignoreRule(resourcePath, isDirectory, gitignorePath) {
  const baseDirectory = path3.dirname(gitignorePath);
  const relativePath = path3.relative(baseDirectory, resourcePath).split(path3.sep).join("/") || ".";
  if (isDirectory && relativePath === ".") {
    return "/*";
  }
  const escapedPath = escapeGitignorePath(relativePath);
  return `/${escapedPath}${isDirectory ? "/" : ""}`;
}
async function appendGitignoreRule(gitignorePath, rule) {
  let existing = "";
  try {
    existing = await fs.readFile(gitignorePath, "utf8");
  } catch (error) {
    const code = error.code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
  const lines = existing.split(/\r?\n/);
  if (lines.includes(rule)) {
    return false;
  }
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  let updated;
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

// src/operations.ts
async function ensureResourceIgnored(resourcePath, isDirectory, repoRoot) {
  const gitignorePath = await findNearestGitignore(
    resourcePath,
    isDirectory,
    repoRoot
  );
  const rule = buildGitignoreRule(resourcePath, isDirectory, gitignorePath);
  const added = await appendGitignoreRule(gitignorePath, rule);
  return { gitignorePath, rule, added };
}
async function removeFromGitIndexAndIgnore(repoRoot, resourcePath, isDirectory) {
  const update = await ensureResourceIgnored(
    resourcePath,
    isDirectory,
    repoRoot
  );
  await removeFromGitIndex(repoRoot, resourcePath, isDirectory);
  return update;
}

// src/path.ts
var fs2 = __toESM(require("node:fs/promises"));
var path4 = __toESM(require("node:path"));
var vscode = __toESM(require("vscode"));
async function resolveResourceContext(resourceUri) {
  if (resourceUri.scheme !== "file") {
    throw new Error("Git Tools \u53EA\u652F\u6301\u672C\u5730\u6587\u4EF6\u548C\u6587\u4EF6\u5939\u3002");
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(resourceUri);
  if (!workspaceFolder) {
    throw new Error("\u8BF7\u5148\u6253\u5F00\u5305\u542B\u8BE5\u8D44\u6E90\u7684\u5DE5\u4F5C\u533A\u3002");
  }
  const [resourcePath, workspaceRoot] = await Promise.all([
    fs2.realpath(resourceUri.fsPath),
    fs2.realpath(workspaceFolder.uri.fsPath)
  ]);
  if (!isPathWithin(resourcePath, workspaceRoot)) {
    throw new Error("\u6240\u9009\u8D44\u6E90\u4E0D\u5728\u5F53\u524D\u5DE5\u4F5C\u533A\u8303\u56F4\u5185\u3002");
  }
  const resourceStat = await fs2.stat(resourcePath);
  const repoRoot = await findRepositoryRoot(resourceStat.isDirectory() ? resourcePath : path4.dirname(resourcePath));
  if (!isPathWithin(repoRoot, workspaceRoot)) {
    throw new Error("Git \u4ED3\u5E93\u6839\u76EE\u5F55\u8D85\u51FA\u4E86\u5F53\u524D\u5DE5\u4F5C\u533A\u8303\u56F4\uFF0C\u5DF2\u53D6\u6D88\u64CD\u4F5C\u3002");
  }
  if (!isPathWithin(resourcePath, repoRoot)) {
    throw new Error("\u6240\u9009\u8D44\u6E90\u4E0D\u5728\u5F53\u524D Git \u4ED3\u5E93\u8303\u56F4\u5185\u3002");
  }
  return {
    resourcePath,
    workspaceRoot,
    repoRoot,
    isDirectory: resourceStat.isDirectory()
  };
}

// src/extension.ts
function activate(context) {
  context.subscriptions.push(
    vscode2.commands.registerCommand(
      "git-tools.addToGitignore",
      (resourceUri) => addToGitignore(resourceUri)
    ),
    vscode2.commands.registerCommand(
      "git-tools.removeFromGitIndex",
      (resourceUri) => removeFromGitIndex2(resourceUri)
    )
  );
}
function deactivate() {
}
async function addToGitignore(resourceUri) {
  try {
    const context = await resolveResourceContext(
      resourceUri ?? getActiveEditorResource()
    );
    const update = await ensureResourceIgnored(
      context.resourcePath,
      context.isDirectory,
      context.repoRoot
    );
    const relativeGitignore = vscode2.workspace.asRelativePath(
      update.gitignorePath,
      false
    );
    const message = update.added ? `\u5DF2\u5C06 ${vscode2.workspace.asRelativePath(context.resourcePath, false)} \u6DFB\u52A0\u5230 ${relativeGitignore}\u3002` : `${vscode2.workspace.asRelativePath(context.resourcePath, false)} \u5DF2\u5B58\u5728\u4E8E ${relativeGitignore}\u3002`;
    void vscode2.window.showInformationMessage(message);
  } catch (error) {
    showOperationError("\u52A0\u5165 .gitignore", error);
  }
}
async function removeFromGitIndex2(resourceUri) {
  try {
    const context = await resolveResourceContext(
      resourceUri ?? getActiveEditorResource()
    );
    const update = await removeFromGitIndexAndIgnore(
      context.repoRoot,
      context.resourcePath,
      context.isDirectory
    );
    const relativeResource = vscode2.workspace.asRelativePath(
      context.resourcePath,
      false
    );
    const relativeGitignore = vscode2.workspace.asRelativePath(
      update.gitignorePath,
      false
    );
    const gitignoreStatus = update.added ? `\u5DF2\u540C\u65F6\u6DFB\u52A0\u5230 ${relativeGitignore}` : `\u5FFD\u7565\u89C4\u5219\u5DF2\u5B58\u5728\u4E8E ${relativeGitignore}`;
    void vscode2.window.showInformationMessage(
      `\u5DF2\u5C06 ${relativeResource} \u4ECE Git \u7D22\u5F15\u79FB\u9664\uFF0C\u672C\u5730\u6587\u4EF6\u5DF2\u4FDD\u7559\uFF1B${gitignoreStatus}\u3002`
    );
  } catch (error) {
    showOperationError("\u4ECE Git \u7D22\u5F15\u79FB\u9664", error);
  }
}
function getActiveEditorResource() {
  const resourceUri = vscode2.window.activeTextEditor?.document.uri;
  if (!resourceUri) {
    throw new Error("\u8BF7\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u9009\u62E9\u6587\u4EF6\u6216\u6587\u4EF6\u5939\uFF0C\u6216\u6253\u5F00\u4E00\u4E2A\u672C\u5730\u6587\u4EF6\u3002");
  }
  return resourceUri;
}
function showOperationError(operation, error) {
  const message = error instanceof GitCommandError ? error.message : error instanceof Error ? error.message : String(error);
  void vscode2.window.showErrorMessage(`${operation}\u5931\u8D25\uFF1A${message}`);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map

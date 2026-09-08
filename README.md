# Git Good Tools

Git Good Tools adds two actions to the VS Code Explorer context menu:

- **Git Good Tools: Add to .gitignore** adds the selected local file or folder to the nearest `.gitignore`.
- **Git Good Tools: Remove from Git Index** ensures the selected tracked file or folder has an entry in the nearest `.gitignore`, then runs `git rm --cached` and keeps the local content.

## Behavior

The extension works only with local files inside the selected VS Code workspace folder. In a multi-root workspace, the resource's own workspace folder is used as the boundary.

For `.gitignore` updates, Git Good Tools finds the repository root with Git, then searches from the selected folder (or the selected file's parent) upward. The first `.gitignore` it finds is updated. If none exists, a `.gitignore` is created at the repository root. The search never crosses the current workspace folder or writes to an outer repository.

When removing a resource from the Git index, the ignore rule is checked and added before the Git command runs. Existing exact rules are not duplicated.

The extension requires Git to be installed and available on `PATH`, and the selected resource must belong to a Git repository.

## Development

```bash
npm install
npm run compile
npm test
```

Press `F5` in VS Code to launch an Extension Development Host. The source entry point is `src/extension.ts`.

## License

MIT

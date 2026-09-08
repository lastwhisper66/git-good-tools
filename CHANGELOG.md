# Change Log

All notable changes to the Git Good Tools extension are documented here.

## [0.1.0] - 2026-09-07

- Initial release.
- Added the Explorer action `Git Good Tools: Add to .gitignore`, which adds the selected file or folder to the nearest `.gitignore`.
- Added the Explorer action `Git Good Tools: Remove from Git Index`, which ensures the selected resource is ignored and then runs `git rm --cached`, keeping the local content.
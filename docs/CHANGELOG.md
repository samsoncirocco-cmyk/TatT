# Changelog

## 2026-01-27

### Project Cleanup

-   **Consolidated Project Directories**: The `manama` directory, identified as redundant, has been removed. Unique and potentially important files from `manama` have been archived into `manama-next/archive`.
-   **Organized Documentation**: All markdown files (`.md`) from the root of `manama-next` have been moved into a new `manama-next/docs` directory for better organization.
-   **Improved Git Hygiene**: A `.gitignore` file has been added to the `manama-next` directory to properly ignore build artifacts, `node_modules`, and other temporary or generated files, preventing them from being tracked by Git.
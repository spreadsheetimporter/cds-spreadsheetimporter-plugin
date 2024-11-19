# cds-spreadsheetimporter-plugin

This is a plugin for the [CAP](https://cap.cloud.sap/) framework that allows you to import data from spreadsheets into your CAP project.

## Release Process

This project uses [release-it](https://github.com/release-it/release-it) to automate version management and package publishing. The release workflow is configured through GitHub Actions and can be triggered in two ways:

### Manual Release

1. Go to the GitHub repository's "Actions" tab
2. Select the "Release" workflow
3. Click "Run workflow"
4. You can either:
   - Leave the version field empty for automatic versioning based on conventional commits
   - Specify a specific version (e.g., "1.2.0")

### Local Release (for maintainers)

If you prefer to release from your local machine:

1. Ensure you have the necessary credentials:
   - `NPM_TOKEN` for publishing to npm
   - `GITHUB_TOKEN` for creating GitHub releases
2. Run one of the following commands:
   ```bash
   npm run release              # For automatic versioning
   npm run release X.Y.Z        # For specific version
   ```

### What happens during release?

The release process will:

1. Determine the next version number (based on conventional commits or manual input)
2. Update the package.json version
3. Generate/update the CHANGELOG.md file
4. Create a git tag
5. Push changes to GitHub
6. Create a GitHub release with release notes
7. Publish the package to npm

The release configuration uses the Angular conventional commit preset for changelog generation and requires commit messages to follow the conventional commits specification.

# cds-spreadsheetimporter-plugin

This is a plugin for the [CAP](https://cap.cloud.sap/) framework that allows you to import data from spreadsheets into your CAP project.

## Enable Import for Selected Entities

By default, the importer keeps the existing behavior and allows uploads for all entities. To limit uploads to selected entities, annotate the allowed service entities with `@spreadsheetimporter.enabled` in your CDS model:

```cds
using my.bookshop as my from '../db/schema';
using from 'cds-spreadsheetimporter-plugin';

service CatalogService {
    @spreadsheetimporter.enabled
    entity Books as projection on my.Books;

    entity Authors as projection on my.Authors;
}
```

When at least one entity is annotated, the importer rejects uploads for every other entity with `403 SPREADSHEET_IMPORT_ENTITY_NOT_ENABLED`. Annotating a service projection also enables uploads for its underlying persistence entity, so existing URLs such as `/odata/v4/importer/Spreadsheet(entity='my.bookshop.Books')/content` keep working. Short entity names resolved by CAP, such as `Books`, are supported as well.

Use this annotation only to control which entities the importer may target. For user or role-based authorization, continue to use CAP authorization annotations such as `@requires` or `@restrict` on the importer service or your application services. For example:

```cds
annotate ImporterService with @requires: 'Admin';
```

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

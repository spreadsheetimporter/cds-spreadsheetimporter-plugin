const {
  _private: {
    IMPORTER_ENABLED_ANNOTATION,
    getEnabledImportEntities,
    isImportEnabledForEntity,
    resolveImportEntity,
  },
} = require('../importer-service');

function entity(name, extra = {}) {
  return {
    name,
    kind: 'entity',
    elements: {},
    ...extra,
  };
}

function projection(name, sourceName, extra = {}) {
  return entity(name, {
    query: {
      SELECT: {
        from: {
          ref: [sourceName],
        },
      },
    },
    ...extra,
  });
}

describe('import entity scoping', () => {
  test('allows all entities when no entity is explicitly enabled', () => {
    const definitions = {
      'my.bookshop.Books': entity('my.bookshop.Books'),
      'my.bookshop.Authors': entity('my.bookshop.Authors'),
    };

    expect(isImportEnabledForEntity('my.bookshop.Books', definitions)).toBe(true);
    expect(isImportEnabledForEntity('my.bookshop.Authors', definitions)).toBe(true);
  });

  test('allows annotated projections and their persistence entities', () => {
    const definitions = {
      'CatalogService.Books': projection('CatalogService.Books', 'my.bookshop.Books', {
        [IMPORTER_ENABLED_ANNOTATION]: true,
      }),
      'CatalogService.Authors': projection(
        'CatalogService.Authors',
        'my.bookshop.Authors'
      ),
      'my.bookshop.Books': entity('my.bookshop.Books'),
      'my.bookshop.Authors': entity('my.bookshop.Authors'),
    };

    expect(Array.from(getEnabledImportEntities(definitions)).sort()).toEqual([
      'CatalogService.Books',
      'my.bookshop.Books',
    ]);
    expect(isImportEnabledForEntity('CatalogService.Books', definitions)).toBe(true);
    expect(isImportEnabledForEntity('my.bookshop.Books', definitions)).toBe(true);
    expect(isImportEnabledForEntity('CatalogService.Authors', definitions)).toBe(false);
    expect(isImportEnabledForEntity('my.bookshop.Authors', definitions)).toBe(false);
  });

  test('allows projections when the persistence entity is annotated', () => {
    const definitions = {
      'CatalogService.Books': projection('CatalogService.Books', 'my.bookshop.Books'),
      'my.bookshop.Books': entity('my.bookshop.Books', {
        [IMPORTER_ENABLED_ANNOTATION]: true,
      }),
    };

    expect(isImportEnabledForEntity('CatalogService.Books', definitions)).toBe(true);
    expect(isImportEnabledForEntity('my.bookshop.Books', definitions)).toBe(true);
  });

  test('resolves short entity names from CAP entity lookup', () => {
    const definitions = {
      'CatalogService.Books': projection('CatalogService.Books', 'my.bookshop.Books', {
        [IMPORTER_ENABLED_ANNOTATION]: true,
      }),
      'my.bookshop.Books': entity('my.bookshop.Books'),
    };
    const entityLookup = {
      Books: definitions['my.bookshop.Books'],
    };

    const resolved = resolveImportEntity('Books', definitions, entityLookup);

    expect(resolved.targetName).toBe('my.bookshop.Books');
    expect(isImportEnabledForEntity('Books', definitions, entityLookup)).toBe(true);
  });

  test('resolves projection uploads to the persistence entity', () => {
    const definitions = {
      'CatalogService.Books': projection('CatalogService.Books', 'my.bookshop.Books'),
      'my.bookshop.Books': entity('my.bookshop.Books'),
    };

    const resolved = resolveImportEntity('CatalogService.Books', definitions);

    expect(resolved.requested.name).toBe('CatalogService.Books');
    expect(resolved.target.name).toBe('my.bookshop.Books');
  });
});

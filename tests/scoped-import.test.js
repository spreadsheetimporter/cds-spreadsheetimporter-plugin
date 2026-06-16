const path = require('path');
const cds = require('@sap/cds');

describe('scoped spreadsheet imports', () => {
  const cdsTest = cds
    .test('serve', 'all', '--in-memory?')
    .in(path.join(__dirname, 'fixtures', 'scoped-project'));

  function upload(entity) {
    return fetch(
      `${cdsTest.url}/odata/v4/importer/Spreadsheet(entity='${entity}')/content`,
      {
        method: 'PUT',
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body: Buffer.from('not an xlsx file'),
      }
    );
  }

  test('rejects entities that are not enabled for spreadsheet import', async () => {
    const response = await upload('scoped.bookshop.Authors');
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe('SPREADSHEET_IMPORT_ENTITY_NOT_ENABLED');
  });

  test('allows annotated projection targets to pass the scope check', async () => {
    const response = await upload('scoped.bookshop.Books');

    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  });
});

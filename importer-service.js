const cds = global.cds || require('@sap/cds');
const XLSX = require('xlsx');
const SheetHandler = require('./utils/SheetHandler');
const Parser = require('./utils/Parser');

const IMPORTER_ENABLED_ANNOTATION = '@spreadsheetimporter.enabled';
const ENTITY_NOT_ENABLED_CODE = 'SPREADSHEET_IMPORT_ENTITY_NOT_ENABLED';

function getDefinitions() {
  return cds.model?.definitions || cds.entities?.() || {};
}

function getEntityLookup() {
  return cds.entities?.() || {};
}

function findEntity(entityName, definitions, entityLookup) {
  if (definitions[entityName]) {
    return {
      entity: definitions[entityName],
      entityName,
    };
  }

  const entity = entityLookup[entityName];
  if (!entity) return undefined;

  return {
    entity,
    entityName: entity.name || entityName,
  };
}

function getProjectionSourceName(entity) {
  const ref =
    entity?.query?.SELECT?.from?.ref || entity?.projection?.from?.ref || [];
  const sourceName = ref
    .map((part) => (typeof part === 'string' ? part : part.id))
    .filter(Boolean)
    .join('.');

  return sourceName || undefined;
}

function resolvePersistenceName(entity, definitions, seen = new Set(), fallbackName) {
  if (!entity) return undefined;

  const entityName = entity.name || fallbackName;
  if (entityName) {
    if (seen.has(entityName)) return entityName;
    seen.add(entityName);
  }

  const sourceName = getProjectionSourceName(entity);
  if (!sourceName || sourceName === entityName) return entityName;

  return (
    resolvePersistenceName(definitions[sourceName], definitions, seen, sourceName) ||
    sourceName
  );
}

function getEnabledImportEntities(definitions = getDefinitions()) {
  const enabledEntities = new Set();

  for (const [entityName, entity] of Object.entries(definitions)) {
    if (entity?.kind !== 'entity' || entity[IMPORTER_ENABLED_ANNOTATION] !== true) {
      continue;
    }

    enabledEntities.add(entity.name || entityName);

    const persistenceName = resolvePersistenceName(
      entity,
      definitions,
      new Set(),
      entityName
    );
    if (persistenceName) enabledEntities.add(persistenceName);
  }

  return enabledEntities;
}

function resolveImportEntity(
  entityName,
  definitions = getDefinitions(),
  entityLookup = getEntityLookup()
) {
  const found = findEntity(entityName, definitions, entityLookup);
  if (!found) return undefined;

  const requested = found.entity;
  const requestedName = found.entityName;
  const persistenceName = resolvePersistenceName(
    requested,
    definitions,
    new Set(),
    requestedName
  );
  const target = definitions[persistenceName] || entityLookup[persistenceName] || requested;

  return {
    requested,
    requestedName,
    target,
    targetName: target.name || persistenceName || requestedName,
  };
}

function isImportEnabledForEntity(
  entityName,
  definitions = getDefinitions(),
  entityLookup = getEntityLookup()
) {
  const enabledEntities = getEnabledImportEntities(definitions);
  if (enabledEntities.size === 0) return true;

  const resolvedEntity = resolveImportEntity(
    entityName,
    definitions,
    entityLookup
  );
  if (!resolvedEntity) return false;

  return (
    enabledEntities.has(entityName) ||
    enabledEntities.has(resolvedEntity.requestedName) ||
    enabledEntities.has(resolvedEntity.targetName)
  );
}

class ImporterService extends cds.ApplicationService {
  init() {
    this.on('UPDATE', 'Spreadsheet', async (req) => {
      console.log(
        'Spreadsheet importer received request with content type:',
        req.headers && req.headers['content-type']
      );

      const requestedEntityName = req.params?.[0]?.entity;
      console.log('Entity parameter:', requestedEntityName);
      console.log('Request data structure:', Object.keys(req.data || {}));

      const definitions = getDefinitions();
      const entityLookup = getEntityLookup();
      const resolvedEntity = resolveImportEntity(
        requestedEntityName,
        definitions,
        entityLookup
      );
      if (!resolvedEntity) {
        return req.reject(400, `Entity '${requestedEntityName}' not found`);
      }

      if (
        !isImportEnabledForEntity(
          requestedEntityName,
          definitions,
          entityLookup
        )
      ) {
        return req.reject({
          status: 403,
          code: ENTITY_NOT_ENABLED_CODE,
          message: `Spreadsheet import is not enabled for entity '${requestedEntityName}'`,
        });
      }

      // Handle file content using a streaming approach for large files
      const chunks = [];

      // Check if we have access to the content as a stream
      console.log('Processing content as a stream');

      // Collect all chunks before processing
      try {
        await new Promise((resolve, reject) => {
          req.data.content.on('data', (chunk) => {
            console.log(`Received chunk of size: ${chunk.length} bytes`);
            chunks.push(chunk);
          });

          req.data.content.on('end', () => {
            console.log(`Stream ended, received ${chunks.length} chunks`);
            resolve();
          });

          req.data.content.on('error', (err) => {
            console.error('Error reading content stream:', err);
            reject(err);
          });
        });
      } catch (error) {
        console.error('Spreadsheet import error:', error);
        return req.reject(500, `Failed to process spreadsheet: ${error.message}`);
      }

      // Once we have all chunks, process the file
      const totalBuffer = Buffer.concat(chunks);
      console.log(
        `Processing complete file of size: ${totalBuffer.length} bytes`
      );

      try {
        const spreadSheet = XLSX.read(totalBuffer, {
          type: 'buffer',
          cellNF: true,
          cellDates: true,
          cellText: true,
          cellFormula: true,
        });

        let spreadsheetSheetsData = [];
        let columnNames = [];

        console.log(
          `Workbook contains ${spreadSheet.SheetNames.length} sheets`
        );

        // Loop over the sheet names in the workbook
        for (const sheetName of Object.keys(spreadSheet.Sheets)) {
          console.log(`Processing sheet: ${sheetName}`);
          let currSheetData = SheetHandler.sheet_to_json(
            spreadSheet.Sheets[sheetName]
          );
          console.log(
            `Sheet ${sheetName} has ${currSheetData.length} rows of data`
          );

          for (const dataVal of currSheetData) {
            Object.keys(dataVal).forEach((key) => {
              dataVal[key].sheetName = sheetName;
            });
          }

          spreadsheetSheetsData = spreadsheetSheetsData.concat(currSheetData);
          columnNames = columnNames.concat(
            XLSX.utils.sheet_to_json(spreadSheet.Sheets[sheetName], {
              header: 1,
            })[0]
          );
        }

        console.log(
          `Total data rows to process: ${spreadsheetSheetsData.length}`
        );
        const data = Parser.parseSpreadsheetData(
          spreadsheetSheetsData,
          resolvedEntity.requested.elements || resolvedEntity.target.elements
        );
        console.log(
          `Inserting ${data.length} rows into ${resolvedEntity.targetName}`
        );

        await cds.db.run(INSERT(data).into(resolvedEntity.targetName));
        console.log('Import completed successfully');
      } catch (error) {
        console.error('Error processing Excel file:', error);
        return req.reject(400, `Failed to parse spreadsheet: ${error.message}`);
      }
    });
    return super.init();
  }
}

module.exports = ImporterService;
module.exports._private = {
  ENTITY_NOT_ENABLED_CODE,
  IMPORTER_ENABLED_ANNOTATION,
  findEntity,
  getEnabledImportEntities,
  isImportEnabledForEntity,
  resolveImportEntity,
  resolvePersistenceName,
};

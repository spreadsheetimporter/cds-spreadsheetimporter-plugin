const cds = global.cds || require('@sap/cds');
const XLSX = require('xlsx');
const SheetHandler = require('./utils/SheetHandler');
const Parser = require('./utils/Parser');
const { PassThrough } = require('stream');

module.exports = class ImporterService extends cds.ApplicationService {
  init() {
    this.on('UPDATE', 'Spreadsheet', async (req) => {
      try {
        console.log(
          'Spreadsheet importer received request with content type:',
          req.headers && req.headers['content-type']
        );
        console.log('Entity parameter:', req.params[0].entity);
        console.log('Request data structure:', Object.keys(req.data || {}));

        const entity = cds.entities()[req.params[0].entity];
        if (!entity) {
          req.error(400, `Entity '${req.params[0].entity}' not found`);
          return;
        }

        // Handle file content using a streaming approach for large files
        const chunks = [];

        // Check if we have access to the content as a stream
        console.log('Processing content as a stream');

        // Collect all chunks before processing
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
            entity.elements
          );
          console.log(`Inserting ${data.length} rows into ${entity.name}`);

          await cds.db.run(INSERT(data).into(entity.name));
          console.log('Import completed successfully');
        } catch (xlsxError) {
          console.error('Error processing Excel file:', xlsxError);
          req.error(400, `Failed to parse spreadsheet: ${xlsxError.message}`);
          return;
        }
      } catch (error) {
        console.error('Spreadsheet import error:', error);
        req.error(500, `Failed to process spreadsheet: ${error.message}`);
      }
    });
    return super.init();
  }
};

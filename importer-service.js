const cds = global.cds || require("@sap/cds");
const XLSX = require("xlsx");
const SheetHandler = require("./utils/SheetHandler");
const Parser = require("./utils/Parser");


module.exports = class ImporterService extends cds.ApplicationService  {
  init() {

// module.exports = (srv) => {
    this.on('UPDATE','Spreadsheet', async req => {
    // srv.on('UPDATE','Spreadsheet', async req => {
      // const db = cds.connect.to('db');
        const entity = cds.entities()[req.params[0].entity];
        let spreadsheetSheetsData = [];
        let columnNames = [];
        const spreadSheet = XLSX.read(req.data.content.readableBuffer[0], { type: "buffer", cellNF: true, cellDates: true, cellText: true, cellFormula: true });

        // Loop over the sheet names in the workbook
        for (const sheetName of Object.keys(spreadSheet.Sheets)) {
            let currSheetData = SheetHandler.sheet_to_json(spreadSheet.Sheets[sheetName]);
            for (const dataVal of currSheetData) {
                Object.keys(dataVal).forEach((key) => {
                    dataVal[key].sheetName = sheetName;
                });
            }

            spreadsheetSheetsData = spreadsheetSheetsData.concat(currSheetData);
            columnNames = columnNames.concat(XLSX.utils.sheet_to_json(spreadSheet.Sheets[sheetName], { header: 1 })[0]);
        }
        const data = Parser.parseSpreadsheetData(spreadsheetSheetsData,entity.elements);
        await cds.db.run(INSERT(data).into(entity.name) );
    });
    return super.init();
  }
}
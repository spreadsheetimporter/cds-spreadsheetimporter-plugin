const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Upload API Tests', () => {
    const BASE_URL = 'http://localhost:4004';
    

    test('complete upload workflow', async () => {
        // 1. Upload spreadsheet
        const filePath = path.join(__dirname, 'spreadsheettest.xlsx');
        const fileBuffer = fs.readFileSync(filePath);
        
        const uploadResponse = await fetch(
            `${BASE_URL}/odata/v4/importer/Spreadsheet(entity='my.bookshop.Books')/content`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                },
                body: fileBuffer
            }
        );
        expect(uploadResponse.ok).toBeTruthy();

        // 2. Get spreadsheet template
        // const templateResponse = await fetch(
        //     `${BASE_URL}/odata/v4/importer/Spreadsheet(entity="Books")/content`,
        //     {
        //         method: 'GET'
        //     }
        // );
        // expect(templateResponse.ok).toBeTruthy();

        // 3. Verify imported data
        const verifyResponse = await fetch(
            `${BASE_URL}/odata/v4/catalog/Books`,
            {
                method: 'GET'
            }
        );
        expect(verifyResponse.ok).toBeTruthy();
        
        const books = await verifyResponse.json();
        expect(books).toBeDefined();
        expect(Array.isArray(books.value)).toBeTruthy();
    });
}); 
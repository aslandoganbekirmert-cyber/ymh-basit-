const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

async function checkSheets() {
    const auth = new google.auth.GoogleAuth({
        keyFilename: path.resolve('google-credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    try {
        const doc = await sheets.spreadsheets.get({ spreadsheetId });
        for (const sheet of doc.data.sheets) {
            const title = sheet.properties.title;
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${title}'!A1000:J1020`, // Fetch rows 1000 to 1020
            });
            const rows = res.data.values;
            if (rows && rows.length > 0) {
                console.log(`\n--- Tab: ${title} (Rows 1000+) ---`);
                console.log(rows);
            }
        }
    } catch(err) {
        console.error('API Error:', err.message);
    }
}
checkSheets();

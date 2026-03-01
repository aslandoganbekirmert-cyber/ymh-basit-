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
        console.log('Available Sheets tabs:', doc.data.sheets.map(s => s.properties.title).join(', '));

        for (const sheet of doc.data.sheets) {
            const title = sheet.properties.title;
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${title}'!A1:J1000`,
            });
            const rows = res.data.values;
            if (rows && rows.length > 0) {
                console.log(`\n--- Tab: ${title} ---`);
                console.log(`Total Rows: ${rows.length}`);
                console.log(`Last 3 rows:`);
                console.log(rows.slice(Math.max(rows.length - 3, 0)));
            } else {
                console.log(`\n--- Tab: ${title} --- (Empty)`);
            }
        }
    } catch (err) {
        console.error('API Error:', err.message);
    }
}

checkSheets();

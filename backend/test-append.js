const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

async function run() {
    const auth = new google.auth.GoogleAuth({
        keyFilename: path.resolve('google-credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Genel!A:J',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [['Test Date', 'Test Time', 'Test Proje', 'Test Plate', 'Test Material', '99', 'TON', 'Test Sup', '0000', 'Test Notes']],
            },
        });
        console.log('Appended successfully:', response.data.updates);
    } catch (err) {
        console.error('API Error:', err.message);
    }
}
run();

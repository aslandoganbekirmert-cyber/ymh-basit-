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
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Genel!A1:J1000',
        });
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found in Genel tab.');
        } else {
            console.log('Total Rows in Genel:', rows.length);
            console.log('Last 5 rows:');
            console.log(rows.slice(Math.max(rows.length - 5, 0)));
        }
    } catch(err) {
        console.error('Error:', err.message);
    }
}
run();

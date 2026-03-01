const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();
async function run() {
    console.log('Searching...');
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
            const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${title}'!A1:J2000` });
            if (res.data.values) {
                const found = res.data.values.filter(r => r.join(' ').includes('Test Data') || r.join(' ').includes('Test Date') || r.join(' ').includes('Genel') || r.join(' ').includes('35CUM885') || r.join(' ').includes('35TEST'));
                if (found.length > 0) {
                    console.log(`--- FOUND IN TAB: ${title} ---`);
                    console.log(found);
                }
            }
        }
    } catch (err) {
        console.error('API Error:', err.message);
    }
}
run();

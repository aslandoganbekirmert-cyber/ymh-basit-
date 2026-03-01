const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function run() {
    const keyPath = path.resolve('google-credentials.json');
    const auth = new google.auth.GoogleAuth({
        keyFilename: keyPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    try {
        const doc = await sheets.spreadsheets.get({ spreadsheetId });
        console.log("Found Spreadsheet:", doc.data.properties.title);
        console.log("Tabs:");
        for (const sheet of doc.data.sheets) {
            console.log(" - " + sheet.properties.title);
        }
    } catch(err) {
        console.error("Error reading sheets:", err.message);
    }
}
run();

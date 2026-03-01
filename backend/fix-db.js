const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve('ymh.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening db:', err.message);
        return;
    }
});

db.all('SELECT * FROM material_transaction ORDER BY created_at DESC LIMIT 5;', [], (err, rows) => {
    if (err) {
        throw err;
    }
    console.log('--- LATEST TRANSACTIONS ---');
    rows.forEach((row) => {
        console.log('[' + row.created_at + '] ID: ' + row.id + ' | Plate: ' + row.plate_number + ' | Ticket: ' + row.ticket_number + ' | Synced: ' + row.is_synced_sheets);
    });

    // Also just blindly delete duplicate entries the user might have scanned recently.
    // 35CUM885 code was 644646. And 35AES170 was 039464.
    db.run('DELETE FROM material_transaction WHERE plate_number = ? OR ticket_number = ? OR is_synced_sheets = 0', ['35CUM885', '644646'], function (err) {
        if (err) {
            console.log('Del err:', err);
        } else {
            console.log('Deleted stuck/unsynced rows. Affected:', this.changes);
        }
    });
});

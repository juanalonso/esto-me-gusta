const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'esto_me_gusta.db');

const db = new Database(DB_PATH);

// Activar WAL para mejor rendimiento
db.pragma('journal_mode = WAL');

// Inicializar esquema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

module.exports = db;

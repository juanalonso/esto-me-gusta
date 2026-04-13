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

// Migraciones incrementales
const columnas = db.pragma('table_info(productos)').map(c => c.name);
if (!columnas.includes('categoria_id')) {
    db.exec('ALTER TABLE productos ADD COLUMN categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL');
}

module.exports = db;

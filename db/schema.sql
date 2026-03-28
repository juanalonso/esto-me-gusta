CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barras TEXT,
    nombre TEXT,
    foto TEXT,
    valoracion TEXT CHECK(valoracion IN ('me_gusta', 'pse', 'no_me_gusta')) NOT NULL,
    notas TEXT DEFAULT '',
    fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP,
    pendiente_revision INTEGER DEFAULT 1,
    eliminado INTEGER DEFAULT 0
);

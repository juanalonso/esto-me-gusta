const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { buscarProducto } = require('../services/openfoodfacts');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const router = express.Router();

// Configurar multer para subida de fotos
const storage = multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => {
        const nombre = `${Date.now()}_${file.originalname}`;
        cb(null, nombre);
    }
});
const upload = multer({ storage });

// Middleware: verificar autenticación para rutas de escritura
function requiereAuth(req, res, next) {
    if (req.session.autenticado === true) return next();
    res.status(401).json({ error: 'No autorizado' });
}

// GET /api/productos — Listar productos (no eliminados)
router.get('/', (req, res) => {
    const { orden, direccion, valoracion, revision, busqueda } = req.query;

    let sql = 'SELECT * FROM productos WHERE eliminado = 0';
    const params = [];

    if (valoracion && valoracion !== 'todos') {
        sql += ' AND valoracion = ?';
        params.push(valoracion);
    }

    if (revision === 'pendientes') {
        sql += ' AND pendiente_revision = 1';
    } else if (revision === 'revisados') {
        sql += ' AND pendiente_revision = 0';
    }

    if (busqueda) {
        sql += ' AND nombre LIKE ?';
        params.push(`%${busqueda}%`);
    }

    const columnaOrden = orden === 'nombre' ? 'nombre' : 'fecha_alta';
    const dir = direccion === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${columnaOrden} ${dir}`;

    const productos = db.prepare(sql).all(...params);
    res.json(productos);
});

// GET /api/productos/buscar/:codigo — Buscar por código de barras (para escaneo)
router.get('/buscar/:codigo', async (req, res) => {
    const { codigo } = req.params;

    // Buscar en BD (solo no eliminados)
    const existente = db.prepare(
        'SELECT * FROM productos WHERE codigo_barras = ? AND eliminado = 0'
    ).get(codigo);

    if (existente) {
        return res.json({ encontrado: true, producto: existente });
    }

    // Consultar Open Food Facts
    const datosOFF = await buscarProducto(codigo);

    res.json({
        encontrado: false,
        sugerencia: datosOFF ? { nombre: datosOFF.nombre, foto: datosOFF.foto } : null
    });
});

// POST /api/productos — Crear producto (desde escaneo móvil)
router.post('/', (req, res) => {
    const { codigo_barras, nombre, foto, valoracion, notas } = req.body;

    const result = db.prepare(
        `INSERT INTO productos (codigo_barras, nombre, foto, valoracion, notas)
         VALUES (?, ?, ?, ?, ?)`
    ).run(codigo_barras, nombre || '', foto || null, valoracion, notas || '');

    const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(producto);
});

// PUT /api/productos/:id — Editar producto (desde dashboard, requiere auth)
router.put('/:id', requiereAuth, upload.single('foto'), (req, res) => {
    const { id } = req.params;
    const producto = db.prepare('SELECT * FROM productos WHERE id = ? AND eliminado = 0').get(id);

    if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const { nombre, codigo_barras, valoracion, notas, pendiente_revision, eliminar_foto } = req.body;

    let foto = producto.foto;
    if (req.file) {
        // Borrar foto anterior si existe
        if (producto.foto) {
            const rutaAnterior = path.join(UPLOADS_DIR, producto.foto);
            if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
        }
        foto = req.file.filename;
    } else if (eliminar_foto === 'true') {
        if (producto.foto) {
            const rutaAnterior = path.join(__dirname, '..', 'uploads', producto.foto);
            if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
        }
        foto = null;
    }

    db.prepare(
        `UPDATE productos SET nombre = ?, codigo_barras = ?, valoracion = ?, notas = ?,
         foto = ?, pendiente_revision = ? WHERE id = ?`
    ).run(
        nombre ?? producto.nombre,
        codigo_barras ?? producto.codigo_barras,
        valoracion ?? producto.valoracion,
        notas ?? producto.notas,
        foto,
        pendiente_revision !== undefined ? parseInt(pendiente_revision) : producto.pendiente_revision,
        id
    );

    const actualizado = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
    res.json(actualizado);
});

// DELETE /api/productos/:id — Soft delete (requiere auth)
router.delete('/:id', requiereAuth, (req, res) => {
    const { id } = req.params;
    const result = db.prepare('UPDATE productos SET eliminado = 1 WHERE id = ? AND eliminado = 0').run(id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ ok: true });
});

module.exports = router;

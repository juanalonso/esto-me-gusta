const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');

const router = express.Router();

// Middleware: verificar autenticación
function requiereAuth(req, res, next) {
    if (req.session.autenticado === true) return next();
    res.status(401).json({ error: 'No autorizado' });
}

// GET /api/papelera — Listar productos eliminados
router.get('/', requiereAuth, (req, res) => {
    const productos = db.prepare(
        'SELECT * FROM productos WHERE eliminado = 1 ORDER BY fecha_alta DESC'
    ).all();
    res.json(productos);
});

// POST /api/papelera/restaurar/:id — Restaurar producto
router.post('/restaurar/:id', requiereAuth, (req, res) => {
    const { id } = req.params;
    const result = db.prepare('UPDATE productos SET eliminado = 0 WHERE id = ? AND eliminado = 1').run(id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Producto no encontrado en papelera' });
    }

    res.json({ ok: true });
});

// DELETE /api/papelera/vaciar — Eliminar definitivamente todos
router.delete('/vaciar', requiereAuth, (req, res) => {
    // Borrar fotos de productos en papelera
    const productos = db.prepare('SELECT foto FROM productos WHERE eliminado = 1 AND foto IS NOT NULL').all();
    for (const p of productos) {
        const ruta = path.join(__dirname, '..', 'uploads', p.foto);
        if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    db.prepare('DELETE FROM productos WHERE eliminado = 1').run();
    res.json({ ok: true });
});

module.exports = router;

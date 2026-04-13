const express = require('express');
const db = require('../db/database');

const router = express.Router();

function requiereAuth(req, res, next) {
    if (req.session.autenticado === true) return next();
    res.status(401).json({ error: 'No autorizado' });
}

// GET /api/categorias
router.get('/', (req, res) => {
    const categorias = db.prepare('SELECT * FROM categorias ORDER BY nombre ASC').all();
    res.json(categorias);
});

// POST /api/categorias
router.post('/', requiereAuth, (req, res) => {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    try {
        const result = db.prepare('INSERT INTO categorias (nombre) VALUES (?)').run(nombre.trim());
        const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(categoria);
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
        }
        throw e;
    }
});

// PUT /api/categorias/:id
router.put('/:id', requiereAuth, (req, res) => {
    const { id } = req.params;
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    try {
        const result = db.prepare('UPDATE categorias SET nombre = ? WHERE id = ?').run(nombre.trim(), id);
        if (result.changes === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
        const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
        res.json(categoria);
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
        }
        throw e;
    }
});

// DELETE /api/categorias/:id
router.delete('/:id', requiereAuth, (req, res) => {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM categorias WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
    const { password } = req.body;

    if (password === process.env.PASSWORD) {
        req.session.autenticado = true;
        res.json({ ok: true });
    } else {
        // No revelar si la contraseña es incorrecta
        res.json({ ok: false });
    }
});

router.get('/estado', (req, res) => {
    res.json({ autenticado: req.session.autenticado === true });
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

module.exports = router;

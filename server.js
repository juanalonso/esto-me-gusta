require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_por_defecto',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Redirigir a escáner en móvil, dashboard en escritorio
app.get('/', (req, res) => {
    const ua = req.headers['user-agent'] || '';
    const esMobil = /Android|iPhone|iPad|iPod/i.test(ua);
    if (esMobil) {
        res.redirect('/escaner.html');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    }
});

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/papelera', require('./routes/papelera'));
app.use('/api/categorias', require('./routes/categorias'));

app.listen(PORT, () => {
    console.log(`Servidor arrancado en http://localhost:${PORT}`);
});

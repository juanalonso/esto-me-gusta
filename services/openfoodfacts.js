const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function buscarProducto(codigoBarras) {
    const url = `https://world.openfoodfacts.org/api/v0/product/${codigoBarras}.json`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 1) {
            return null;
        }

        const producto = data.product;
        const nombre = producto.product_name || producto.product_name_es || '';
        const fotoUrl = producto.image_front_url || producto.image_url || null;

        let fotoLocal = null;
        if (fotoUrl) {
            fotoLocal = await descargarFoto(fotoUrl, codigoBarras);
        }

        return { nombre, foto: fotoLocal };
    } catch (error) {
        console.error('Error consultando Open Food Facts:', error.message);
        return null;
    }
}

async function descargarFoto(url, codigoBarras) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const buffer = Buffer.from(await response.arrayBuffer());
        const extension = path.extname(new URL(url).pathname) || '.jpg';
        const nombreArchivo = `${codigoBarras}_${Date.now()}${extension}`;
        const rutaArchivo = path.join(UPLOADS_DIR, nombreArchivo);

        fs.writeFileSync(rutaArchivo, buffer);
        return nombreArchivo;
    } catch (error) {
        console.error('Error descargando foto:', error.message);
        return null;
    }
}

module.exports = { buscarProducto };

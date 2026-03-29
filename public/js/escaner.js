// === Estado ===
let html5QrCode = null;
let valoracionSeleccionada = null;

// === Elementos ===
const seccionEscaner = document.getElementById('seccion-escaner');
const seccionEncontrado = document.getElementById('seccion-encontrado');
const seccionNuevo = document.getElementById('seccion-nuevo');
const seccionGuardado = document.getElementById('seccion-guardado');
const btnEscanear = document.getElementById('btn-escanear');
const lector = document.getElementById('lector');

// === Navegación entre secciones ===
function mostrarSeccion(seccion) {
    [seccionEscaner, seccionEncontrado, seccionNuevo, seccionGuardado].forEach(s => {
        s.classList.add('oculto');
    });
    seccion.classList.remove('oculto');
}

// === Escáner ===
btnEscanear.addEventListener('click', iniciarEscaner);

function iniciarEscaner() {
    btnEscanear.classList.add('oculto');

    html5QrCode = new Html5Qrcode('lector');
    html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        onCodigoDetectado
    ).catch(err => {
        console.error('Error al iniciar cámara:', err);
        btnEscanear.classList.remove('oculto');
        btnEscanear.textContent = 'Reintentar cámara';
    });
}

function pararEscaner() {
    if (html5QrCode && html5QrCode.isScanning) {
        return html5QrCode.stop().catch(() => {});
    }
    return Promise.resolve();
}

function reanudarEscaner() {
    mostrarSeccion(seccionEscaner);
    btnEscanear.classList.add('oculto');
    html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        onCodigoDetectado
    ).catch(() => {
        // Si falla al reanudar, mostrar botón
        btnEscanear.classList.remove('oculto');
        btnEscanear.textContent = 'Reintentar cámara';
    });
}

async function onCodigoDetectado(codigo) {
    await pararEscaner();
    await buscarProducto(codigo);
}

// === Buscar producto en servidor ===
async function buscarProducto(codigo) {
    try {
        const resp = await fetch(`/api/productos/buscar/${encodeURIComponent(codigo)}`);
        const data = await resp.json();

        if (data.encontrado) {
            mostrarProductoEncontrado(data.producto);
        } else {
            mostrarFormularioNuevo(codigo, data.sugerencia);
        }
    } catch (error) {
        console.error('Error buscando producto:', error);
        alert('Error de conexión. Inténtalo de nuevo.');
        volverAEscaner();
    }
}

// === Producto encontrado (solo lectura) ===
function mostrarProductoEncontrado(producto) {
    mostrarSeccion(seccionEncontrado);

    const foto = document.getElementById('encontrado-foto');
    const fotoPlaceholder = document.getElementById('encontrado-foto-placeholder');

    if (producto.foto) {
        foto.src = `/uploads/${producto.foto}`;
        foto.classList.remove('oculto');
        fotoPlaceholder.classList.add('oculto');
    } else {
        foto.classList.add('oculto');
        fotoPlaceholder.classList.remove('oculto');
    }

    document.getElementById('encontrado-nombre').textContent = producto.nombre || 'Sin nombre';

    const valoracionTexto = {
        me_gusta: 'Me gusta',
        pse: 'Psé',
        no_me_gusta: 'No me gusta'
    };
    const valoracionClase = {
        me_gusta: 'badge-me-gusta',
        pse: 'badge-pse',
        no_me_gusta: 'badge-no-me-gusta'
    };
    document.getElementById('encontrado-valoracion').innerHTML =
        `<span class="badge ${valoracionClase[producto.valoracion]}">${valoracionTexto[producto.valoracion]}</span>`;

    const notas = document.getElementById('encontrado-notas');
    if (producto.notas) {
        notas.textContent = producto.notas;
        notas.classList.remove('oculto');
    } else {
        notas.classList.add('oculto');
    }

    const fecha = new Date(producto.fecha_alta);
    document.getElementById('encontrado-fecha').textContent =
        `Añadido el ${fecha.toLocaleDateString('es-ES')}`;
}

// === Producto nuevo (formulario) ===
function mostrarFormularioNuevo(codigo, sugerencia) {
    mostrarSeccion(seccionNuevo);

    document.getElementById('nuevo-codigo').value = codigo;
    document.getElementById('nuevo-notas').value = '';
    valoracionSeleccionada = null;
    document.getElementById('btn-guardar').disabled = true;

    // Limpiar selección de valoración
    document.querySelectorAll('.valoracion-selector button').forEach(b => {
        b.classList.remove('seleccionado');
    });

    if (sugerencia) {
        document.getElementById('nuevo-nombre').value = sugerencia.nombre || '';

        const fotoContenedor = document.getElementById('nuevo-foto-contenedor');
        if (sugerencia.foto) {
            document.getElementById('nuevo-foto-preview').src = `/uploads/${sugerencia.foto}`;
            document.getElementById('nuevo-foto').value = sugerencia.foto;
            fotoContenedor.classList.remove('oculto');
        } else {
            document.getElementById('nuevo-foto').value = '';
            fotoContenedor.classList.add('oculto');
        }
    } else {
        document.getElementById('nuevo-nombre').value = '';
        document.getElementById('nuevo-foto').value = '';
        document.getElementById('nuevo-foto-contenedor').classList.add('oculto');
    }
}

// === Selector de valoración ===
document.querySelectorAll('.valoracion-selector button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.valoracion-selector button').forEach(b => {
            b.classList.remove('seleccionado');
        });
        btn.classList.add('seleccionado');
        valoracionSeleccionada = btn.dataset.valor;
        document.getElementById('btn-guardar').disabled = false;
    });
});

// === Guardar producto ===
document.getElementById('btn-guardar').addEventListener('click', async () => {
    const btn = document.getElementById('btn-guardar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const resp = await fetch('/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codigo_barras: document.getElementById('nuevo-codigo').value,
                nombre: document.getElementById('nuevo-nombre').value,
                foto: document.getElementById('nuevo-foto').value || null,
                valoracion: valoracionSeleccionada,
                notas: document.getElementById('nuevo-notas').value
            })
        });

        if (resp.ok) {
            reanudarEscaner();
            mostrarToast('Producto guardado');
        } else {
            alert('Error al guardar. Inténtalo de nuevo.');
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error guardando producto:', error);
        alert('Error de conexión.');
        btn.disabled = false;
    }

    btn.textContent = 'Guardar';
});

// === Toast ===
function mostrarToast(texto) {
    const toast = document.getElementById('toast');
    toast.textContent = texto;
    toast.classList.remove('oculto');
    setTimeout(() => toast.classList.add('oculto'), 2500);
}

// === Botones de navegación ===
document.getElementById('btn-volver-escaner').addEventListener('click', reanudarEscaner);
document.getElementById('btn-cancelar-nuevo').addEventListener('click', reanudarEscaner);
document.getElementById('btn-volver-tras-guardar').addEventListener('click', reanudarEscaner);

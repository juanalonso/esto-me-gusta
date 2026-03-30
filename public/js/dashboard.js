// === Estado ===
let productos = [];
let productosEliminados = [];

// === Elementos ===
const listaProductos = document.getElementById('lista-productos');
const listaVacia = document.getElementById('lista-vacia');
const listaPapelera = document.getElementById('lista-papelera');
const papeleraVacia = document.getElementById('papelera-vacia');
const papeleraAcciones = document.getElementById('papelera-acciones');

// === Textos y clases de valoración ===
const VALORACION_TEXTO = { me_gusta: 'Me gusta', pse: 'Psé', no_me_gusta: 'No me gusta' };
const VALORACION_CLASE = { me_gusta: 'badge-me-gusta', pse: 'badge-pse', no_me_gusta: 'badge-no-me-gusta' };
const VALORACION_ICONO = { me_gusta: 'ti-thumb-up', pse: 'ti-minus', no_me_gusta: 'ti-thumb-down' };

// === Pestañas ===
document.querySelectorAll('.pestana').forEach(pestana => {
    pestana.addEventListener('click', () => {
        document.querySelectorAll('.pestana').forEach(p => p.classList.remove('activa'));
        pestana.classList.add('activa');

        const target = pestana.dataset.pestana;
        document.getElementById('pestana-listado').classList.toggle('oculto', target !== 'listado');
        document.getElementById('pestana-papelera').classList.toggle('oculto', target !== 'papelera');

        if (target === 'papelera') cargarPapelera();
        if (target === 'listado') cargarProductos();
    });
});

// === Cargar productos ===
async function cargarProductos() {
    const orden = document.getElementById('filtro-orden').value;
    const [columna, direccion] = orden.split('-');
    const valoracion = document.getElementById('filtro-valoracion').value;
    const revision = document.getElementById('filtro-revision').value;
    const busqueda = document.getElementById('filtro-busqueda').value;

    const params = new URLSearchParams({
        orden: columna,
        direccion,
        valoracion,
        revision,
        busqueda
    });

    try {
        const resp = await fetch(`/api/productos?${params}`);
        productos = await resp.json();
        renderizarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

function renderizarProductos() {
    if (productos.length === 0) {
        listaProductos.innerHTML = '';
        listaVacia.classList.remove('oculto');
        return;
    }

    listaVacia.classList.add('oculto');
    listaProductos.innerHTML = productos.map(p => crearFilaProducto(p)).join('');

    // Click para editar (solo si autenticado)
    listaProductos.querySelectorAll('.producto-fila').forEach(fila => {
        fila.addEventListener('click', () => {
            if (!autenticado) return;
            const id = parseInt(fila.dataset.id);
            const producto = productos.find(p => p.id === id);
            if (producto) abrirModalEditar(producto);
        });
    });
}

function crearFilaProducto(p) {
    const foto = p.foto
        ? `<img class="producto-fila-foto" src="/uploads/${p.foto}" alt="">`
        : `<div class="producto-fila-foto-placeholder">?</div>`;

    const fecha = new Date(p.fecha_alta).toLocaleDateString('es-ES');
    const pendiente = p.pendiente_revision
        ? '<span class="badge badge-pendiente">Pendiente</span>'
        : '';

    return `
        <div class="producto-fila" data-id="${p.id}" ${autenticado ? 'style="cursor:pointer"' : 'style="cursor:default"'}>
            ${foto}
            <div class="producto-fila-info">
                <h3>${p.nombre || 'Sin nombre'}</h3>
                <p>${fecha}</p>
            </div>
            <div class="producto-fila-badges">
                <span class="badge ${VALORACION_CLASE[p.valoracion]}"><i class="ti ${VALORACION_ICONO[p.valoracion]}"></i> ${VALORACION_TEXTO[p.valoracion]}</span>
                ${pendiente}
            </div>
        </div>
    `;
}

// === Filtros ===
document.getElementById('filtro-orden').addEventListener('change', cargarProductos);
document.getElementById('filtro-valoracion').addEventListener('change', cargarProductos);
document.getElementById('filtro-revision').addEventListener('change', cargarProductos);

let temporizadorBusqueda;
document.getElementById('filtro-busqueda').addEventListener('input', () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(cargarProductos, 300);
});

// === Modal de edición ===
const modalEditar = document.getElementById('modal-editar');
let rotacionActual = 0;

function abrirModalEditar(producto) {
    document.getElementById('editar-id').value = producto.id;
    document.getElementById('editar-nombre').value = producto.nombre || '';
    document.getElementById('editar-codigo').value = producto.codigo_barras || '';
    document.getElementById('editar-notas').value = producto.notas || '';
    document.getElementById('editar-revisado').checked = !producto.pendiente_revision;
    document.getElementById('editar-eliminar-foto').checked = false;
    document.getElementById('editar-foto-input').value = '';
    rotacionActual = 0;

    // Foto actual
    const fotoActual = document.getElementById('editar-foto-actual');
    const fotoAcciones = document.getElementById('editar-foto-acciones');
    if (producto.foto) {
        fotoActual.innerHTML = `<div id="editar-foto-marco" style="width: 120px; overflow: hidden; border-radius: var(--radio);"><img id="editar-foto-img" src="/uploads/${producto.foto}" style="width: 100%; display: block;"></div>`;
        fotoAcciones.classList.remove('oculto');
    } else {
        fotoActual.innerHTML = '<span style="color: var(--color-texto-secundario); font-size: 0.85rem;">Sin foto</span>';
        fotoAcciones.classList.add('oculto');
    }

    // Valoración
    document.querySelectorAll('#editar-valoracion button').forEach(btn => {
        btn.classList.toggle('seleccionado', btn.dataset.valor === producto.valoracion);
    });

    modalEditar.classList.remove('oculto');
}

// Botón rotar foto — siempre gira 90° sobre la imagen actual
document.getElementById('btn-rotar-foto').addEventListener('click', () => {
    rotacionActual = (rotacionActual + 90) % 360;
    const img = document.getElementById('editar-foto-img');
    if (!img) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = h;
    canvas.height = w;
    const ctx = canvas.getContext('2d');
    ctx.translate(h / 2, w / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -w / 2, -h / 2);
    img.src = canvas.toDataURL('image/jpeg', 0.9);
});

function cerrarModalEditar() {
    modalEditar.classList.add('oculto');
}

// Selector de valoración en modal
document.querySelectorAll('#editar-valoracion button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#editar-valoracion button').forEach(b => b.classList.remove('seleccionado'));
        btn.classList.add('seleccionado');
    });
});

document.getElementById('btn-cancelar-editar').addEventListener('click', cerrarModalEditar);

modalEditar.addEventListener('click', (e) => {
    if (e.target === modalEditar) cerrarModalEditar();
});

// === Guardar edición ===
document.getElementById('btn-guardar-editar').addEventListener('click', async () => {
    const id = document.getElementById('editar-id').value;
    const valoracionBtn = document.querySelector('#editar-valoracion button.seleccionado');

    const formData = new FormData();
    formData.append('nombre', document.getElementById('editar-nombre').value);
    formData.append('codigo_barras', document.getElementById('editar-codigo').value);
    formData.append('valoracion', valoracionBtn ? valoracionBtn.dataset.valor : '');
    formData.append('notas', document.getElementById('editar-notas').value);
    formData.append('pendiente_revision', document.getElementById('editar-revisado').checked ? '0' : '1');
    formData.append('eliminar_foto', document.getElementById('editar-eliminar-foto').checked ? 'true' : 'false');
    if (rotacionActual > 0) {
        formData.append('rotar', rotacionActual.toString());
    }

    const fotoInput = document.getElementById('editar-foto-input');
    if (fotoInput.files[0]) {
        formData.append('foto', fotoInput.files[0]);
    }

    const btnGuardar = document.getElementById('btn-guardar-editar');
    btnGuardar.disabled = true;
    document.body.style.cursor = 'wait';

    try {
        const resp = await fetch(`/api/productos/${id}`, {
            method: 'PUT',
            body: formData
        });

        if (resp.ok) {
            cerrarModalEditar();
            cargarProductos();
        } else {
            alert('Error al guardar los cambios.');
        }
    } catch (error) {
        console.error('Error guardando edición:', error);
        alert('Error de conexión.');
    } finally {
        btnGuardar.disabled = false;
        document.body.style.cursor = '';
    }
});

// === Eliminar producto ===
document.getElementById('btn-eliminar-producto').addEventListener('click', async () => {
    if (!confirm('¿Eliminar este producto? Se moverá a la papelera.')) return;

    const id = document.getElementById('editar-id').value;

    try {
        const resp = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
        if (resp.ok) {
            cerrarModalEditar();
            cargarProductos();
        } else {
            alert('Error al eliminar.');
        }
    } catch (error) {
        console.error('Error eliminando:', error);
        alert('Error de conexión.');
    }
});

// === Papelera ===
async function cargarPapelera() {
    if (!autenticado) {
        listaPapelera.innerHTML = '';
        papeleraVacia.classList.remove('oculto');
        papeleraAcciones.classList.add('oculto');
        return;
    }

    try {
        const resp = await fetch('/api/papelera');
        productosEliminados = await resp.json();
        renderizarPapelera();
    } catch (error) {
        console.error('Error cargando papelera:', error);
    }
}

function renderizarPapelera() {
    if (productosEliminados.length === 0) {
        listaPapelera.innerHTML = '';
        papeleraVacia.classList.remove('oculto');
        papeleraAcciones.classList.add('oculto');
        return;
    }

    papeleraVacia.classList.add('oculto');
    papeleraAcciones.classList.remove('oculto');

    listaPapelera.innerHTML = productosEliminados.map(p => `
        <div class="producto-fila" data-id="${p.id}">
            ${p.foto
                ? `<img class="producto-fila-foto" src="/uploads/${p.foto}" alt="">`
                : `<div class="producto-fila-foto-placeholder">?</div>`
            }
            <div class="producto-fila-info">
                <h3>${p.nombre || 'Sin nombre'}</h3>
                <p>${p.codigo_barras || ''}</p>
            </div>
            <div>
                <button class="btn btn-primario btn-pequeno btn-restaurar" data-id="${p.id}">
                    Restaurar
                </button>
            </div>
        </div>
    `).join('');

    // Botones de restaurar
    listaPapelera.querySelectorAll('.btn-restaurar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            try {
                const resp = await fetch(`/api/papelera/restaurar/${id}`, { method: 'POST' });
                if (resp.ok) cargarPapelera();
            } catch (error) {
                console.error('Error restaurando:', error);
            }
        });
    });
}

// Vaciar papelera
document.getElementById('btn-vaciar-papelera').addEventListener('click', async () => {
    if (!confirm('¿Vaciar la papelera? Se eliminarán todos los productos definitivamente.')) return;

    try {
        const resp = await fetch('/api/papelera/vaciar', { method: 'DELETE' });
        if (resp.ok) cargarPapelera();
    } catch (error) {
        console.error('Error vaciando papelera:', error);
    }
});

// === Reaccionar a cambios de auth ===
document.addEventListener('auth-cambiado', () => {
    cargarProductos();
});

// === Carga inicial ===
cargarProductos();

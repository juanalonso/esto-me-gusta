// === Estado ===
let productos = [];
let categorias = [];
let indiceActual = 0;
let categoriaActiva = 'todas';

const VALORACION_TEXTO = { me_gusta: 'Me gusta', pse: 'Psé', no_me_gusta: 'No me gusta' };
const VALORACION_CLASE = { me_gusta: 'badge-me-gusta', pse: 'badge-pse', no_me_gusta: 'badge-no-me-gusta' };
const VALORACION_ICONO = { me_gusta: 'ti-thumb-up', pse: 'ti-minus', no_me_gusta: 'ti-thumb-down' };

const card = document.getElementById('browse-card');
const chipsContainer = document.getElementById('browse-categorias');
// const inputCodigo = document.getElementById('browse-codigo'); // buscador por código comentado

// === Carga inicial ===
async function init() {
    await cargarCategorias();
    await cargarProductos();
    renderizarChips();
    renderizarCard();
}

async function cargarCategorias() {
    try {
        const resp = await fetch('/api/categorias');
        categorias = await resp.json();
    } catch (e) {
        console.error('Error cargando categorías:', e);
    }
}

async function cargarProductos() {
    try {
        const params = new URLSearchParams({ orden: 'nombre', direccion: 'asc' });
        if (categoriaActiva !== 'todas') params.set('categoria', categoriaActiva);
        const resp = await fetch(`/api/productos?${params}`);
        productos = await resp.json();
        indiceActual = 0;
    } catch (e) {
        console.error('Error cargando productos:', e);
    }
}

// === Chips de categoría ===
function renderizarChips() {
    const opciones = [{ id: 'todas', nombre: 'Todas' }, ...categorias];
    chipsContainer.innerHTML = opciones.map(c => `
        <button class="browse-chip ${String(c.id) === String(categoriaActiva) ? 'activo' : ''}" data-cat="${c.id}">
            ${c.nombre}
        </button>
    `).join('');

    chipsContainer.querySelectorAll('.browse-chip').forEach(chip => {
        chip.addEventListener('click', async () => {
            categoriaActiva = chip.dataset.cat;
            // inputCodigo.value = ''; // limpiar buscador por código al cambiar categoría
            await cargarProductos();
            renderizarChips();
            renderizarCard();
        });
    });
}

// === Tarjeta ===
function renderizarCard() {
    if (productos.length === 0) {
        card.innerHTML = `
            <div class="browse-vacio">
                <i class="ti ti-mood-empty" style="font-size: 3rem; color: var(--color-borde);"></i>
                <p>No hay productos</p>
            </div>`;
        return;
    }

    const p = productos[indiceActual];
    const foto = p.foto
        ? `<img class="browse-foto" src="/uploads/${p.foto}" alt="">`
        : `<div class="browse-foto-placeholder"><i class="ti ti-shopping-bag"></i></div>`;

    const catNombre = p.categoria_nombre
        || categorias.find(c => c.id === p.categoria_id)?.nombre
        || null;

    card.innerHTML = `
        ${foto}
        <div class="browse-card-info">
            <h2 class="browse-nombre">${p.nombre || 'Sin nombre'}</h2>
            <span class="badge ${VALORACION_CLASE[p.valoracion]}">
                <i class="ti ${VALORACION_ICONO[p.valoracion]}"></i> ${VALORACION_TEXTO[p.valoracion]}
            </span>
            ${catNombre ? `<p class="browse-categoria"><i class="ti ti-tag"></i> ${catNombre}</p>` : ''}
            ${p.notas ? `<p class="browse-notas">"${p.notas}"</p>` : ''}
        </div>
        <div class="browse-nav">
            <button class="btn btn-secundario browse-prev" ${indiceActual === 0 ? 'disabled' : ''}>
                <i class="ti ti-chevron-left"></i>
            </button>
            <span class="browse-contador">${indiceActual + 1} / ${productos.length}</span>
            <button class="btn btn-secundario browse-next" ${indiceActual === productos.length - 1 ? 'disabled' : ''}>
                <i class="ti ti-chevron-right"></i>
            </button>
        </div>
    `;

    card.querySelector('.browse-prev').addEventListener('click', () => {
        if (indiceActual > 0) { indiceActual--; renderizarCard(); }
    });
    card.querySelector('.browse-next').addEventListener('click', () => {
        if (indiceActual < productos.length - 1) { indiceActual++; renderizarCard(); }
    });
}

// === Búsqueda por código de barras — desactivada temporalmente, puede ser útil en el futuro ===
// document.getElementById('browse-btn-buscar').addEventListener('click', buscarPorCodigo);
// inputCodigo.addEventListener('keydown', e => {
//     if (e.key === 'Enter') buscarPorCodigo();
// });
//
// async function buscarPorCodigo() {
//     const codigo = inputCodigo.value.trim();
//     if (!codigo) {
//         await cargarProductos();
//         renderizarCard();
//         return;
//     }
//     try {
//         const resp = await fetch(`/api/productos/buscar/${encodeURIComponent(codigo)}`);
//         const data = await resp.json();
//         if (data.encontrado) {
//             productos = [data.producto];
//             indiceActual = 0;
//             chipsContainer.querySelectorAll('.browse-chip').forEach(c => c.classList.remove('activo'));
//             renderizarCard();
//         } else {
//             card.innerHTML = `
//                 <div class="browse-vacio">
//                     <i class="ti ti-barcode-off" style="font-size: 3rem; color: var(--color-borde);"></i>
//                     <p>Producto no encontrado</p>
//                     <p class="browse-vacio-sub">${codigo}</p>
//                 </div>`;
//         }
//     } catch (e) {
//         console.error('Error buscando por código:', e);
//     }
// }

// === Swipe táctil ===
let touchStartX = 0;
let touchStartY = 0;

const carrusel = document.getElementById('browse-carrusel');

carrusel.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

carrusel.addEventListener('touchend', e => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    // Solo procesar si el gesto es más horizontal que vertical
    if (Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (Math.abs(deltaX) < 50) return;

    if (deltaX < 0 && indiceActual < productos.length - 1) {
        indiceActual++;
        renderizarCard();
    } else if (deltaX > 0 && indiceActual > 0) {
        indiceActual--;
        renderizarCard();
    }
}, { passive: true });

// === Navegación con teclado ===
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' && indiceActual < productos.length - 1) {
        indiceActual++;
        renderizarCard();
    } else if (e.key === 'ArrowLeft' && indiceActual > 0) {
        indiceActual--;
        renderizarCard();
    }
});

// === Arranque ===
init();

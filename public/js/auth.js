// === Estado de autenticación ===
let autenticado = false;

async function comprobarAuth() {
    try {
        const resp = await fetch('/api/auth/estado');
        const data = await resp.json();
        autenticado = data.autenticado;
    } catch {
        autenticado = false;
    }
    actualizarUIAuth();
}

async function login(password) {
    try {
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await resp.json();
        autenticado = data.ok;
    } catch {
        autenticado = false;
    }
    actualizarUIAuth();
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    autenticado = false;
    actualizarUIAuth();
}

function actualizarUIAuth() {
    const zonaLogin = document.getElementById('auth-login');
    const zonaLogueado = document.getElementById('auth-logueado');

    if (autenticado) {
        zonaLogin.classList.add('oculto');
        zonaLogueado.classList.remove('oculto');
    } else {
        zonaLogin.classList.remove('oculto');
        zonaLogueado.classList.add('oculto');
    }

    // Mostrar/ocultar elementos que requieren auth
    document.querySelectorAll('[data-requiere-auth]').forEach(el => {
        el.classList.toggle('oculto', !autenticado);
    });

    // Disparar evento para que dashboard reaccione
    document.dispatchEvent(new CustomEvent('auth-cambiado', { detail: { autenticado } }));
}

// === Eventos ===
document.getElementById('btn-login').addEventListener('click', () => {
    const input = document.getElementById('auth-password');
    login(input.value);
    input.value = '';
});

document.getElementById('auth-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btn-login').click();
    }
});

document.getElementById('btn-logout').addEventListener('click', logout);

// Comprobar estado al cargar
comprobarAuth();

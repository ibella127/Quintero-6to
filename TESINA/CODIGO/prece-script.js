// ══════════════════════════════════════════
//  KRONO — Preceptoría Script (Versión Final)
// ══════════════════════════════════════════

const PASSWORD_CORRECTA = "tesina"; 

// --- LÓGICA DE AUTENTICACIÓN ---

function verificarPassword() {
    const input = document.getElementById('password-input').value.trim();
    const error = document.getElementById('login-error');

    if (input === PASSWORD_CORRECTA) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('panel-screen').style.display  = 'block';
        error.style.display = 'none';
        sessionStorage.setItem('prece_auth', 'true');
    } else {
        error.style.display = 'block';
        document.getElementById('password-input').value = '';
        document.getElementById('password-input').focus();
    }
}

function togglePw() {
    const campo = document.getElementById('password-input');
    campo.type = campo.type === 'password' ? 'text' : 'password';
}

function cerrarSesion() {
    sessionStorage.removeItem('prece_auth');
    document.getElementById('panel-screen').style.display  = 'none';
    document.getElementById('login-screen').style.display  = 'block';
    document.getElementById('password-input').value = '';
}

// --- PANEL DE CURSOS Y CONEXIÓN A BASE DE DATOS ---

function seleccionarCurso(anio) {
    const display = document.getElementById('display-datos');

    // 1. Mostrar estado de carga inicial
    display.innerHTML = `
        <div class="curso-header">
            <h2 class="curso-titulo">${anio}° Año</h2>
            <span class="curso-badge">Consultando...</span>
        </div>
        <p class="instruccion">Conectando con el servidor Python...</p>
    `;

    // 2. Solo hacemos el fetch si es 1° Año (que es el que tenemos en MySQL)
    if (anio === 1) {
        fetch('http://127.0.0.1:5000/estudiantes-primero')
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
            .then(data => {
                // Construimos la tabla con los datos reales de MySQL
                let tablaHTML = `
                    <div class="curso-header">
                        <h2 class="curso-titulo">${anio}° Año</h2>
                        <span class="curso-badge">Base de Datos Conectada</span>
                    </div>
                    <div class="placeholder-tabla">
                        <div class="placeholder-row header-row">
                            <span>Nombre</span><span>Apellido</span><span>Email</span><span>Acciones</span>
                        </div>`;

                // Recorremos los registros que envió Flask
                data.forEach(estudiante => {
                    tablaHTML += `
                        <div class="placeholder-row">
                            <span>${estudiante.nombre}</span>
                            <span>${estudiante.apellido}</span>
                            <span style="font-size: 0.85rem; color: #666;">${estudiante.gmail}</span>
                            <span><button class="btn-mini">Editar</button></span>
                        </div>`;
                });

                tablaHTML += `</div>
                <p class="db-note">📡 Datos cargados exitosamente desde MySQL vía Flask.</p>`;
                
                display.innerHTML = tablaHTML;
            })
            .catch(error => {
                console.error("Error al obtener datos:", error);
                display.innerHTML = `
                    <div class="curso-header">
                        <h2 class="curso-titulo">${anio}° Año</h2>
                    </div>
                    <p style="color: #ff4d4d; font-weight: bold;">
                        ❌ No se pudo conectar con el servidor de base de datos.
                    </p>
                    <p class="instruccion">Asegúrate de que el archivo app.py esté ejecutándose.</p>
                `;
            });
    } else {
        // Para otros años que aún no tienen tabla en MySQL
        display.innerHTML = `
            <div class="curso-header">
                <h2 class="curso-titulo">${anio}° Año</h2>
            </div>
            <p class="instruccion">Todavía no hay una tabla configurada en MySQL para este curso.</p>
        `;
    }
}

// --- CONFIGURACIÓN INICIAL AL CARGAR LA PÁGINA ---

document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('password-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') verificarPassword(); });

    // Recuperar sesión si ya estaba logueado
    if (sessionStorage.getItem('prece_auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('panel-screen').style.display  = 'block';
    }
});

// --- EFECTO VISUAL SIDEBAR ---

(function () {
    const header   = document.querySelector(".sidebar");
    let ultimoScroll = 0;
    let ticking      = false;

    window.addEventListener("scroll", () => {
        if (!ticking && header) {
            requestAnimationFrame(() => {
                const scrollActual = window.scrollY;
                if (scrollActual <= 10) {
                    header.classList.remove("header-oculto");
                } else if (scrollActual > ultimoScroll + 6) {
                    header.classList.add("header-oculto");
                } else if (scrollActual < ultimoScroll - 6) {
                    header.classList.remove("header-oculto");
                }
                ultimoScroll = scrollActual;
                ticking      = false;
            });
            ticking = true;
        }
    });
})();
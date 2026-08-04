
// ══════════════════════════════════════════════
//  MODO OSCURO — un solo botón, muestra el modo al que vas
// ══════════════════════════════════════════════
(function () {
    if (localStorage.getItem('krono-dark') === '1') {
        document.body && document.body.classList.add('dark-mode');
    }

    function crearToggle() {
        if (document.getElementById('modo-toggle-btn')) return;

        const isDark = localStorage.getItem('krono-dark') === '1';

        const btn = document.createElement('button');
        btn.id        = 'modo-toggle-btn';
        btn.className = 'modo-btn modo-activo';
        btn.setAttribute('aria-label', 'Cambiar modo');
        // Muestra el ícono del modo al que VAS a pasar
        btn.innerHTML = '<img src="' + (isDark ? 'Modo_oscuro.png' : 'Modo_claro.png') + '" alt="cambiar modo">';

        btn.addEventListener('click', () => {
            const ahora = document.body.classList.toggle('dark-mode');
            localStorage.setItem('krono-dark', ahora ? '1' : '0');
            // ahora=true → quedás en oscuro → mostrás luna (para volver a claro)
            // ahora=false → quedás en claro → mostrás sol (para ir a oscuro)
            btn.querySelector('img').src = ahora ? 'Modo_oscuro.png' : 'Modo_claro.png';
        });

        const headerRight = document.getElementById('header-right');
        const sidebar = document.querySelector('.sidebar');
        if (headerRight) headerRight.appendChild(btn);
        else if (sidebar) { btn.style.marginLeft = 'auto'; sidebar.appendChild(btn); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (localStorage.getItem('krono-dark') === '1') document.body.classList.add('dark-mode');
            crearToggle();
        });
    } else {
        if (localStorage.getItem('krono-dark') === '1') document.body.classList.add('dark-mode');
        crearToggle();
    }
})();



// ══════════════════════════════════════════════
//  CURSOR TRAIL — puntos que siguen al mouse
// ══════════════════════════════════════════════
(function () {
    const TOTAL_DOTS = 18, DOT_SIZE = 7, EASE = 0.35;
    const COLORS = ['rgba(75,163,217,0.85)','rgba(26,111,168,0.75)','rgba(168,212,245,0.70)','rgba(75,163,217,0.55)'];
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    const dots = Array.from({ length: TOTAL_DOTS }, (_, i) => {
        const el = document.createElement('div');
        const scale = 1 - i * (0.7 / TOTAL_DOTS), size = DOT_SIZE * scale, color = COLORS[i % COLORS.length];
        Object.assign(el.style, { position:'fixed', width:size+'px', height:size+'px', borderRadius:'50%',
            background:color, pointerEvents:'none', zIndex:'9998', transform:'translate(-50%,-50%)',
            transition:'opacity 0.3s', willChange:'left,top', boxShadow:`0 0 ${size*1.2}px ${color}` });
        document.body.appendChild(el);
        return { el, x: mouse.x, y: mouse.y };
    });
    function animate() {
        dots[0].x += (mouse.x - dots[0].x) * EASE * 2.2;
        dots[0].y += (mouse.y - dots[0].y) * EASE * 2.2;
        for (let i = 1; i < TOTAL_DOTS; i++) {
            dots[i].x += (dots[i-1].x - dots[i].x) * (EASE - i * 0.003);
            dots[i].y += (dots[i-1].y - dots[i].y) * (EASE - i * 0.003);
        }
        dots.forEach(d => { d.el.style.left = d.x+'px'; d.el.style.top = d.y+'px'; });
        requestAnimationFrame(animate);
    }
    animate();
    document.addEventListener('mouseleave', () => dots.forEach(d => d.el.style.opacity = '0'));
    document.addEventListener('mouseenter', () => dots.forEach(d => d.el.style.opacity = '1'));
})();
 
// ══════════════════════════════════════════
//  KRONO — Alumno Script
// ══════════════════════════════════════════
 
const MESES = ['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
 
// Objeto global que se llena con datos reales del backend
let DATOS_ALUMNO = {
    gmail: '',
    nombre: '',
    apellido: '',
    anio: null,
    faltasJustificadas:   [0,0,0,0,0,0,0,0,0,0],
    faltasInjustificadas: [0,0,0,0,0,0,0,0,0,0],
    clasesSubidas: 0
};
 
// email temporal entre paso 1 y paso 2
let emailPendiente = '';
 
// ── PASO 1: solicitar OTP ──────────────────────────────────────
function verificarLogin() {
    const email = document.getElementById('email-input').value.trim().toLowerCase();
    const error = document.getElementById('login-error');
    const btn   = document.querySelector('.btn-login');
 
    if (!email.endsWith('@escuelasproa.edu.ar')) {
        error.textContent = 'Usá tu correo @escuelasproa.edu.ar';
        error.style.display = 'block';
        return;
    }
 
    error.style.display = 'none';
    btn.textContent = 'Enviando código...';
    btn.disabled = true;
 
    fetch('http://127.0.0.1:5000/solicitar-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
        btn.textContent = 'Ingresar';
        btn.disabled = false;
        if (data.error) {
            error.textContent = data.error;
            error.style.display = 'block';
            return;
        }
        emailPendiente = email;
        mostrarPantallaOTP(email);
    })
    .catch(() => {
        btn.textContent = 'Ingresar';
        btn.disabled = false;
        error.textContent = 'No se pudo conectar con el servidor.';
        error.style.display = 'block';
    });
}
 
// ── Pantalla de ingreso de código ─────────────────────────────
function mostrarPantallaOTP(email) {
    document.getElementById('login-screen').innerHTML = `
        <h1 class="section-title-alumno">Revisá tu correo</h1>
        <p class="subtitle-alumno">Enviamos un código de 6 dígitos a<br><strong>${email}</strong></p>
        <div class="login-card">
            <div class="input-icon-wrap">
                <span class="input-icon">🔑</span>
                <input type="text" id="otp-input" placeholder="Ingresá el código"
                       class="login-input" maxlength="6" inputmode="numeric"
                       style="letter-spacing:0.3em;font-size:1.2rem;text-align:center;">
            </div>
            <p id="otp-error" class="login-error" style="display:none;"></p>
            <button class="btn-login" onclick="verificarOTP()">Verificar</button>
            <button onclick="volverLogin()"
                    style="background:none;border:none;color:var(--ink-muted);
                           font-size:0.88rem;cursor:pointer;margin-top:4px;
                           text-decoration:underline;">
                ← Usar otro correo
            </button>
        </div>
        <p style="font-size:0.82rem;color:var(--ink-muted);margin-top:1.2rem;font-style:italic;">
            ⏱ El código expira en 5 minutos
        </p>
    `;
    setTimeout(() => {
        const inp = document.getElementById('otp-input');
        if (inp) {
            inp.focus();
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') verificarOTP(); });
        }
    }, 50);
}
 
// ── PASO 2: verificar OTP ─────────────────────────────────────
function verificarOTP() {
    const codigo = (document.getElementById('otp-input')?.value || '').trim();
    const error  = document.getElementById('otp-error');
    const btn    = document.querySelector('.btn-login');
 
    if (codigo.length !== 6) {
        error.textContent = 'El código tiene 6 dígitos.';
        error.style.display = 'block';
        return;
    }
 
    error.style.display = 'none';
    btn.textContent = 'Verificando...';
    btn.disabled = true;
 
    fetch('http://127.0.0.1:5000/verificar-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailPendiente, codigo })
    })
    .then(res => res.json())
    .then(alumno => {
        btn.textContent = 'Verificar';
        btn.disabled = false;
        if (alumno.error) {
            error.textContent = alumno.error;
            error.style.display = 'block';
            return;
        }
        DATOS_ALUMNO.gmail    = emailPendiente;
        DATOS_ALUMNO.nombre   = alumno.nombre;
        DATOS_ALUMNO.apellido = alumno.apellido;
        DATOS_ALUMNO.anio     = alumno.anio;
 
        sessionStorage.setItem('alumno_email',    emailPendiente);
        sessionStorage.setItem('alumno_nombre',   alumno.nombre);
        sessionStorage.setItem('alumno_apellido', alumno.apellido);
        sessionStorage.setItem('alumno_anio',     alumno.anio);
        sessionStorage.setItem('alumno_id',       alumno.id_alumno || '');
 
        mostrarPanel(alumno.nombre, alumno.apellido, alumno.anio);
    })
    .catch(() => {
        btn.textContent = 'Verificar';
        btn.disabled = false;
        error.textContent = 'Error de conexión. Intentá de nuevo.';
        error.style.display = 'block';
    });
}
 
function volverLogin() {
    emailPendiente = '';
    location.reload();
}
 
function mostrarPanel(nombre, apellido, anio) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('panel-screen').style.display = 'block';
 
    // Iniciales para el avatar
    const iniciales = (nombre[0] || '') + (apellido[0] || '');
    document.getElementById('avatar-circle').textContent        = iniciales.toUpperCase();
    document.getElementById('nombre-display').textContent       = `${nombre} ${apellido}`;
    document.getElementById('bienvenida-texto').textContent     = `¡Hola! Aquí están tus estadísticas 👋`;
 
    // Info card
    document.getElementById('info-curso').textContent    = `${anio}°`;
    document.getElementById('info-division').textContent = '—';   // agregar columna en BD si la tenés
    document.getElementById('info-legajo').textContent   = '—';   // ídem
 
    iniciarEstadisticas();
    cargarMisDocumentos();
    cargarMisAvisos();
    cargarNotificaciones();
    cargarFaltasYTardanzas();
}
 
// ── Avisos del preceptor (avisos de curso + mensajes privados) ──
function cargarMisAvisos() {
    const email = sessionStorage.getItem('alumno_email');
    if (!email) return;

    Promise.all([
        fetch(`http://127.0.0.1:5000/mis-avisos/${encodeURIComponent(email)}`).then(r => r.json()),
        fetch(`http://127.0.0.1:5000/mis-anuncios/${encodeURIComponent(email)}`).then(r => r.json())
    ])
    .then(([avisos, anuncios]) => {
        const section = document.getElementById('avisos-alumno-section');
        const lista   = document.getElementById('avisos-alumno-lista');
        if (!section || !lista) return;

        const items = [
            ...(Array.isArray(avisos)   ? avisos   : []).map(av => ({ ...av, tipo: 'publicacion' })),
            ...(Array.isArray(anuncios) ? anuncios : []).map(an => ({ ...an, tipo: 'privado', motivo: an.mensaje }))
        ].sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));

        if (!items.length) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        lista.innerHTML = items.map(it => `
            <div class="aviso-alumno-item" id="${it.tipo === 'privado' ? 'anuncio' : 'aviso'}-${it.id}">
                <div class="aviso-alumno-info">
                    <span class="aviso-alumno-fecha">
                        ${it.tipo === 'privado' ? '📩' : '📢'} 📅 ${it.fecha} · ⏰ ${it.hora}
                    </span>
                    <p class="aviso-alumno-motivo">${it.motivo}</p>
                </div>
                ${it.tipo === 'privado'
                    ? `<button class="btn-anotado" onclick="marcarAnuncioLeido(${it.id})">✓ Marcar como leído</button>`
                    : `<button class="btn-anotado" onclick="marcarAnotado(${it.id})">✓ Me anoté</button>`
                }
            </div>
        `).join('');
    })
    .catch(err => console.error('Error cargando avisos:', err));
}

function marcarAnuncioLeido(id) {
    fetch(`http://127.0.0.1:5000/anuncios/leido/${id}`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                const el = document.getElementById(`anuncio-${id}`);
                if (el) {
                    el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    el.style.opacity = '0';
                    el.style.transform = 'translateX(20px)';
                    setTimeout(() => {
                        el.remove();
                        const lista = document.getElementById('avisos-alumno-lista');
                        if (lista && !lista.children.length) {
                            document.getElementById('avisos-alumno-section').style.display = 'none';
                        }
                    }, 400);
                } else {
                    cargarMisAvisos(); // se descartó desde la campanita: resincronizar la sección visible
                }
                cargarNotificaciones(); // refrescar campanita también
            }
        })
        .catch(err => console.error('Error al marcar leído:', err));
}

function cargarFaltasYTardanzas() {
    const email = sessionStorage.getItem('alumno_email');
    if (!email) return;

    // Los MESES del grafico van de Mar(2) a Dic(11) => indice = mes - 2
    const OFFSET_MES = 2; // marzo

    const promFaltas = fetch(`http://127.0.0.1:5000/mis-faltas/${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
            if (data.error) return;
            const just   = new Array(10).fill(0);
            const injust = new Array(10).fill(0);
            (data.detalle || []).forEach(f => {
                // T12:00:00 evita desfase UTC en fechas tipo "2025-05-01"
                const mes = new Date(f.fecha + 'T12:00:00').getMonth(); // 0-11
                const idx = mes - OFFSET_MES;
                if (idx >= 0 && idx < 10) {
                    if (f.tipo === 'justificada') just[idx]++;
                    else                          injust[idx]++;
                }
            });
            DATOS_ALUMNO.faltasJustificadas   = just;
            DATOS_ALUMNO.faltasInjustificadas = injust;
        })
        .catch(() => {});

    const promFotos = fetch(`http://127.0.0.1:5000/mis-fotos/${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(fotos => {
            if (Array.isArray(fotos)) DATOS_ALUMNO.clasesSubidas = fotos.length;
        })
        .catch(() => {});

    const promTardanzas = fetch(`http://127.0.0.1:5000/mis-tardanzas/${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
            if (data.error) return;
            const totalEl = document.getElementById('stat-tardanzas');
            if (totalEl) totalEl.textContent = data.total;
        })
        .catch(() => {});

    // Esperar faltas + fotos antes de redibujar toda la UI
    Promise.all([promFaltas, promFotos]).then(() => {
        iniciarEstadisticas();
    });

    // Tardanzas se actualiza sola (no bloquea el render)
    promTardanzas;
}

function marcarAnotado(id) {
    fetch(`http://127.0.0.1:5000/avisos/anotado/${id}`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                const el = document.getElementById(`aviso-${id}`);
                if (el) {
                    el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    el.style.opacity = '0';
                    el.style.transform = 'translateX(20px)';
                    setTimeout(() => {
                        el.remove();
                        // Si no quedan avisos, ocultar la sección
                        const lista = document.getElementById('avisos-alumno-lista');
                        if (lista && !lista.children.length) {
                            document.getElementById('avisos-alumno-section').style.display = 'none';
                        }
                    }, 400);
                } else {
                    cargarMisAvisos(); // se descartó desde la campanita: resincronizar la sección visible
                }
                cargarNotificaciones(); // refrescar campanita también
            }
        })
        .catch(err => console.error('Error al marcar anotado:', err));
}

// ══════════════════════════════════════════════
//  ÍCONO DE NOTIFICACIONES — panel, glow, punto y auto-refresco
//  Combina avisos_tardanza (Publicación) + anuncios_alumno (Mensaje privado)
// ══════════════════════════════════════════════
let ULTIMOS_NOTIF = [];

function getNotifVistas() {
    const email = sessionStorage.getItem('alumno_email');
    if (!email) return [];
    try {
        return JSON.parse(localStorage.getItem(`krono-notif-vistas-${email}`)) || [];
    } catch (e) {
        return [];
    }
}

function guardarNotifVistas(claves) {
    const email = sessionStorage.getItem('alumno_email');
    if (!email) return;
    localStorage.setItem(`krono-notif-vistas-${email}`, JSON.stringify(claves));
}

// ── Trae avisos (Publicación) + anuncios (Mensaje privado) y arma el panel ──
function cargarNotificaciones() {
    const email = sessionStorage.getItem('alumno_email');
    if (!email) return;

    const promAvisos = fetch(`http://127.0.0.1:5000/mis-avisos/${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(avisos => (Array.isArray(avisos) ? avisos : []).map(av => ({
            id:     av.id,
            clave:  `publicacion-${av.id}`,
            tipo:   'publicacion',
            fecha:  av.fecha,
            hora:   av.hora,
            texto:  av.motivo
        })))
        .catch(err => { console.error('Error en /mis-avisos:', err); return []; });

    const promAnuncios = fetch(`http://127.0.0.1:5000/mis-anuncios/${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(anuncios => (Array.isArray(anuncios) ? anuncios : []).map(an => ({
            id:     an.id,
            clave:  `privado-${an.id}`,
            tipo:   'privado',
            fecha:  an.fecha,
            hora:   an.hora,
            texto:  an.mensaje
        })))
        .catch(err => { console.error('Error en /mis-anuncios:', err); return []; });

    Promise.all([promAvisos, promAnuncios]).then(([avisos, anuncios]) => {
        const combinado = [...anuncios, ...avisos].sort((a, b) => {
            const fa = `${a.fecha} ${a.hora}`, fb = `${b.fecha} ${b.hora}`;
            return fb.localeCompare(fa);
        });
        actualizarIconoNotificaciones(combinado);
    });
}

function renderNotifPanel(items) {
    const lista = document.getElementById('notif-panel-lista');
    if (!lista) return;

    if (!items || !items.length) {
        lista.innerHTML = '<p class="notif-panel-vacio">No tenés notificaciones por ahora</p>';
        return;
    }

    const privados     = items.filter(n => n.tipo === 'privado');
    const publicaciones = items.filter(n => n.tipo === 'publicacion');

    const renderItem = n => `
        <div class="notif-panel-item notif-panel-item-${n.tipo}">
            <span class="notif-panel-fecha">📅 ${n.fecha} · ⏰ ${n.hora}</span>
            <p class="notif-panel-motivo">${n.texto}</p>
            <button class="btn-anotado" style="padding:6px 12px; font-size:0.76rem; margin-top:6px;"
                    onclick="${n.tipo === 'privado' ? `marcarAnuncioLeido(${n.id})` : `marcarAnotado(${n.id})`}">
                ✓ Marcar como leído
            </button>
        </div>
    `;

    let html = '';
    if (privados.length) {
        html += `<p class="notif-panel-categoria">📩 Mensaje privado</p>`;
        html += privados.map(renderItem).join('');
    }
    if (publicaciones.length) {
        html += `<p class="notif-panel-categoria">📢 Publicación</p>`;
        html += publicaciones.map(renderItem).join('');
    }
    lista.innerHTML = html;
}

function actualizarIconoNotificaciones(items) {
    ULTIMOS_NOTIF = items || [];

    const btn = document.getElementById('notif-btn');
    renderNotifPanel(ULTIMOS_NOTIF);
    if (!btn) return;

    const panel = document.getElementById('notif-panel');
    const panelAbierto = panel && panel.classList.contains('abierto');

    if (panelAbierto) {
        // El panel está a la vista: lo que llega ahora se considera visto al toque
        marcarNotifComoVistas();
        return;
    }

    const clavesActuales = ULTIMOS_NOTIF.map(n => n.clave);
    const vistas = getNotifVistas();
    const hayNuevas = clavesActuales.some(clave => !vistas.includes(clave));

    btn.classList.toggle('tiene-nuevas', hayNuevas);
}

function marcarNotifComoVistas() {
    const claves = ULTIMOS_NOTIF.map(n => n.clave);
    guardarNotifVistas(claves);
    const btn = document.getElementById('notif-btn');
    if (btn) btn.classList.remove('tiene-nuevas');
}

(function () {
    let intervaloNotif = null;

    function abrirPanel(panel) {
        panel.classList.add('abierto');
        marcarNotifComoVistas();
    }

    function cerrarPanel(panel) {
        panel.classList.remove('abierto');
    }

    function initNotifIcono() {
        const btn   = document.getElementById('notif-btn');
        const panel = document.getElementById('notif-panel');
        if (!btn || !panel) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (panel.classList.contains('abierto')) cerrarPanel(panel);
            else abrirPanel(panel);
        });

        // Cerrar al hacer click afuera
        document.addEventListener('click', (e) => {
            if (panel.classList.contains('abierto') && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                cerrarPanel(panel);
            }
        });

        // Auto-refresco: reconsulta avisos + anuncios periódicamente sin recargar la página.
        if (!intervaloNotif) {
            intervaloNotif = setInterval(() => {
                if (sessionStorage.getItem('alumno_email')) cargarNotificaciones();
            }, 20000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotifIcono);
    } else {
        initNotifIcono();
    }
})();


function cerrarSesion() {
    sessionStorage.clear();
    document.getElementById('panel-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('email-input').value = '';
    if (window._chartFaltas)    { window._chartFaltas.destroy();    window._chartFaltas    = null; }
    if (window._chartBeneficio) { window._chartBeneficio.destroy(); window._chartBeneficio = null; }
}

// ── DOMContentLoaded ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('email-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') verificarLogin(); });

    const tarjInp = document.getElementById('tarjeta-input');
    if (tarjInp) tarjInp.addEventListener('keydown', e => { if (e.key === 'Enter') verificarTarjeta(); });
 
    // Restaurar sesión si ya estaba logueado
    const emailGuardado   = sessionStorage.getItem('alumno_email');
    const nombreGuardado  = sessionStorage.getItem('alumno_nombre');
    const apellidoGuardado= sessionStorage.getItem('alumno_apellido');
    const anioGuardado    = sessionStorage.getItem('alumno_anio');
 
    if (emailGuardado && nombreGuardado) {
        DATOS_ALUMNO.gmail    = emailGuardado;       // ← fix: gmail faltaba
        DATOS_ALUMNO.nombre   = nombreGuardado;
        DATOS_ALUMNO.apellido = apellidoGuardado;
        DATOS_ALUMNO.anio     = parseInt(anioGuardado);
        mostrarPanel(nombreGuardado, apellidoGuardado, anioGuardado);
    }
 
    // Listeners de archivos
    const archivoInput = document.getElementById('motivo-archivo');
    if (archivoInput) archivoInput.addEventListener('change', () => {
        document.getElementById('nombre-archivo').textContent = archivoInput.files[0]?.name || '';
    });
 
    const faltaArchivoInput = document.getElementById('falta-archivo');
    if (faltaArchivoInput) faltaArchivoInput.addEventListener('change', () => {
        document.getElementById('nombre-falta-archivo').textContent = faltaArchivoInput.files[0]?.name || '';
    });

    const fotoInput = document.getElementById('foto-input');
    if (fotoInput) fotoInput.addEventListener('change', () => {
        const file = fotoInput.files[0];
        if (!file) return;
        document.getElementById('nombre-foto').textContent = file.name;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('foto-preview').src = e.target.result;
            document.getElementById('foto-preview-wrap').style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    const docArchivoInput = document.getElementById('doc-archivo');
    if (docArchivoInput) docArchivoInput.addEventListener('change', () => {
        document.getElementById('nombre-doc-archivo').textContent = docArchivoInput.files[0]?.name || '';
    });
});
 
// ══════════════════════════════════════════
//  ESTADÍSTICAS
// ══════════════════════════════════════════

function toggleHistorial() {
    const lista  = document.getElementById('historial-lista');
    const flecha = document.getElementById('historial-flecha');
    if (!lista) return;
    const abrir = lista.classList.contains('historial-lista-cerrada');
    lista.classList.toggle('historial-lista-cerrada', !abrir);
    if (flecha) flecha.classList.toggle('abierta', abrir);
}

function iniciarEstadisticas() {
    const d = DATOS_ALUMNO;
    const totalJust   = d.faltasJustificadas.reduce((a,b)  => a+b, 0);
    const totalInjust = d.faltasInjustificadas.reduce((a,b) => a+b, 0);
    const total       = totalJust + totalInjust;
    const fotos       = d.clasesSubidas;
 
    document.getElementById('stat-total').textContent  = total;
    document.getElementById('stat-injust').textContent = totalInjust;
    document.getElementById('stat-just').textContent   = totalJust;
    document.getElementById('stat-fotos').textContent  = fotos;
 
    // % beneficio: base 100, -10 por injust, +2 por foto
    const pct = Math.min(100, Math.max(0, 100 - totalInjust * 10 + fotos * 2));
    window._kronoPCT = pct; // ← global para la tarjeta
    document.getElementById('pct-numero').textContent = pct + '%';
 
    // Barras de factores
    const maxInjust = 10, maxFotos = 20;
    document.getElementById('barra-injust').style.width = Math.min(100, (totalInjust / maxInjust) * 100) + '%';
    document.getElementById('barra-fotos').style.width  = Math.min(100, (fotos / maxFotos) * 100) + '%';
    document.getElementById('val-injust').textContent = '−' + totalInjust;
    document.getElementById('val-fotos').textContent  = '+' + fotos;
 
    // Historial
    const historial = document.getElementById('historial-lista');
    if (historial) {
        const eventos = [];
        MESES.forEach((mes, i) => {
            if (d.faltasJustificadas[i]   > 0) eventos.push(`<div class="hist-item just-item">✔ ${mes}: ${d.faltasJustificadas[i]} falta(s) justificada(s)</div>`);
            if (d.faltasInjustificadas[i] > 0) eventos.push(`<div class="hist-item injust-item">✘ ${mes}: ${d.faltasInjustificadas[i]} falta(s) injustificada(s)</div>`);
        });
        historial.innerHTML = eventos.length
            ? eventos.join('')
            : '<p class="instruccion">Sin faltas registradas 🎉</p>';

        const badge = document.getElementById('historial-badge');
        if (badge) badge.textContent = eventos.length;
    }
 
    // Chip de estado
    const chip = document.getElementById('estado-chip');
    if (pct >= 80) {
        chip.className = 'beneficio-estado estado-excelente';
        chip.innerHTML = '✦ ¡Excelente! Tenés el máximo beneficio en cantina';
    } else if (pct >= 50) {
        chip.className = 'beneficio-estado estado-bueno';
        chip.innerHTML = '◈ Buen rendimiento — seguí subiendo clases para mejorar';
    } else {
        chip.className = 'beneficio-estado estado-riesgo';
        chip.innerHTML = '⚠ Riesgo de perder el beneficio — justificá tus faltas';
    }
 
    setTimeout(() => {
        dibujarGraficoFaltas(d, totalJust, totalInjust);
        dibujarGraficoBeneficio(pct);
    }, 80);
}
 
function dibujarGraficoFaltas(d, totalJust, totalInjust) {
    if (window._chartFaltas) window._chartFaltas.destroy();
    const ctx = document.getElementById('grafico-faltas');
    if (!ctx) return;

    // Plugin para mostrar la cantidad sobre cada barra (solo si > 0)
    const datalabelsPlugin = {
        id: 'kronoLabels',
        afterDatasetsDraw(chart) {
            const { ctx: c } = chart;
            chart.data.datasets.forEach((dataset, di) => {
                const meta = chart.getDatasetMeta(di);
                if (meta.hidden) return;
                meta.data.forEach((bar, idx) => {
                    const val = dataset.data[idx];
                    if (!val) return;
                    c.save();
                    c.fillStyle = di === 0 ? 'rgba(80,160,170,0.95)' : 'rgba(50,100,150,0.95)';
                    c.font = '600 11px DM Sans, sans-serif';
                    c.textAlign = 'center';
                    c.textBaseline = 'bottom';
                    c.fillText(val, bar.x, bar.y - 3);
                    c.restore();
                });
            });
        }
    };

    window._chartFaltas = new Chart(ctx, {
        type: 'bar',
        plugins: [datalabelsPlugin],
        data: {
            labels: MESES,
            datasets: [
                {
                    label: 'Justificadas',
                    data: d.faltasJustificadas,
                    backgroundColor: 'rgba(176,224,230,0.80)',
                    borderColor: 'rgba(176,224,230,1)',
                    borderWidth: 1.5, borderRadius: 6, borderSkipped: false,
                },
                {
                    label: 'Injustificadas',
                    data: d.faltasInjustificadas,
                    backgroundColor: 'rgba(70,130,180,0.75)',
                    borderColor: 'rgba(70,130,180,1)',
                    borderWidth: 1.5, borderRadius: 6, borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 18 } },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} falta${ctx.parsed.y !== 1 ? 's' : ''}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 12 }, color: '#4a5568' } },
                y: {
                    beginAtZero: true,
                    // Eje Y siempre en 5 como minimo; sube si hay más faltas
                    max: Math.max(5, Math.max(...d.faltasJustificadas, ...d.faltasInjustificadas) + 1),
                    ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 }, color: '#4a5568' },
                    grid: { color: 'rgba(168,212,245,0.2)' }
                }
            }
        }
    });
}
 
function dibujarGraficoBeneficio(pct) {
    if (window._chartBeneficio) window._chartBeneficio.destroy();
    const ctx = document.getElementById('grafico-beneficio');
    if (!ctx) return;
 
    const colorPct = pct >= 80 ? 'rgba(70,130,180,0.90)' : pct >= 50 ? 'rgba(70,130,180,0.85)' : 'rgba(200,80,80,0.85)';
 
    const esCien = pct >= 100;
    window._chartBeneficio = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: esCien ? [100] : [pct, 100 - pct],
                backgroundColor: esCien
                    ? [colorPct]
                    : [colorPct, 'rgba(200,200,200,0.18)'],
                borderWidth: 0,
                borderRadius: esCien ? 0 : [8, 0],
                hoverOffset: 0
            }]
        },
        options: {
            responsive: false, cutout: '72%',
            animation: { animateRotate: true, duration: 900 },
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}
 
// ══════════════════════════════════════════
//  ACCIONES
// ══════════════════════════════════════════
 
function toggleFormTarde() {
    const f = document.getElementById('form-tarde');
    f.style.display = f.style.display === 'none' ? 'flex' : 'none';
}
 
function enviarTarde() {
    const texto   = document.getElementById('motivo-texto').value.trim();
    const archivo = document.getElementById('motivo-archivo').files[0];
    if (!texto) { alert('Por favor escribí el motivo antes de enviar.'); return; }
 
    const btn = document.querySelector('#card-tarde .btn-enviar-accion');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
 
    const fd = new FormData();
    fd.append('gmail',    DATOS_ALUMNO.gmail    || sessionStorage.getItem('alumno_email') || '');
    fd.append('nombre',   DATOS_ALUMNO.nombre   || '');
    fd.append('apellido', DATOS_ALUMNO.apellido || '');
    fd.append('motivo',   texto);
    if (archivo) fd.append('certificado', archivo);
 
    fetch('http://127.0.0.1:5000/motivo-tardanza', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            document.getElementById('tarde-ok').style.display = 'block';
            document.getElementById('motivo-texto').value = '';
            document.getElementById('nombre-archivo').textContent = '';
            document.getElementById('motivo-archivo').value = '';
            btn.disabled = false; btn.textContent = 'Enviar motivo';
            setTimeout(() => {
                document.getElementById('tarde-ok').style.display = 'none';
                document.getElementById('form-tarde').style.display = 'none';
            }, 3000);
        })
        .catch(err => {
            alert('Error al enviar: ' + err.message);
            btn.disabled = false; btn.textContent = 'Enviar motivo';
        });
}
 
function toggleFormFalta() {
    const f = document.getElementById('form-falta');
    f.style.display = f.style.display === 'none' ? 'flex' : 'none';
    // Poner fecha de hoy por defecto
    const fechaInput = document.getElementById('falta-fecha');
    if (fechaInput && !fechaInput.value) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }
}

function enviarFalta() {
    const fecha   = document.getElementById('falta-fecha').value;
    const texto   = document.getElementById('falta-motivo').value.trim();
    const archivo = document.getElementById('falta-archivo').files[0];

    if (!fecha) { alert('Seleccioná la fecha de la falta.'); return; }
    if (!texto) { alert('Por favor escribí el motivo antes de enviar.'); return; }

    const btn = document.querySelector('#card-falta .btn-enviar-accion');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const fd = new FormData();
    fd.append('gmail',  DATOS_ALUMNO.gmail || sessionStorage.getItem('alumno_email') || '');
    fd.append('fecha',  fecha);
    fd.append('motivo', texto);
    if (archivo) fd.append('certificado', archivo);

    fetch('http://127.0.0.1:5000/motivo-falta', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            document.getElementById('falta-ok').style.display = 'block';
            document.getElementById('falta-motivo').value = '';
            document.getElementById('nombre-falta-archivo').textContent = '';
            document.getElementById('falta-archivo').value = '';
            btn.disabled = false; btn.textContent = 'Enviar justificación';
            setTimeout(() => {
                document.getElementById('falta-ok').style.display = 'none';
                document.getElementById('form-falta').style.display = 'none';
            }, 3000);
        })
        .catch(err => {
            alert('Error al enviar: ' + err.message);
            btn.disabled = false; btn.textContent = 'Enviar justificación';
        });
}

function toggleFormFoto() {
    const f = document.getElementById('form-foto');
    f.style.display = f.style.display === 'none' ? 'flex' : 'none';
}
 
function enviarFoto() {
    const fotoFile = document.getElementById('foto-input').files[0];
    const desc     = document.getElementById('foto-desc').value.trim();
    if (!fotoFile) { alert('Elegí una foto primero.'); return; }
 
    const btn = document.querySelector('#card-foto .btn-enviar-accion');
    btn.disabled = true; btn.textContent = 'Enviando...';
 
    const fd = new FormData();
    fd.append('gmail',       DATOS_ALUMNO.gmail    || sessionStorage.getItem('alumno_email') || '');
    fd.append('nombre',      DATOS_ALUMNO.nombre   || '');
    fd.append('apellido',    DATOS_ALUMNO.apellido || '');
    fd.append('descripcion', desc);
    fd.append('foto',        fotoFile);
 
    fetch('http://127.0.0.1:5000/foto-clase', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            DATOS_ALUMNO.clasesSubidas++;
            iniciarEstadisticas();
            cargarMisDocumentos(); // refrescar cartas
            document.getElementById('foto-ok').style.display = 'block';
            document.getElementById('foto-desc').value = '';
            document.getElementById('nombre-foto').textContent = '';
            document.getElementById('foto-preview-wrap').style.display = 'none';
            document.getElementById('foto-input').value = '';
            btn.disabled = false; btn.textContent = 'Enviar foto';
            setTimeout(() => {
                document.getElementById('foto-ok').style.display = 'none';
                document.getElementById('form-foto').style.display = 'none';
            }, 3000);
        })
        .catch(err => {
            alert('Error al enviar: ' + err.message);
            btn.disabled = false; btn.textContent = 'Enviar foto';
        });
}

function toggleFormDoc() {
    const f = document.getElementById('form-doc');
    f.style.display = f.style.display === 'none' ? 'flex' : 'none';
}

function enviarDocumentacion() {
    const archivo = document.getElementById('doc-archivo').files[0];
    const desc    = document.getElementById('doc-desc').value.trim();
    if (!archivo) { alert('Elegí un archivo primero.'); return; }

    const btn = document.querySelector('#card-doc .btn-enviar-accion');
    btn.disabled = true; btn.textContent = 'Enviando...';

    const fd = new FormData();
    fd.append('gmail',       DATOS_ALUMNO.gmail || sessionStorage.getItem('alumno_email') || '');
    fd.append('descripcion', desc);
    fd.append('archivo',     archivo);

    fetch('http://127.0.0.1:5000/documentacion', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            cargarMisDocumentos(); // refrescar cartas
            document.getElementById('doc-ok').style.display = 'block';
            document.getElementById('doc-desc').value = '';
            document.getElementById('nombre-doc-archivo').textContent = '';
            document.getElementById('doc-archivo').value = '';
            btn.disabled = false; btn.textContent = 'Enviar documentación';
            setTimeout(() => {
                document.getElementById('doc-ok').style.display = 'none';
                document.getElementById('form-doc').style.display = 'none';
            }, 3000);
        })
        .catch(err => {
            alert('Error al enviar: ' + err.message);
            btn.disabled = false; btn.textContent = 'Enviar documentación';
        });
}

// ══════════════════════════════════════════
//  MIS FOTOS Y CERTIFICADOS (cartas superpuestas / abanicadas)
// ══════════════════════════════════════════
function cargarMisDocumentos() {
    const email = sessionStorage.getItem('alumno_email');
    if (!email) return;

    Promise.all([
        fetch(`http://127.0.0.1:5000/mis-fotos/${encodeURIComponent(email)}`).then(r => r.json()),
        fetch(`http://127.0.0.1:5000/mis-motivos/${encodeURIComponent(email)}`).then(r => r.json()),
        fetch(`http://127.0.0.1:5000/mis-documentos/${encodeURIComponent(email)}`).then(r => r.json())
    ])
    .then(([fotos, motivos, documentos]) => {
        const section = document.getElementById('cartas-docs-section');
        if (!section) return;

        // Fan de "Fotos de clase"
        const fotosData = (Array.isArray(fotos) ? fotos : []).map(f => ({
            fecha: f.fecha,
            descripcion: f.descripcion || 'Foto de clase',
            url: f.url
        }));

        // Fan de "Certificados" (certificados de motivo + documentación general subida)
        const certData = [];
        (Array.isArray(motivos) ? motivos : []).forEach(m => {
            if (m.certificado) certData.push({
                fecha: m.fecha,
                descripcion: m.motivo || 'Certificado',
                url: `http://127.0.0.1:5000/uploads/certificados/${m.certificado}`
            });
        });
        (Array.isArray(documentos) ? documentos : []).forEach(d => certData.push({
            fecha: d.fecha,
            descripcion: d.descripcion || 'Documento',
            url: d.url
        }));

        // Orden ascendente: la más reciente queda última → arriba de la pila
        fotosData.sort((a, b) => a.fecha.localeCompare(b.fecha));
        certData.sort((a, b) => a.fecha.localeCompare(b.fecha));

        section.style.display = 'block'; // siempre visible; cada columna muestra su propio estado vacío
        renderCartasStack('stack-fotos', fotosData, 'fotos de clase');
        renderCartasStack('stack-certificados', certData, 'certificados');
    })
    .catch(err => console.error('Error al cargar mis documentos:', err));
}

function renderCartasStack(containerId, items, etiquetaVacio) {
    const cont = document.getElementById(containerId);
    if (!cont) return;

    if (!items.length) {
        cont.innerHTML = `<p class="instruccion">Todavía no subiste ${etiquetaVacio}</p>`;
        return;
    }

    const n    = items.length;
    const paso = Math.min(8, 44 / n); // grados entre carta y carta (se achica si hay muchas)

    cont.innerHTML = items.map((it, i) => {
        const angulo = n === 1 ? 0 : (i - (n - 1) / 2) * paso;
        const esImg  = /\.(png|jpg|jpeg|gif|webp)$/i.test(it.url);
        const icono  = esImg ? '' : iconoParaArchivo(it.url);
        return `
            <div class="carta-doc" data-idx="${i}" style="--rot:${angulo.toFixed(1)}deg;" title="${escapeAttr(it.descripcion)}">
                ${esImg ? '' : `<span class="carta-doc-icon">${icono}</span>`}
                <span class="carta-doc-fecha">${it.fecha}</span>
            </div>
        `;
    }).join('');

    // Imagen de fondo y click van por JS (evita líos de escapado en el HTML)
    cont.querySelectorAll('.carta-doc').forEach(el => {
        const it    = items[Number(el.dataset.idx)];
        const esImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(it.url);
        if (esImg) el.style.backgroundImage = `url("${it.url}")`;
        el.addEventListener('click', () => abrirCartaLightbox(it.url, `${it.descripcion} — ${it.fecha}`, esImg));
    });
}

function iconoParaArchivo(url) {
    const ext = (url.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'doc' || ext === 'docx') return '📃';
    if (ext === 'xls' || ext === 'xlsx') return '📊';
    if (ext === 'txt') return '📝';
    return '🗂️';
}

function abrirCartaLightbox(url, caption, esImagen) {
    if (!esImagen) { window.open(url, '_blank'); return; } // pdf/doc/etc → se descarga/abre directo
    document.getElementById('carta-lightbox-img').src = url;
    document.getElementById('carta-lightbox-caption').textContent = caption;
    document.getElementById('carta-lightbox-overlay').style.display = 'flex';
}

function cerrarCartaLightbox() {
    document.getElementById('carta-lightbox-overlay').style.display = 'none';
    document.getElementById('carta-lightbox-img').src = '';
}

function escapeAttr(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


// ── Ocultar sidebar al hacer scroll ───────────────────────────
(function () {
    // 1. Lógica del Scroll
    const header = document.querySelector(".sidebar");
    let ultimoScroll = 0;
    let ticking = false;

    window.addEventListener("scroll", () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollActual = window.scrollY;
                
                if (scrollActual <= 10) {
                    header.classList.remove("header-oculto");
                } else if (scrollActual > ultimoScroll + 6) {
                    header.classList.add("header-oculto");
                } else if (scrollActual < ultimoScroll - 6) {
                    header.classList.remove("header-oculto");
                }
                
                ultimoScroll = scrollActual;
                ticking = false;
            });
            ticking = true;
        }
    }); // <-- Aquí faltaba cerrar el evento de scroll

})(); // Cerramos la IIFE correctament
// ══════════════════════════════════════════
//  LOGIN POR TARJETA RFID
// ══════════════════════════════════════════
function verificarTarjeta() {
    const input   = document.getElementById('tarjeta-input').value.trim();
    const errorEl = document.getElementById('tarjeta-error');
    const btn     = document.querySelector('#tarjeta-input ~ * .btn-login') ||
                    document.querySelectorAll('.login-col')[1]?.querySelector('.btn-login');

    if (!input) {
        errorEl.textContent = 'Ingresá tu nombre o ID de tarjeta.';
        errorEl.style.display = 'block';
        return;
    }

    errorEl.style.display = 'none';
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }

    fetch('http://127.0.0.1:5000/login-tarjeta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: input })
    })
    .then(r => r.json())
    .then(data => {
        if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
        if (data.error) {
            errorEl.textContent = data.error;
            errorEl.style.display = 'block';
            return;
        }
        // Login exitoso por tarjeta — misma lógica que OTP
        DATOS_ALUMNO.gmail    = data.gmail;
        DATOS_ALUMNO.nombre   = data.nombre;
        DATOS_ALUMNO.apellido = data.apellido;
        DATOS_ALUMNO.anio     = data.anio;

        sessionStorage.setItem('alumno_email',    data.gmail);
        sessionStorage.setItem('alumno_nombre',   data.nombre);
        sessionStorage.setItem('alumno_apellido', data.apellido);
        sessionStorage.setItem('alumno_anio',     data.anio);
        sessionStorage.setItem('alumno_id',       data.id_alumno || '');

        document.getElementById('login-screen').style.display = 'none';
        mostrarPanel(data.nombre, data.apellido, data.anio);
    })
    .catch(() => {
        if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
        errorEl.textContent = 'No se pudo conectar con el servidor.';
        errorEl.style.display = 'block';
    });
}

// ══════════════════════════════════════════════
//  TARJETA DE BENEFICIO — modal con QR
// ══════════════════════════════════════════════
function abrirTarjeta() {
    const modal = document.getElementById('tarjeta-modal');
    if (!modal) return;

    // Datos del alumno desde sessionStorage
    const nombre   = sessionStorage.getItem('alumno_nombre')   || '';
    const apellido = sessionStorage.getItem('alumno_apellido') || '';
    const gmail    = sessionStorage.getItem('alumno_email')    || '';
    const pct      = window._kronoPCT !== undefined ? window._kronoPCT : '—';

    // Nombre completo
    document.getElementById('tarjeta-nombre').textContent = `${apellido}, ${nombre}`;

    // Porcentaje
    document.getElementById('tarjeta-pct').textContent = pct + '%';

    // QR — URL de evidencias del alumno (link directo a sus fotos)
    const idAlumno = sessionStorage.getItem('alumno_id') || '';
    const qrData   = `KRONO-${idAlumno}`;
    // QR más grande para mejor lectura por el escáner
    const qrUrl    = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(qrData)}`;
    document.getElementById('tarjeta-qr').src = qrUrl;
    // Guardar URL para la descarga
    window._kronoQRUrl = qrUrl;
    window._kronoQRData = qrData;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('modal-visible'), 10);
}

function cerrarTarjeta(e) {
    const modal = document.getElementById('tarjeta-modal');
    if (!modal) return;
    if (e && e.target !== modal) return; // solo cierra si click en fondo
    modal.classList.remove('modal-visible');
    setTimeout(() => modal.style.display = 'none', 280);
}

// ══════════════════════════════════════════════
//  DESCARGA DEL QR
// ══════════════════════════════════════════════
function descargarQR() {
    const apellido = sessionStorage.getItem('alumno_apellido') || 'alumno';
    const nombre   = sessionStorage.getItem('alumno_nombre')   || '';
    const url      = window._kronoQRUrl;
    if (!url) return;

    // Fetch de la imagen y descarga como archivo
    fetch(url)
        .then(r => r.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href     = URL.createObjectURL(blob);
            link.download = `KRONO-QR-${apellido}-${nombre}.png`.replace(/\s+/g, '_');
            link.click();
            URL.revokeObjectURL(link.href);
        })
        .catch(() => {
            // Fallback: abrir en nueva pestaña si el fetch falla
            window.open(url, '_blank');
        });
}

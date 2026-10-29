// ══════════════════════════════════════════
//  CARTELES LINDOS — reemplazan alert() y confirm()
//  kToast(mensaje, 'ok' | 'error' | 'info')
//  await kConfirm(mensaje, { titulo, confirmar, cancelar, peligro })
// ══════════════════════════════════════════
function kEsc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function kToast(mensaje, tipo = 'info', ms = 4200) {
    let cont = document.getElementById('k-toast-cont');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'k-toast-cont';
        cont.setAttribute('aria-live', 'polite');
        document.body.appendChild(cont);
    }
    const iconos = { ok: '✓', error: '!', info: 'i' };
    const t = document.createElement('div');
    t.className = `k-toast k-toast-${iconos[tipo] ? tipo : 'info'}`;
    t.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    t.innerHTML = `
        <span class="k-toast-ico">${iconos[tipo] || 'i'}</span>
        <span class="k-toast-msg">${kEsc(mensaje)}</span>
        <button type="button" class="k-toast-x" aria-label="Cerrar">✕</button>`;
    let cerrado = false;
    const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        t.classList.remove('visible');
        t.classList.add('saliendo');
        setTimeout(() => t.remove(), 260);
    };
    t.querySelector('.k-toast-x').addEventListener('click', cerrar);
    cont.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('visible')));
    if (ms) setTimeout(cerrar, ms);
}

function kConfirm(mensaje, opciones = {}) {
    const {
        titulo = '¿Estás seguro?',
        confirmar = 'Eliminar',
        cancelar = 'Cancelar',
        peligro = true
    } = opciones;

    return new Promise(resolve => {
        const ov = document.createElement('div');
        ov.className = 'k-confirm-overlay';
        ov.innerHTML = `
            <div class="k-confirm-backdrop"></div>
            <div class="k-confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="k-confirm-titulo">
                <div class="k-confirm-ico ${peligro ? 'peligro' : ''}">${peligro ? '🗑' : '?'}</div>
                <h3 class="k-confirm-titulo" id="k-confirm-titulo">${kEsc(titulo)}</h3>
                <p class="k-confirm-msg">${kEsc(mensaje)}</p>
                <div class="k-confirm-botones">
                    <button type="button" class="k-btn k-btn-sec" data-k="no">${kEsc(cancelar)}</button>
                    <button type="button" class="k-btn ${peligro ? 'k-btn-peligro' : 'k-btn-ok'}" data-k="si">${kEsc(confirmar)}</button>
                </div>
            </div>`;

        const cerrar = (resultado) => {
            document.removeEventListener('keydown', onKey, true);
            ov.classList.remove('visible');
            setTimeout(() => ov.remove(), 200);
            resolve(resultado);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(false); }
        };

        ov.querySelector('[data-k="no"]').addEventListener('click', () => cerrar(false));
        ov.querySelector('[data-k="si"]').addEventListener('click', () => cerrar(true));
        ov.querySelector('.k-confirm-backdrop').addEventListener('click', () => cerrar(false));
        document.addEventListener('keydown', onKey, true);

        document.body.appendChild(ov);
        requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('visible')));
        // Foco en "Cancelar" para que un Enter accidental no borre nada
        ov.querySelector('[data-k="no"]').focus();
    });
}


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
        btn.style.marginLeft = 'auto';
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

        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.appendChild(btn);
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
    // En pantallas táctiles no hay mouse: sin esto los puntos quedan clavados
    // en el centro de la pantalla, encima del contenido.
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const TOTAL_DOTS = 18, DOT_SIZE = 7, EASE = 0.35;
    const COLORS = ['rgba(75,163,217,0.85)','rgba(26,111,168,0.75)','rgba(168,212,245,0.70)','rgba(75,163,217,0.55)'];
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    const dots = Array.from({ length: TOTAL_DOTS }, (_, i) => {
        const el = document.createElement('div');
        const scale = 1 - i * (0.7 / TOTAL_DOTS), size = DOT_SIZE * scale, color = COLORS[i % COLORS.length];
        Object.assign(el.style, {
            position:'fixed', width:size+'px', height:size+'px', borderRadius:'50%',
            background:color, pointerEvents:'none', zIndex:'9998', transform:'translate(-50%,-50%)',
            transition:'opacity 0.3s', willChange:'left,top', boxShadow:`0 0 ${size*1.2}px ${color}`
        });
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
//  KRONO — Preceptoría Script
// ══════════════════════════════════════════
 
// --- AUTENTICACIÓN ---

function verificarDatosPreceptoria() {
    const nombreCompleto = document.getElementById('prece-nombre-input').value.trim();
    const email = document.getElementById('prece-email-input').value.trim().toLowerCase();
    const dni   = document.getElementById('prece-dni-input').value.trim();
    const error = document.getElementById('login-error');
    error.style.display = 'none';

    if (!nombreCompleto || !email || !dni) {
        error.textContent = 'Completá nombre y apellido, correo y DNI.';
        error.style.display = 'block';
        return;
    }

    const partes = nombreCompleto.split(/\s+/);
    const nombre = partes.slice(0, -1).join(' ') || partes[0];
    const apellido = partes.length > 1 ? partes[partes.length - 1] : '';

    fetch('http://127.0.0.1:5000/preceptoria/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre, apellido, dni })
    })
        .then(r => r.json().then(body => ({ status: r.status, body })))
        .then(({ status, body }) => {
            if (status !== 200) {
                error.textContent = body.error || 'No se pudo verificar los datos.';
                error.style.display = 'block';
                return;
            }
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('panel-screen').style.display  = 'block';
            sessionStorage.setItem('prece_auth', 'true');
            sessionStorage.setItem('prece_nombre', `${body.nombre} ${body.apellido}`);
            cambiarPestania('avisos');
            if (window.kronoTutorial) window.kronoTutorial.alIngresar();
        })
        .catch(() => {
            error.textContent = 'Error de conexión con el servidor.';
            error.style.display = 'block';
        });
}

function cerrarSesion() {
    sessionStorage.removeItem('prece_auth');
    sessionStorage.removeItem('prece_nombre');
    document.getElementById('panel-screen').style.display  = 'none';
    document.getElementById('login-screen').style.display  = 'block';
    document.getElementById('prece-nombre-input').value = '';
    document.getElementById('prece-email-input').value  = '';
    document.getElementById('prece-dni-input').value    = '';
}
 
// --- PANEL DE CURSOS ---
 
// Estado del panel "Alumnos": curso elegido, vista activa y datos cargados
let _alCurso   = null;
let _alVista   = 'todos';      // 'todos' | 'sinqr' | 'tarde'
let _alAlumnos = [];
let _alIngreso = null;         // respuesta de /prece/alumnos-ingreso
let _alFecha   = '';

function _alEsc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Fecha de hoy en hora local (toISOString usa UTC y de noche daría "mañana")
function _alHoy() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function seleccionarCurso(anio) {
    const display = document.getElementById('display-datos');
    _alCurso   = anio;
    _alVista   = 'todos';
    _alIngreso = null;
    if (!_alFecha) _alFecha = _alHoy();

    display.innerHTML = `
        <div class="curso-header">
            <h2 class="curso-titulo">${anio}° Año</h2>
            <span class="curso-badge">Consultando...</span>
        </div>
        <p class="instruccion">Conectando con el servidor...</p>
    `;

    fetch(`http://127.0.0.1:5000/alumnos/${anio}`)
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            if (_alCurso !== anio) return;      // el usuario ya cambió de curso
            _alAlumnos = data;

            display.innerHTML = `
                <div class="curso-header">
                    <h2 class="curso-titulo">${anio}° Año</h2>
                    <span class="curso-badge">✓ ${data.length} alumnos</span>
                </div>

                <div class="al-subtabs" role="tablist">
                    <button type="button" id="al-tab-todos" class="al-subtab activo" onclick="alCambiarVista('todos')">
                        👥 Todos <span class="al-subtab-n">${data.length}</span>
                    </button>
                    <button type="button" id="al-tab-sinqr" class="al-subtab al-subtab-falta" onclick="alCambiarVista('sinqr')">
                        🚫 Sin QR <span class="al-subtab-n" id="al-n-sinqr">–</span>
                    </button>
                    <button type="button" id="al-tab-tarde" class="al-subtab al-subtab-tarde" onclick="alCambiarVista('tarde')">
                        ⏰ Llegaron tarde <span class="al-subtab-n" id="al-n-tarde">–</span>
                    </button>
                </div>

                <div class="al-fecha-wrap" id="al-fecha-wrap" style="display:none;">
                    <label for="al-fecha">Fecha</label>
                    <input type="date" id="al-fecha" class="aviso-input" value="${_alFecha}" max="${_alHoy()}" onchange="alCambiarFecha(this.value)">
                    <button type="button" class="btn-mini" onclick="alCambiarFecha(_alHoy())">Hoy</button>
                </div>

                <div id="al-vista" style="width:100%;"></div>
            `;

            alRenderVista();
            alCargarIngresos();   // trae sin QR / tarde para completar los contadores
        })
        .catch(err => {
            console.error('Error al obtener datos:', err);
            display.innerHTML = `
                <div class="curso-header">
                    <h2 class="curso-titulo">${anio}° Año</h2>
                </div>
                <p style="color:#ff4d4d; font-weight:bold; margin-top:1rem;">
                    ❌ No se pudo conectar con el servidor.
                </p>
                <p class="instruccion">Asegurate de que app.py esté corriendo.<br>
                <small style="color:#999;">Detalle: ${_alEsc(err.message)}</small></p>
            `;
        });
}

function alCambiarVista(vista) {
    _alVista = vista;
    ['todos', 'sinqr', 'tarde'].forEach(v => {
        const b = document.getElementById('al-tab-' + v);
        if (b) b.classList.toggle('activo', v === vista);
    });
    const fw = document.getElementById('al-fecha-wrap');
    if (fw) fw.style.display = vista === 'todos' ? 'none' : 'flex';
    alRenderVista();
}

function alCambiarFecha(valor) {
    if (!valor) return;
    _alFecha = valor;
    const inp = document.getElementById('al-fecha');
    if (inp) inp.value = valor;
    alCargarIngresos();
}

function alCargarIngresos() {
    const anio  = _alCurso;
    const fecha = _alFecha || _alHoy();
    _alIngreso = null;
    alActualizarContadores();
    if (_alVista !== 'todos') alRenderVista();   // muestra "Cargando..."

    fetch(`http://127.0.0.1:5000/prece/alumnos-ingreso/${anio}?fecha=${fecha}`)
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            if (_alCurso !== anio || (_alFecha || _alHoy()) !== fecha) return;  // respuesta vieja
            _alIngreso = data;
            alActualizarContadores();
            alRenderVista();
        })
        .catch(err => {
            if (_alCurso !== anio) return;
            _alIngreso = { error: err.message };
            alRenderVista();
        });
}

function alActualizarContadores() {
    const a = document.getElementById('al-n-sinqr');
    const b = document.getElementById('al-n-tarde');
    if (!a || !b) return;
    const ok = _alIngreso && !_alIngreso.error;
    a.textContent = ok ? _alIngreso.sin_qr.length : '–';
    b.textContent = ok ? _alIngreso.tarde.length  : '–';
}

// Arma una tabla con el mismo estilo que la lista de alumnos
function _alTabla(columnas, filas, clase = '') {
    return `
        <div class="placeholder-tabla ${clase}">
            <div class="placeholder-row header-row">
                ${columnas.map(c => `<span>${c}</span>`).join('')}
            </div>
            <div class="tabla-scroll-wrap" id="scroll-wrap">
                ${filas.map(f => `
                    <div class="placeholder-row row-dim">
                        <span>${_alEsc(f.nombre)}</span>
                        <span>${_alEsc(f.apellido)}</span>
                        <span class="email-col">${_alEsc(f.gmail)}</span>
                        ${f.estado}
                    </div>`).join('')}
            </div>
        </div>`;
}

function alRenderVista() {
    const cont = document.getElementById('al-vista');
    if (!cont) return;

    // ── Todos ──
    if (_alVista === 'todos') {
        cont.innerHTML = _alTabla(
            ['Nombre', 'Apellido', 'Email'],
            _alAlumnos.map(a => ({ ...a, estado: '' })),
            'al-tabla-3'
        );
        return;
    }

    // ── Sin QR / Tarde: dependen de la fecha elegida ──
    if (!_alIngreso) { cont.innerHTML = '<p class="instruccion">Cargando...</p>'; return; }
    if (_alIngreso.error) {
        cont.innerHTML = `<p style="color:#ff4d4d;">❌ Error: ${_alEsc(_alIngreso.error)}</p>`;
        return;
    }

    const d = _alIngreso;
    const aviso = d.aviso ? `<p class="al-aviso">ℹ️ ${_alEsc(d.aviso)}</p>` : '';
    const noHabil = /fin de semana|feriado|todavía no llegó/i.test(d.aviso || '');
    if (noHabil) { cont.innerHTML = aviso; return; }

    const resumen = `
        <div class="ingresos-resumen">
            <span class="ingreso-chip ingreso-ok">✅ A tiempo: ${d.a_tiempo}</span>
            <span class="ingreso-chip ingreso-tarde">⚠️ Tarde: ${d.tarde.length}</span>
            <span class="ingreso-chip al-chip-falta">🚫 Sin QR: ${d.sin_qr.length}</span>
            <span class="ingreso-chip">Total: ${d.total}</span>
        </div>`;

    if (_alVista === 'sinqr') {
        cont.innerHTML = aviso + resumen + (d.sin_qr.length
            ? _alTabla(['Nombre', 'Apellido', 'Email', 'Estado'],
                d.sin_qr.map(a => ({ ...a, estado: '<span class="al-estado al-estado-falta">Sin QR</span>' })))
            : '<p class="instruccion">🎉 Todos los alumnos registraron su QR en esa fecha.</p>');
    } else {
        cont.innerHTML = aviso + resumen + (d.tarde.length
            ? _alTabla(['Nombre', 'Apellido', 'Email', 'Ingresó'],
                d.tarde.map(a => ({ ...a, estado: `<span class="al-estado al-estado-tarde">${_alEsc(a.hora)}</span>` })))
            : '<p class="instruccion">Nadie llegó tarde en esa fecha.</p>');
    }
}

// ══════════════════════════════════════════
//  PESTAÑA DE MOTIVOS — dividido por curso
// ══════════════════════════════════════════
function cargarMotivos() {
    const contenedor = document.getElementById('motivos-contenedor');
    if (!contenedor) return;

    const btnsMot = [1,2,3,4,5,6].map(n =>
        '<button class="btn-curso-mini" onclick="cargarMotivosCurso(' + n + ', this)">' + n + '° Año</button>'
    ).join('');
    contenedor.innerHTML =
        '<div class="selector-cursos-mini" id="selector-motivos">' + btnsMot + '</div>' +
        '<div class="motivos-resultado" id="motivos-resultado">' +
        '<p class="instruccion">Seleccioná un curso para ver los motivos</p></div>';
}

function cargarMotivosCurso(anio, btn) {
    // Marcar botón activo
    document.querySelectorAll('#selector-motivos .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');

    const resultado = document.getElementById('motivos-resultado');
    resultado.innerHTML = '<p class="instruccion" style="padding:0.5rem;">Cargando...</p>';

    fetch(`http://127.0.0.1:5000/prece/motivos?anio=${anio}`)
        .then(r => r.json())
        .then(alumnos => {
            if (!alumnos.length) {
                resultado.innerHTML = `<p class="instruccion">No hay motivos registrados en ${anio}° año.</p>`;
                return;
            }
            resultado.innerHTML = alumnos.map(a => `
                <div class="motivo-alumno-bloque">
                    <button class="motivo-alumno-header" onclick="toggleMotivos(this)">
                        <span class="motivo-nombre">${a.apellido}, ${a.nombre}</span>
                        <span class="motivo-badge">${a.motivos.length} registro${a.motivos.length !== 1 ? 's' : ''}</span>
                        <span class="motivo-chevron">▾</span>
                    </button>
                    <div class="motivo-alumno-body" style="display:none;">
                        ${a.motivos.map(m => `
                            <div class="motivo-item" id="motivo-item-${m.id}">
                                <div class="motivo-item-top">
                                    <span class="motivo-fecha">📅 ${m.fecha}</span>
                                    ${m.certificado
                                        ? `<a class="btn-cert" href="http://127.0.0.1:5000/uploads/certificados/${m.certificado}" target="_blank">📎 Ver certificado</a>`
                                        : '<span class="sin-cert">Sin certificado</span>'}
                                </div>
                                <p class="motivo-texto">${m.motivo}</p>
                                <button class="btn-eliminar-foto" onclick="eliminarMotivo(${m.id}, this)">🗑 Eliminar</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        })
        .catch(err => {
            resultado.innerHTML = `<p style="color:#ff4d4d;">❌ Error: ${err.message}</p>`;
        });
}

function toggleMotivos(btn) {
    const body = btn.nextElementSibling;
    const chevron = btn.querySelector('.motivo-chevron');
    const abierto = body.style.display !== 'none';
    body.style.display = abierto ? 'none' : 'block';
    chevron.textContent = abierto ? '▾' : '▴';
}

async function eliminarMotivo(id, btn) {
    if (!(await kConfirm('Este motivo se borra de la base de datos y no se puede recuperar.', { titulo: '¿Eliminar este motivo?' }))) return;
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    fetch(`http://127.0.0.1:5000/prece/eliminar-motivo/${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                const item = document.getElementById(`motivo-item-${id}`);
                if (item) {
                    item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        const bloque = item.closest('.motivo-alumno-bloque');
                        item.remove();
                        // Si era el último motivo de ese alumno, sacamos toda su tarjeta
                        if (bloque && !bloque.querySelectorAll('.motivo-item').length) {
                            bloque.remove();
                        } else if (bloque) {
                            const badge = bloque.querySelector('.motivo-badge');
                            if (badge) {
                                const restantes = bloque.querySelectorAll('.motivo-item').length;
                                badge.textContent = `${restantes} registro${restantes !== 1 ? 's' : ''}`;
                            }
                        }
                    }, 300);
                }
            } else {
                if (btn) { btn.disabled = false; btn.textContent = '🗑 Eliminar'; }
                kToast('No se pudo eliminar: ' + (data.error || 'error desconocido'), 'error');
            }
        })
        .catch(() => {
            if (btn) { btn.disabled = false; btn.textContent = '🗑 Eliminar'; }
            kToast('No se pudo eliminar. Revisá la conexión con el servidor.', 'error');
        });
}

// ══════════════════════════════════════════
//  PESTAÑA DE EVIDENCIAS — historial de avisos y peticiones de documentación
// ══════════════════════════════════════════
const EV_API = 'http://127.0.0.1:5000';
const _ev = {
    avisos:     { datos: [], anio: null, mes: null, cargando: false, error: '' },
    peticiones: { datos: [], anio: null, mes: null, cargando: false, error: '' }
};

function evEsc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, ch =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function evFecha(iso) {
    if (!iso) return '—';
    const p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function evFechaHora(txt) {
    if (!txt) return '';
    const [f, hms] = String(txt).split(' ');
    return `${evFecha(f)}${hms ? ' ' + hms.slice(0, 5) : ''}`;
}

function iniciarPanelEvidencias() {
    evCambiarSubtab(_evSubtabActual || 'avisos');
    evCargar('avisos');
    evCargar('peticiones');
}

let _evSubtabActual = 'avisos';
function evCambiarSubtab(tipo) {
    _evSubtabActual = tipo;
    ['avisos', 'peticiones'].forEach(t => {
        const sec = document.getElementById(`ev-sec-${t}`);
        const btn = document.getElementById(`ev-subtab-${t}`);
        if (sec) sec.style.display = t === tipo ? '' : 'none';
        if (btn) btn.classList.toggle('activo', t === tipo);
    });
}

function evUrl(tipo) {
    return tipo === 'avisos' ? `${EV_API}/prece/historial-avisos` : `${EV_API}/prece/peticiones`;
}

// Recarga desde el servidor. Con `reiniciar` se vuelve a elegir solo el año/mes más reciente.
function evCargar(tipo, reiniciar) {
    const e = _ev[tipo];
    const mio = (e.seq = (e.seq || 0) + 1);   // solo la última consulta pisa la pantalla
    if (reiniciar) { e.anio = null; e.mes = null; }
    e.cargando = true; e.error = '';
    evRender(tipo);
    return fetch(evUrl(tipo))
        .then(r => r.json())
        .then(datos => {
            if (mio !== e.seq) return;
            if (!Array.isArray(datos)) throw new Error(datos.error || 'Respuesta inesperada');
            datos.forEach((d, i) => { d._i = i; });
            e.datos = datos;
        })
        .catch(err => { if (mio !== e.seq) return; e.datos = []; e.error = err.message || 'Error de conexión'; })
        .finally(() => { if (mio !== e.seq) return; e.cargando = false; evRender(tipo); });
}

// ── Año → mes → día ───────────────────────
const _EV_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Meses (YYYY-MM) con registros del año elegido, del más nuevo al más viejo
function evMeses(tipo) {
    const e = _ev[tipo];
    const set = new Set(e.datos.filter(d => d.anio === e.anio).map(d => String(d.fecha).slice(0, 7)));
    return [...set].sort((a, b) => b.localeCompare(a));
}

// Si todavía no hay año elegido toma el del registro más reciente; y deja siempre un mes válido
function evAjustarSeleccion(tipo) {
    const e = _ev[tipo];
    if (!e.datos.length) return;
    if (!e.anio) {
        const ultimo = e.datos.reduce((a, b) => (`${a.fecha} ${a.hora}` >= `${b.fecha} ${b.hora}` ? a : b));
        e.anio = ultimo.anio;
        e.mes  = String(ultimo.fecha).slice(0, 7);
    }
    const meses = evMeses(tipo);
    if (!meses.includes(e.mes)) e.mes = meses[0] || null;
}

function evElegirAnio(tipo, anio) {
    const e = _ev[tipo];
    e.anio = anio;
    e.mes  = null;      // evAjustarSeleccion elige el mes más reciente de ese año
    evRender(tipo);
}
function evElegirMes(tipo, mes) {
    _ev[tipo].mes = mes;
    evRender(tipo);
}

function evEtiquetaDia(fecha) {
    const [y, m, d] = fecha.split('-').map(Number);
    return `${_EV_DIAS[new Date(y, m - 1, d).getDay()]} ${d} de ${NOMBRES_MESES[m].toLowerCase()}`;
}
const evPlural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function evTarjetaAviso(a) {
    return `
        <div class="aviso-card-item aviso-card-pendiente">
            <span class="aci-nombre">⏰ ${evEsc(a.hora)} · Aviso a todo el curso</span>
            <span class="aci-motivo" title="${evEsc(a.motivo)}">📝 ${evEsc(a.motivo)}</span>
            <div class="aci-footer">
                <span class="aci-estado">👥 ${evPlural(a.total || 0, 'alumno', 'alumnos')}</span>
                <div class="aci-footer-btns">
                    <button type="button" class="ev-icono" title="Ver detalle" onclick="evVerAviso(${a._i})">👁</button>
                </div>
            </div>
        </div>`;
}

function evTarjetaPeticion(p) {
    const ok = p.estado === 'entregado';
    return `
        <div class="aviso-card-item ${ok ? 'aviso-card-anotado' : 'aviso-card-pendiente'}">
            <span class="aci-nombre">👤 ${evEsc(p.apellido)}, ${evEsc(p.nombre)}</span>
            <span class="aci-hora">⏰ ${evEsc(p.hora)}</span>
            <span class="aci-motivo" title="${evEsc(p.documento)}">📄 ${evEsc(p.documento)}</span>
            <div class="aci-footer">
                <span class="aci-estado">${ok ? '✅ Entregado' : '⏳ Pendiente'}</span>
                <div class="aci-footer-btns">
                    <button type="button" class="ev-icono" title="Ver detalle" onclick="evVerPeticion(${p.id})">👁</button>
                    <button type="button" class="ev-icono" title="Más acciones" onclick="evMenuPeticion(event, ${p.id}, '${p.estado}')">⋮</button>
                </div>
            </div>
        </div>`;
}

function evBloqueDia(tipo, fecha, items) {
    const etiqueta = evEtiquetaDia(fecha);
    const unidad   = tipo === 'avisos' ? ['aviso', 'avisos'] : ['petición', 'peticiones'];
    // Los avisos son evidencia: se conservan. Solo las peticiones se pueden borrar por día.
    const borrar = tipo === 'peticiones'
        ? `<button type="button" class="btn-eliminar-fecha" title="Eliminar las peticiones de este día" onclick="evEliminarPeticionesDia('${fecha}')">🗑</button>`
        : '';

    let cuerpo;
    if (tipo === 'avisos') {
        const orden = [...items].sort((a, b) => b.hora.localeCompare(a.hora));
        cuerpo = `<div class="avisos-dos-columnas">${orden.map(evTarjetaAviso).join('')}</div>`;
    } else {
        const orden = [...items].sort((a, b) => b.hora.localeCompare(a.hora) || b.id - a.id);
        const pend = orden.filter(p => p.estado !== 'entregado');
        const entr = orden.filter(p => p.estado === 'entregado');
        cuerpo = `
            <div class="avisos-dos-columnas">
                <div class="avisos-col">
                    <h4 class="avisos-col-titulo avisos-col-titulo--pendiente">⏳ Pendientes <span class="avisos-col-badge">${pend.length}</span></h4>
                    ${pend.length ? pend.map(evTarjetaPeticion).join('') : '<p class="avisos-col-vacio">Sin peticiones pendientes</p>'}
                </div>
                <div class="avisos-col">
                    <h4 class="avisos-col-titulo avisos-col-titulo--anotado">✅ Entregadas por el alumno <span class="avisos-col-badge">${entr.length}</span></h4>
                    ${entr.length ? entr.map(evTarjetaPeticion).join('') : '<p class="avisos-col-vacio">Sin peticiones entregadas</p>'}
                </div>
            </div>`;
    }

    return `
        <div class="avisos-fecha-bloque">
            <div class="avisos-fecha-separador">
                <span class="avisos-fecha-label">📅 ${etiqueta}</span>
                <span class="avisos-fecha-badge">${evPlural(items.length, unidad[0], unidad[1])}</span>
                ${borrar}
            </div>
            ${cuerpo}
        </div>`;
}

function evRender(tipo) {
    const cont = document.getElementById(`ev-tabla-${tipo}`);
    if (!cont) return;
    const e = _ev[tipo];
    const nombre = tipo === 'avisos' ? 'avisos de ingreso tarde' : 'peticiones de documentación';
    const unidad = tipo === 'avisos' ? ['aviso', 'avisos'] : ['petición', 'peticiones'];

    if (e.cargando && !e.datos.length) { cont.innerHTML = '<p class="instruccion">Cargando...</p>'; return; }
    if (e.error) { cont.innerHTML = `<p class="ev-error">❌ ${evEsc(e.error)}</p>`; return; }
    if (!e.datos.length) {
        cont.innerHTML = `<div class="ev-vacio"><p class="instruccion">Todavía no hay ${nombre}.</p></div>`;
        return;
    }

    evAjustarSeleccion(tipo);

    const botonesAnio = [1, 2, 3, 4, 5, 6].map(n =>
        `<button type="button" class="btn-curso-mini ${n === e.anio ? 'activo' : ''}" onclick="evElegirAnio('${tipo}',${n})">${n}° Año</button>`
    ).join('');

    const delAnio = e.datos.filter(d => d.anio === e.anio);
    let panel;
    if (!delAnio.length) {
        panel = `<p class="instruccion">No hay ${nombre} en ${e.anio}° año.</p>`;
    } else {
        const meses = evMeses(tipo);
        const botonesMes = meses.map(m => {
            const [y, mm] = m.split('-').map(Number);
            return `<button type="button" class="btn-curso-mini ${m === e.mes ? 'activo' : ''}" onclick="evElegirMes('${tipo}','${m}')">${NOMBRES_MESES[mm]} ${y}</button>`;
        }).join('');

        const delMes = delAnio.filter(d => String(d.fecha).startsWith(e.mes));
        const porFecha = {};
        delMes.forEach(d => { (porFecha[d.fecha] = porFecha[d.fecha] || []).push(d); });
        const fechas = Object.keys(porFecha).sort((a, b) => b.localeCompare(a));

        const [y, mm] = e.mes.split('-').map(Number);
        panel = `
            <div class="selector-cursos-mini ev-selector-meses">${botonesMes}</div>
            <div class="avisos-mes-header">
                <h4 class="avisos-mes-titulo">📅 ${NOMBRES_MESES[mm]} ${y} — ${e.anio}° Año</h4>
                <span class="avisos-fecha-badge" style="margin-left:0;">${evPlural(delMes.length, unidad[0], unidad[1])}</span>
            </div>
            ${fechas.map(f => evBloqueDia(tipo, f, porFecha[f])).join('')}`;
    }

    cont.innerHTML = `
        <div class="selector-cursos-mini">${botonesAnio}</div>
        <div class="ev-panel-mes">${panel}</div>`;
}

// Borra todas las peticiones de un día del año/curso que se está viendo
async function evEliminarPeticionesDia(fecha) {
    const e = _ev.peticiones;
    const ids = e.datos.filter(p => p.anio === e.anio && p.fecha === fecha).map(p => p.id);
    if (!ids.length) return;
    const etiqueta = evEtiquetaDia(fecha);
    if (!(await kConfirm(`Se borran las ${ids.length} petición(es) de ${e.anio}° Año del ${etiqueta}. Esta acción no se puede deshacer.`,
                         { titulo: '¿Eliminar las peticiones de este día?' }))) return;
    try {
        const resp = await Promise.all(ids.map(id =>
            fetch(`${EV_API}/prece/peticiones/${id}`, { method: 'DELETE' }).then(r => r.json())));
        const falla = resp.find(r => r.error);
        if (falla) throw new Error(falla.error);
    } catch (err) {
        kToast('No se pudieron eliminar todas: ' + err.message, 'error');
    }
    evCargar('peticiones');
}

// ── Modal ─────────────────────────────────
function evAbrirModal(html) {
    document.getElementById('ev-modal-contenido').innerHTML = html;
    document.getElementById('ev-modal-overlay').style.display = 'flex';
}
function evCerrarModal() {
    const o = document.getElementById('ev-modal-overlay');
    if (o) o.style.display = 'none';
}
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { evCerrarModal(); evCerrarMenu(); }
});

function evFila(label, valor) {
    return `<div class="ev-det-fila"><span class="ev-det-label">${label}</span><span class="ev-det-valor">${valor}</span></div>`;
}

// ── Detalle de un aviso ───────────────────
function evVerAviso(i) {
    const a = _ev.avisos.datos.find(x => x._i === i);
    if (!a) return;
    evAbrirModal('<p class="instruccion">Cargando...</p>');

    const q = a.id
        ? new URLSearchParams({ id: a.id })
        : new URLSearchParams({ anio: a.anio, fecha: a.fecha, hora: a.hora, motivo: a.motivo });

    fetch(`${EV_API}/prece/historial-avisos/detalle?${q}`)
        .then(r => r.json())
        .then(d => {
            if (d.error) throw new Error(d.error);
            const alumnos = d.alumnos.length
                ? `<div class="ev-chips">${d.alumnos.map(al =>
                      `<span class="ev-chip ${al.anotado ? 'ev-chip-ok' : ''}" title="${al.anotado ? 'Aviso anotado' : 'Aviso sin anotar'}">${evEsc(al.apellido)}, ${evEsc(al.nombre)}${al.anotado ? ' ✓' : ''}</span>`).join('')}</div>`
                : '<p class="ev-nota">Los avisos individuales de este envío ya se eliminaron de «Avisos registrados». El envío se conserva en el historial.</p>';
            evAbrirModal(`
                <h3 class="ev-modal-titulo">🔔 Aviso de ingreso tarde</h3>
                ${evFila('Fecha', evFecha(d.fecha))}
                ${evFila('Hora', evEsc(d.hora))}
                ${evFila('Enviado a', `${d.anio}° año completo (${d.total} alumno${d.total !== 1 ? 's' : ''})`)}
                ${d.enviado_en ? evFila('Registrado', evFechaHora(d.enviado_en)) : ''}
                <div class="ev-det-bloque"><span class="ev-det-label">Motivo del ingreso posterior</span><p class="ev-det-msg">${evEsc(d.motivo)}</p></div>
                <div class="ev-det-bloque"><span class="ev-det-label">Alumnos relacionados</span>${alumnos}</div>`);
        })
        .catch(err => evAbrirModal(`<p class="ev-error">❌ ${evEsc(err.message)}</p>`));
}

// ── Detalle de una petición ───────────────
function evVerPeticion(id) {
    evCerrarMenu();
    evAbrirModal('<p class="instruccion">Cargando...</p>');
    fetch(`${EV_API}/prece/peticiones/${id}`)
        .then(r => r.json())
        .then(d => {
            if (d.error) throw new Error(d.error);
            const entregado = d.estado === 'entregado';
            let archivo = '';
            if (entregado) {
                archivo = d.archivo
                    ? `<div class="ev-det-bloque"><span class="ev-det-label">Archivo presentado</span>
                           <a class="ev-link-archivo" href="${evEsc(d.archivo.url)}" target="_blank" rel="noopener">📎 ${evEsc(d.archivo.descripcion || d.archivo.nombre)}</a>
                           <p class="ev-nota">Subido el ${evFecha(d.archivo.fecha)}</p></div>`
                    : `<div class="ev-det-bloque"><p class="ev-nota">Marcada como entregada sin archivo adjunto en Krono (por ejemplo, entregada en papel).</p></div>`;
            }
            evAbrirModal(`
                <h3 class="ev-modal-titulo">📄 Petición de documentación</h3>
                ${evFila('Alumno', `${evEsc(d.apellido)}, ${evEsc(d.nombre)} · ${d.anio}° año`)}
                ${evFila('Pedida el', `${evFecha(d.fecha)} ${evEsc(d.hora)}`)}
                ${evFila('Documento solicitado', evEsc(d.documento))}
                ${evFila('Estado', `<span class="ev-badge ev-badge-${entregado ? 'ok' : 'pend'}">${entregado ? 'Entregado' : 'Pendiente'}</span>${entregado && d.entregado_en ? ` <span class="ev-nota">el ${evFechaHora(d.entregado_en)}</span>` : ''}`)}
                ${d.mensaje ? `<div class="ev-det-bloque"><span class="ev-det-label">Mensaje</span><p class="ev-det-msg">${evEsc(d.mensaje)}</p></div>` : ''}
                ${archivo}
                <div class="ev-modal-botones">
                    <button type="button" class="ev-btn-sec" onclick="evCambiarEstado(${d.id}, '${entregado ? 'pendiente' : 'entregado'}')">${entregado ? 'Marcar como pendiente' : 'Marcar como entregado'}</button>
                    <button type="button" class="ev-btn-peligro" onclick="evEliminarPeticion(${d.id})">🗑 Eliminar</button>
                </div>`);
        })
        .catch(err => evAbrirModal(`<p class="ev-error">❌ ${evEsc(err.message)}</p>`));
}

// ── Menú ⋮ ────────────────────────────────
function evCerrarMenu() {
    const m = document.getElementById('ev-menu');
    if (m) m.remove();
}
function evMenuPeticion(ev, id, estado) {
    ev.stopPropagation();
    const existente = document.getElementById('ev-menu');
    const mismo = existente && existente.dataset.id === String(id);
    evCerrarMenu();
    if (mismo) return;

    const m = document.createElement('div');
    m.id = 'ev-menu';
    m.className = 'ev-menu';
    m.dataset.id = id;
    m.innerHTML = `
        <button type="button" onclick="evVerPeticion(${id})">👁 Ver detalle</button>
        <button type="button" onclick="evCambiarEstado(${id}, '${estado === 'entregado' ? 'pendiente' : 'entregado'}')">${estado === 'entregado' ? '⏳ Marcar como pendiente' : '✅ Marcar como entregado'}</button>
        <button type="button" class="ev-menu-peligro" onclick="evEliminarPeticion(${id})">🗑 Eliminar petición</button>`;
    document.body.appendChild(m);

    const r = ev.currentTarget.getBoundingClientRect();
    const ancho = m.offsetWidth;
    m.style.top  = `${Math.min(window.innerHeight - m.offsetHeight - 8, r.bottom + 6)}px`;
    m.style.left = `${Math.max(8, Math.min(window.innerWidth - ancho - 8, r.right - ancho))}px`;
}
document.addEventListener('click', e => {
    if (!e.target.closest('#ev-menu')) evCerrarMenu();
});
window.addEventListener('scroll', evCerrarMenu, true);

// ── Acciones sobre peticiones ─────────────
function evCambiarEstado(id, estado) {
    evCerrarMenu();
    fetch(`${EV_API}/prece/peticiones/${id}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
    })
    .then(r => r.json())
    .then(d => {
        if (d.error) throw new Error(d.error);
        evCerrarModal();
        evCargar('peticiones');
    })
    .catch(err => kToast('No se pudo cambiar el estado: ' + err.message, 'error'));
}

async function evEliminarPeticion(id) {
    evCerrarMenu();
    if (!(await kConfirm('La petición se borra del historial y no se puede recuperar.', { titulo: '¿Eliminar esta petición?' }))) return;
    fetch(`${EV_API}/prece/peticiones/${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(d => {
            if (d.error) throw new Error(d.error);
            evCerrarModal();
            evCargar('peticiones');
        })
        .catch(err => kToast('No se pudo eliminar: ' + err.message, 'error'));
}

// ── Nueva petición ────────────────────────
function evNuevaPeticion() {
    evAbrirModal(`
        <h3 class="ev-modal-titulo">📄 Nueva petición de documentación</h3>
        <p class="ev-nota" style="margin-bottom:0.8rem;">Se la pedís a un alumno específico y le llega como anuncio.</p>
        <div class="ev-form">
            <label class="ev-field"><span>Curso</span>
                <select id="ev-np-curso" class="aviso-select" onchange="evNpCargarAlumnos()">
                    <option value="">— Seleccioná un curso —</option>
                    ${[1,2,3,4,5,6].map(n => `<option value="${n}">${n}° año</option>`).join('')}
                </select>
            </label>
            <label class="ev-field"><span>Alumno</span>
                <select id="ev-np-alumno" class="aviso-select" disabled><option value="">— Primero elegí el curso —</option></select>
            </label>
            <label class="ev-field"><span>Documento solicitado</span>
                <input type="text" id="ev-np-doc" class="aviso-input" maxlength="300" placeholder="Ej: Certificado de alumno regular">
            </label>
            <label class="ev-field"><span>Mensaje (opcional)</span>
                <textarea id="ev-np-msg" class="aviso-textarea" placeholder="Ej: Lo necesitamos antes del viernes."></textarea>
            </label>
            <p id="ev-np-error" class="ev-error" style="display:none;"></p>
        </div>
        <div class="ev-modal-botones">
            <button type="button" class="ev-btn-sec" onclick="evCerrarModal()">Cancelar</button>
            <button type="button" id="ev-np-enviar" class="ev-btn-nuevo" onclick="evEnviarPeticion()">Enviar petición</button>
        </div>`);
}

function evNpCargarAlumnos() {
    const curso  = document.getElementById('ev-np-curso').value;
    const select = document.getElementById('ev-np-alumno');
    if (!curso) { select.disabled = true; select.innerHTML = '<option value="">— Primero elegí el curso —</option>'; return; }
    select.disabled = true;
    select.innerHTML = '<option value="">Cargando...</option>';
    fetch(`${EV_API}/alumnos-lista/${curso}`)
        .then(r => r.json())
        .then(alumnos => {
            select.innerHTML = '<option value="">— Seleccioná un alumno —</option>' +
                alumnos.map(a => `<option value="${a.id_alumno}">${evEsc(a.apellido)}, ${evEsc(a.nombre)}</option>`).join('');
            select.disabled = false;
        })
        .catch(() => { select.innerHTML = '<option value="">Error al cargar</option>'; });
}

function evEnviarPeticion() {
    const id_alumno = document.getElementById('ev-np-alumno').value;
    const documento = document.getElementById('ev-np-doc').value.trim();
    const mensaje   = document.getElementById('ev-np-msg').value.trim();
    const err = document.getElementById('ev-np-error');
    err.style.display = 'none';
    if (!id_alumno) { err.textContent = 'Elegí un alumno.'; err.style.display = 'block'; return; }
    if (!documento) { err.textContent = 'Escribí qué documento se solicita.'; err.style.display = 'block'; return; }

    const btn = document.getElementById('ev-np-enviar');
    btn.disabled = true; btn.textContent = 'Enviando...';
    fetch(`${EV_API}/prece/peticiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_alumno: parseInt(id_alumno, 10), documento, mensaje })
    })
    .then(r => r.json())
    .then(d => {
        if (d.error) throw new Error(d.error);
        evCerrarModal();
        evCambiarSubtab('peticiones');
        evCargar('peticiones', true);   // vuelve al año/mes más reciente, donde queda la nueva
        kToast('Petición enviada', 'ok');
    })
    .catch(e => {
        err.textContent = e.message || 'Error de conexión.';
        err.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Enviar petición';
    });
}

// ══════════════════════════════════════════
//  PESTAÑA DE DOCUMENTACIÓN — tarjetas por alumno
// ══════════════════════════════════════════
function cargarDocumentacion() {
    const contenedor = document.getElementById('docs-contenedor');
    if (!contenedor) return;

    const btns = [1,2,3,4,5,6].map(n =>
        `<button class="btn-curso-mini" onclick="cargarDocsCurso(${n}, this)">${n}° Año</button>`
    ).join('');
    contenedor.innerHTML =
        `<div class="selector-cursos-mini" id="selector-docs">${btns}</div>` +
        `<div id="docs-resultado"><p class="instruccion">Seleccioná un curso para ver la documentación</p></div>`;
}

let _docsAnioActual = null;

function cargarDocsCurso(anio, btn) {
    _docsAnioActual = anio;
    document.querySelectorAll('#selector-docs .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');

    const resultado = document.getElementById('docs-resultado');
    resultado.innerHTML = '<p class="instruccion" style="padding:0.5rem;">Cargando...</p>';

    // Solo lo subido por el alumno desde "Subir documentación"
    fetch(`http://127.0.0.1:5000/prece/documentos?anio=${anio}`).then(r => r.json())
    .then(documentos => {
        // Construir mapa por gmail → { nombre, apellido, docs[] }
        const mapaAlumnos = {};

        (documentos || []).forEach(d => {
            const k = d.gmail;
            if (!mapaAlumnos[k]) mapaAlumnos[k] = { nombre: d.nombre, apellido: d.apellido, gmail: k, docs: [] };
            mapaAlumnos[k].docs.push({
                tipo: 'documento',
                fecha: d.fecha,
                descripcion: d.descripcion || 'Sin descripción',
                archivo: d.archivo,
                id: d.id
            });
        });

        const alumnos = Object.values(mapaAlumnos)
            .filter(a => a.docs.length > 0)
            .sort((a, b) => a.apellido.localeCompare(b.apellido));

        if (!alumnos.length) {
            resultado.innerHTML = `<p class="instruccion">No hay documentación en ${anio}° año.</p>`;
            return;
        }

        resultado.innerHTML = `
            <p class="docs-subtitulo">${alumnos.length} alumno${alumnos.length !== 1 ? 's' : ''} con documentación</p>
            <div class="docs-grid">
                ${alumnos.map(a => `
                    <div class="doc-alumno-carta" onclick='abrirDocsModal(${JSON.stringify(a)})'>
                        <div class="doc-alumno-avatar">${a.apellido[0]}${a.nombre[0]}</div>
                        <div class="doc-alumno-info">
                            <span class="doc-alumno-nombre">${a.apellido}, ${a.nombre}</span>
                            <span class="doc-alumno-cantidad">${a.docs.length} archivo${a.docs.length !== 1 ? 's' : ''}</span>
                        </div>
                        <span class="doc-alumno-chevron">›</span>
                    </div>
                `).join('')}
            </div>
        `;
    })
    .catch(err => {
        resultado.innerHTML = `<p style="color:#ff4d4d;">❌ Error: ${err.message}</p>`;
    });
}

function abrirDocsModal(alumno) {
    const overlay = document.getElementById('docs-modal-overlay');
    document.getElementById('docs-modal-nombre').textContent = `${alumno.apellido}, ${alumno.nombre}`;
    document.getElementById('docs-modal-badge').textContent  = `${alumno.docs.length} archivo${alumno.docs.length !== 1 ? 's' : ''}`;

    const ICONOS = { foto: '🖼', certificado: '📎', documento: '🗂️' };
    const LABELS = { foto: 'Foto de clase', certificado: 'Certificado', documento: 'Documento' };
    const CARPETAS = { foto: 'fotos', certificado: 'certificados', documento: 'documentos' };

    const lista = document.getElementById('docs-modal-lista');
    lista.innerHTML = alumno.docs
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map(doc => {
            const esImagen = /\.(png|jpg|jpeg|gif|webp)$/i.test(doc.archivo);
            const esPDF   = /\.pdf$/i.test(doc.archivo);
            const carpeta = CARPETAS[doc.tipo] || 'documentos';
            const url     = `http://127.0.0.1:5000/uploads/${carpeta}/${doc.archivo}`;

            const preview = esImagen
                ? `<img src="${url}" class="doc-item-preview" onclick="cerrarDocsModal();abrirLightbox('${url}', '${doc.descripcion.replace(/'/g,"\\'")}', '${alumno.apellido}, ${alumno.nombre}', '${doc.fecha}')" alt="preview">`
                : esPDF
                    ? `<a href="${url}" target="_blank" class="doc-item-pdf">📄 Ver PDF</a>`
                    : `<a href="${url}" target="_blank" class="doc-item-pdf">📄 Descargar archivo</a>`;

            return `
                <div class="doc-item" id="doc-item-${doc.id}">
                    <div class="doc-item-top">
                        <span class="doc-item-tipo">${ICONOS[doc.tipo]} ${LABELS[doc.tipo]}</span>
                        <span class="doc-item-fecha">${doc.fecha}</span>
                    </div>
                    <p class="doc-item-desc">${doc.descripcion}</p>
                    ${preview}
                    <button class="btn-eliminar-foto" onclick="eliminarDocumento(${doc.id}, this)">🗑 Eliminar</button>
                </div>
            `;
        }).join('');

    overlay.style.display = 'flex';
    // NO agregamos lightbox-abierto al body — ese blur es solo para el lightbox de imagen
}

async function eliminarDocumento(id, btn) {
    if (!(await kConfirm('El documento se borra de la base de datos y no se puede recuperar.', { titulo: '¿Eliminar este documento?' }))) return;
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    fetch(`http://127.0.0.1:5000/prece/eliminar-documento/${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                const item = document.getElementById(`doc-item-${id}`);
                if (item) {
                    item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        item.remove();
                        const lista = document.getElementById('docs-modal-lista');
                        if (lista && !lista.children.length) cerrarDocsModal();
                    }, 300);
                }
                // Resincroniza la grilla de alumnos (cantidad de archivos, etc.)
                const btnActivo = document.querySelector('#selector-docs .btn-curso-mini.activo');
                if (_docsAnioActual && btnActivo) cargarDocsCurso(_docsAnioActual, btnActivo);
            } else {
                if (btn) { btn.disabled = false; btn.textContent = '🗑 Eliminar'; }
                kToast('No se pudo eliminar: ' + (data.error || 'error desconocido'), 'error');
            }
        })
        .catch(() => {
            if (btn) { btn.disabled = false; btn.textContent = '🗑 Eliminar'; }
            kToast('No se pudo eliminar. Revisá la conexión con el servidor.', 'error');
        });
}

function cerrarDocsModal() {
    document.getElementById('docs-modal-overlay').style.display = 'none';
}

function marcarAnotadoPrece(id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    fetch(`http://127.0.0.1:5000/avisos/anotado/${id}`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                const card = document.getElementById(`aviso-prece-${id}`);
                if (card) {
                    card.classList.remove('aviso-card-pendiente');
                    card.classList.add('aviso-card-anotado');
                    const footer = card.querySelector('.aci-footer');
                    if (footer) footer.innerHTML = `
                        <span class="aci-estado">✅ Anotado</span>
                        <div class="aci-footer-btns">
                            <button class="btn-eliminar-aviso" onclick="eliminarAviso(${id}, this)">🗑</button>
                        </div>`;
                }
            }
        })
        .catch(() => {
            if (btn) { btn.disabled = false; btn.textContent = '✓ Anotado'; }
        });
}

async function eliminarAviso(id, btn) {
    if (!(await kConfirm('El aviso se borra de la base de datos y no se puede recuperar.', { titulo: '¿Eliminar este aviso?' }))) return;
    if (btn) { btn.disabled = true; }
    fetch(`http://127.0.0.1:5000/prece/eliminar-aviso/${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                const card = document.getElementById(`aviso-prece-${id}`);
                if (card) {
                    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => card.remove(), 300);
                }
            } else {
                if (btn) btn.disabled = false;
                kToast('Error: ' + (data.error || 'error desconocido'), 'error');
            }
        })
        .catch(() => {
            if (btn) btn.disabled = false;
            kToast('No se pudo eliminar. Revisá la conexión con el servidor.', 'error');
        });
}

function cambiarPestania(pestania) {
    ['alumnos','avisos','motivos','faltas','evidencias','anuncios','ingresos','excel'].forEach(p => {
        const tab   = document.getElementById(`tab-${p}`);
        const panel = document.getElementById(`panel-${p}`);
        if (tab)   tab.classList.toggle('tab-activa', p === pestania);
        if (panel) panel.style.display = p === pestania ? 'block' : 'none';
    });
    if (pestania === 'motivos')       cargarMotivos();
    if (pestania === 'faltas')        iniciarPanelFaltas();
    if (pestania === 'evidencias')    iniciarPanelEvidencias();
    if (pestania === 'anuncios')    { iniciarPanelAnuncios(); cargarDocumentacion(); }
    if (pestania === 'avisos')        iniciarPanelAvisos();
    if (pestania === 'ingresos')      iniciarPanelIngresos();
    if (pestania === 'excel')         iniciarPanelExcel();
}

// Muestra/oculta el segundo grupo de pestañas (Alumnos, Motivos, Evidencias, Ingresos)
function toggleTabsExtra() {
    const extra = document.getElementById('tabs-extra');
    const btn   = document.getElementById('tab-toggle-extra');
    if (!extra || !btn) return;

    const abierto = extra.classList.toggle('mostrar');
    btn.classList.toggle('tabs-extra-abiertas', abierto);
    btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
}

// ══════════════════════════════════════════
//  PANEL FALTAS
// ══════════════════════════════════════════

let faltasPreceData = [];

function iniciarPanelFaltas() {
    cargarFeriados();
}

function toggleFeriados() {
    const body = document.getElementById('feriados-body');
    const txt  = document.getElementById('feriados-toggle-txt');
    const abierto = body.style.display !== 'none';
    body.style.display = abierto ? 'none' : 'block';
    txt.textContent = abierto ? 'Mostrar ▾' : 'Ocultar ▴';
}

function cargarFeriados() {
    const lista = document.getElementById('feriados-lista');
    lista.innerHTML = '<p class="instruccion">Cargando...</p>';

    fetch('http://127.0.0.1:5000/feriados')
        .then(r => r.json())
        .then(feriados => {
            if (!Array.isArray(feriados) || !feriados.length) {
                lista.innerHTML = '<p class="instruccion">No hay feriados cargados para este año</p>';
                return;
            }
            lista.innerHTML = feriados.map(f => `
                <div class="feriado-item">
                    <span class="feriado-fecha">${f.fecha}</span>
                    <span class="feriado-tipo-chip ${f.tipo === 'excepcion' ? 'feriado-tipo-excepcion' : 'feriado-tipo-nacional'}">
                        ${f.tipo === 'excepcion' ? 'Excepción' : 'Nacional'}
                    </span>
                    <span class="feriado-desc">${f.descripcion}</span>
                    <button class="btn-eliminar-feriado" onclick="eliminarFeriado(${f.id})" title="Eliminar">🗑</button>
                </div>
            `).join('');
        })
        .catch(() => { lista.innerHTML = '<p class="instruccion">Error al conectar con el servidor</p>'; });
}

function agregarFeriado() {
    const fecha = document.getElementById('feriado-fecha').value;
    const desc  = document.getElementById('feriado-desc').value.trim();
    const errorEl = document.getElementById('feriado-error');
    errorEl.style.display = 'none';

    if (!fecha || !desc) {
        errorEl.textContent = 'Completá la fecha y la descripción.';
        errorEl.style.display = 'block';
        return;
    }

    fetch('http://127.0.0.1:5000/feriados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, descripcion: desc })
    })
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            document.getElementById('feriado-fecha').value = '';
            document.getElementById('feriado-desc').value  = '';
            cargarFeriados();
        })
        .catch(err => {
            errorEl.textContent = 'Error al guardar: ' + err.message;
            errorEl.style.display = 'block';
        });
}

async function eliminarFeriado(id) {
    if (!(await kConfirm('Los días vuelven a contarse como hábiles.', { titulo: '¿Eliminar este feriado o excepción?' }))) return;
    fetch(`http://127.0.0.1:5000/feriados/${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(() => cargarFeriados())
        .catch(() => kToast('No se pudo eliminar. Revisá la conexión con el servidor.', 'error'));
}

function verFaltasCurso(anio, btnEl) {
    document.querySelectorAll('#selector-faltas-curso .btn-curso-mini').forEach(b => b.classList.remove('activo'));
    if (btnEl) btnEl.classList.add('activo');

    const cont = document.getElementById('faltas-prece-contenedor');
    cont.innerHTML = '<p class="instruccion">Cargando...</p>';
    faltasPreceData = [];

    fetch(`http://127.0.0.1:5000/prece/faltas/${anio}`).then(r => r.json())
        .then(faltas => {
            faltasPreceData = (faltas || []).map(al => ({
                nombre: al.nombre, apellido: al.apellido, gmail: al.gmail,
                faltas: al.ausencias, conMotivo: al.con_motivo || 0,
                diasHabiles: al.dias_habiles, topMotivos: al.motivos_frecuentes || []
            }));
            filtrarFaltasPrece();
        })
        .catch(e => {
            console.error(e);
            cont.innerHTML = '<p class="instruccion">Error al conectar con el servidor</p>';
        });
}

function filtrarFaltasPrece() {
    const buscar = (document.getElementById('buscar-alumno-faltas')?.value || '').toLowerCase();
    const orden  = document.getElementById('orden-faltas-prece')?.value || 'mas';
    const cont   = document.getElementById('faltas-prece-contenedor');

    if (!faltasPreceData.length) { cont.innerHTML = '<p class="instruccion">Sin datos</p>'; return; }

    let datos = faltasPreceData.filter(al =>
        (al.nombre + ' ' + al.apellido).toLowerCase().includes(buscar) ||
        (al.apellido + ' ' + al.nombre).toLowerCase().includes(buscar)
    );
    if (orden === 'mas')   datos.sort((a,b) => b.faltas - a.faltas);
    if (orden === 'menos') datos.sort((a,b) => a.faltas - b.faltas);
    if (orden === 'alfa')  datos.sort((a,b) => a.apellido.localeCompare(b.apellido));

    if (!datos.length) { cont.innerHTML = '<p class="instruccion">No se encontraron alumnos</p>'; return; }

    let html = `
    <div class="dir-tabla">
        <div class="dir-tabla-header cols-faltas">
            <span>Alumno</span><span>Correo</span>
            <span>Ausencias</span><span>Con motivo</span><span>Motivos frecuentes</span>
        </div>`;

    datos.forEach(al => {
        const badge  = al.faltas === 0 ? 'badge-verde' : al.faltas <= 3 ? 'badge-ambar' : 'badge-rojo';
        const chips  = al.topMotivos.map(m => `<span class="chip-motivo" title="${m}">${m}</span>`).join('');
        const conMot = al.conMotivo > 0
            ? `<span class="badge-num badge-ambar">${al.conMotivo}</span>`
            : `<span class="badge-num badge-verde">0</span>`;
        const tooltip = al.diasHabiles ? `title="Sobre ${al.diasHabiles} días hábiles"` : '';
        html += `
        <div class="dir-fila cols-faltas">
            <div class="dir-fila-nombre">${al.apellido}, ${al.nombre}</div>
            <div class="dir-fila-email">${al.gmail}</div>
            <div ${tooltip}><span class="badge-num ${badge}">${al.faltas}</span></div>
            <div>${conMot}</div>
            <div class="motivo-chips">${chips || '<span class="instruccion" style="font-size:0.78rem;">—</span>'}</div>
        </div>`;
    });

    html += `</div>`;
    cont.innerHTML = html;
}

// topN: cuenta ocurrencias y devuelve las N más frecuentes (reutiliza la
// misma utilidad que usa Directivos, si no está ya definida acá)
if (typeof topN !== 'function') {
    var topN = function(arr, n) {
        const conteo = {};
        arr.forEach(v => { if (v) conteo[v] = (conteo[v] || 0) + 1; });
        return Object.entries(conteo).sort((a,b) => b[1]-a[1]).slice(0,n).map(e => e[0]);
    };
}


function iniciarPanelExcel() {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('excel-fecha');
    if (fechaInput && !fechaInput.value) fechaInput.value = hoy;
}

function descargarExcelConFecha(anio) {
    const fechaInput = document.getElementById('excel-fecha');
    const fecha = fechaInput?.value || new Date().toISOString().split('T')[0];

    // Feedback visual al botón
    const botones = document.querySelectorAll('#panel-excel .btn-excel-directo');
    const btn = botones[anio - 1];
    if (btn) {
        const textoOriginal = btn.textContent;
        btn.textContent = '⏳ Descargando...';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }, 2500);
    }

    window.location.href = `http://127.0.0.1:5000/descargar-excel/${anio}?fecha=${fecha}`;
}

// ══════════════════════════════════════════
//  PANEL AVISOS
// ══════════════════════════════════════════

let horaH = 7, horaM = 0;

function iniciarPanelAvisos() {
    //Setear fecha de hoy por defecto
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('aviso-fecha');
    if (fechaInput) fechaInput.value = hoy;
    actualizarDisplayHora();
}

function cambiarHora(parte, delta) {
    if (parte === 'h') {
        horaH = (horaH + delta + 24) % 24;
    } else {
        horaM = (horaM + delta + 60) % 60;
    }
    actualizarDisplayHora();
}

function actualizarDisplayHora() {
    document.getElementById('hora-h').textContent = String(horaH).padStart(2, '0');
    document.getElementById('hora-m').textContent = String(horaM).padStart(2, '0');
}

let _cursoAvisoSeleccionado = null;

function seleccionarCursoAviso(anio, btn) {
    document.querySelectorAll('#selector-aviso-curso .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    _cursoAvisoSeleccionado = anio;

    // Ocultar el selector de alumno individual — ya no se necesita
    const campAlumno = document.getElementById('campo-alumno');
    if (campAlumno) campAlumno.style.display = 'none';
}

function guardarAviso() {
    const id_curso = _cursoAvisoSeleccionado;
    const fecha    = document.getElementById('aviso-fecha')?.value;
    const hora     = `${String(horaH).padStart(2,'0')}:${String(horaM).padStart(2,'0')}`;
    const motivo   = document.getElementById('aviso-motivo')?.value.trim();
    const errorEl  = document.getElementById('aviso-form-error');
    const okEl     = document.getElementById('aviso-ok');

    errorEl.style.display = 'none';
    okEl.style.display    = 'none';

    if (!id_curso) {
        errorEl.textContent = 'Seleccioná un curso.';
        errorEl.style.display = 'block';
        return;
    }
    if (!fecha) {
        errorEl.textContent = 'Seleccioná una fecha.';
        errorEl.style.display = 'block';
        return;
    }
    if (!motivo) {
        errorEl.textContent = 'Escribí el motivo.';
        errorEl.style.display = 'block';
        return;
    }

    const btnGuardar = document.querySelector('#panel-avisos .btn-login');
    if (btnGuardar) { btnGuardar.disabled = true; btnGuardar.textContent = 'Guardando...'; }

    fetch('http://127.0.0.1:5000/prece/avisos/curso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_curso, fecha, hora, motivo })
    })
    .then(r => r.json())
    .then(data => {
        if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.textContent = 'Guardar aviso'; }
        if (data.error) {
            errorEl.textContent = data.error;
            errorEl.style.display = 'block';
            return;
        }
        okEl.textContent = `✓ Aviso enviado a ${data.total} alumno${data.total !== 1 ? 's' : ''} de ${id_curso}° año`;
        okEl.style.display = 'block';
        document.getElementById('aviso-motivo').value = '';
        document.getElementById('aviso-fecha').value  = '';
        setTimeout(() => okEl.style.display = 'none', 4000);
    })
    .catch(() => {
        if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.textContent = 'Guardar aviso'; }
        errorEl.textContent = 'Error de conexión.';
        errorEl.style.display = 'block';
    });
}

// ══════════════════════════════════════════
//  AVISOS REGISTRADOS — flujo Año → Mes → Avisos
// ══════════════════════════════════════════

let _verAvisosAnioActual = null;
let _verAvisosMesActual  = null;

const NOMBRES_MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function verAvisosCurso(anio, btn) {
    document.querySelectorAll('#selector-ver-avisos .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');

    _verAvisosAnioActual = anio;
    _verAvisosMesActual  = null;

    const contenedor = document.getElementById('avisos-lista-contenedor');
    contenedor.innerHTML = '<p class="instruccion">Cargando...</p>';

    fetch(`http://127.0.0.1:5000/prece/avisos/${anio}/meses`)
        .then(r => r.json())
        .then(meses => {
            if (!meses.length) {
                contenedor.innerHTML = `<p class="instruccion">No hay avisos en ${anio}° año.</p>`;
                return;
            }
            _mostrarMesesAvisos(meses, anio);
        })
        .catch(err => {
            contenedor.innerHTML = `<p style="color:#ff4d4d;">❌ Error: ${err.message}</p>`;
        });
}

function _mostrarMesesAvisos(meses, anio) {
    const contenedor = document.getElementById('avisos-lista-contenedor');
    const btns = meses.map(m => {
        const etiqueta = `${NOMBRES_MESES[m.mes]} ${m.anio}`;
        return `<button class="btn-curso-mini" onclick="verAvisosMes('${m.anio_mes}', this)">${etiqueta}</button>`;
    }).join('');

    contenedor.innerHTML = `
        <div class="selector-cursos-mini" id="selector-ver-meses" style="margin-bottom:1rem;">
            ${btns}
        </div>
        <div id="avisos-mes-contenedor">
            <p class="instruccion">Seleccioná un mes para ver los avisos</p>
        </div>
    `;
}

function verAvisosMes(anioMes, btn) {
    document.querySelectorAll('#selector-ver-meses .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');

    _verAvisosMesActual = anioMes;
    const anio = _verAvisosAnioActual;

    const mesContenedor = document.getElementById('avisos-mes-contenedor');
    mesContenedor.innerHTML = '<p class="instruccion">Cargando...</p>';

    fetch(`http://127.0.0.1:5000/prece/avisos/${anio}/mes/${anioMes}`)
        .then(r => r.json())
        .then(avisos => {
            if (!avisos.length) {
                mesContenedor.innerHTML = `<p class="instruccion">No hay avisos para este mes.</p>`;
                return;
            }

            const partesMes = anioMes.split('-');
            const etiquetaMes = `${NOMBRES_MESES[parseInt(partesMes[1])]} ${partesMes[0]}`;

            const tarjeta = (av) => `
                <div class="aviso-card-item ${av.anotado ? 'aviso-card-anotado' : 'aviso-card-pendiente'}" id="aviso-prece-${av.id}">
                    <span class="aci-nombre">👤 ${av.apellido}, ${av.nombre}</span>
                    <span class="aci-hora">⏰ ${av.hora}</span>
                    <span class="aci-motivo">📝 ${av.motivo}</span>
                    <div class="aci-footer">
                        <span class="aci-estado">${av.anotado ? '✅ Anotado' : '⏳ Pendiente'}</span>
                        <div class="aci-footer-btns">
                            ${!av.anotado ? `<button class="btn-marcar-anotado" onclick="marcarAnotadoPrece(${av.id}, this)">✓ Anotado</button>` : ''}
                        </div>
                    </div>
                </div>
            `;

            // Agrupar por fecha
            const porFecha = {};
            avisos.forEach(av => {
                if (!porFecha[av.fecha]) porFecha[av.fecha] = [];
                porFecha[av.fecha].push(av);
            });
            const fechasOrdenadas = Object.keys(porFecha).sort((a, b) => b.localeCompare(a));

            const bloquesFecha = fechasOrdenadas.map(fecha => {
                const avsDelDia    = porFecha[fecha];
                const pendientes   = avsDelDia.filter(av => !av.anotado);
                const anotados     = avsDelDia.filter(av =>  av.anotado);

                // Formatear fecha: "lunes 12 de mayo"
                const [y, m, d] = fecha.split('-');
                const fechaObj  = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                const diasSem   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
                const etiquetaFecha = `${diasSem[fechaObj.getDay()]} ${parseInt(d)} de ${NOMBRES_MESES[parseInt(m)].toLowerCase()}`;

                return `
                    <div class="avisos-fecha-bloque">
                        <div class="avisos-fecha-separador">
                            <span class="avisos-fecha-label">📅 ${etiquetaFecha}</span>
                            <span class="avisos-fecha-badge">${avsDelDia.length} aviso${avsDelDia.length !== 1 ? 's' : ''}</span>
                            <button class="btn-eliminar-fecha" onclick="eliminarAvisosFecha('${fecha}', ${anio}, '${etiquetaFecha}', '${anioMes}')">🗑</button>
                        </div>
                        <div class="avisos-dos-columnas">
                            <div class="avisos-col">
                                <h4 class="avisos-col-titulo avisos-col-titulo--pendiente">⏳ Pendientes <span class="avisos-col-badge">${pendientes.length}</span></h4>
                                ${pendientes.length
                                    ? pendientes.map(tarjeta).join('')
                                    : '<p class="avisos-col-vacio">Sin avisos pendientes</p>'}
                            </div>
                            <div class="avisos-col">
                                <h4 class="avisos-col-titulo avisos-col-titulo--anotado">✅ Anotados por el alumno <span class="avisos-col-badge">${anotados.length}</span></h4>
                                ${anotados.length
                                    ? anotados.map(tarjeta).join('')
                                    : '<p class="avisos-col-vacio">Sin avisos anotados</p>'}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            mesContenedor.innerHTML = `
                <div class="avisos-mes-header">
                    <h4 class="avisos-mes-titulo">📅 ${etiquetaMes} — ${anio}° Año</h4>
                    <span class="avisos-fecha-badge" style="margin-left:0;">${avisos.length} aviso${avisos.length !== 1 ? 's' : ''}</span>
                </div>
                ${bloquesFecha}
            `;
        })
        .catch(err => {
            mesContenedor.innerHTML = `<p style="color:#ff4d4d;">❌ Error: ${err.message}</p>`;
        });
}

async function eliminarAvisosFecha(fecha, anio, etiquetaFecha, anioMes) {
    if (!(await kConfirm(`Se borran todos los avisos de ${anio}° Año del ${etiquetaFecha}. Esta acción no se puede deshacer.`, { titulo: '¿Eliminar los avisos de este día?' }))) return;

    fetch(`http://127.0.0.1:5000/prece/avisos/${anio}/fecha/${fecha}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                // Recargar la vista del mes actual
                const btn = document.querySelector(`#selector-ver-meses .btn-curso-mini.activo`);
                if (btn) verAvisosMes(anioMes, btn);
            } else {
                kToast('Error: ' + (data.error || 'error desconocido'), 'error');
            }
        })
        .catch(() => kToast('Error de conexión con el servidor.', 'error'));
}

// ══════════════════════════════════════════
//  LIGHTBOX DE EVIDENCIAS
// ══════════════════════════════════════════
function abrirLightbox(url, descripcion, alumno, fecha) {
    // Crear overlay si no existe
    let overlay = document.getElementById('lightbox-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightbox-overlay';
        overlay.innerHTML = `
            <div class="lightbox-backdrop" onclick="cerrarLightbox()"></div>
            <div class="lightbox-box">
                <button class="lightbox-cerrar" onclick="cerrarLightbox()">✕</button>
                <img id="lightbox-img" src="" alt="" class="lightbox-img">
                <div class="lightbox-info">
                    <p class="lightbox-alumno" id="lightbox-alumno"></p>
                    <p class="lightbox-desc"><span class="lightbox-label">Motivo:</span> <span id="lightbox-desc-texto"></span></p>
                    <p class="lightbox-fecha" id="lightbox-fecha"></p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    document.getElementById('lightbox-img').src          = url;
    document.getElementById('lightbox-alumno').textContent = alumno;
    document.getElementById('lightbox-desc-texto').textContent = descripcion || 'Sin descripción';
    document.getElementById('lightbox-fecha').textContent  = fecha;

    overlay.classList.add('lightbox-visible');
    document.body.classList.add('lightbox-abierto');
}

function cerrarLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) overlay.classList.remove('lightbox-visible');
    document.body.classList.remove('lightbox-abierto');
}

// Cerrar con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarLightbox();
});

// --- INIT ---
 
document.addEventListener('DOMContentLoaded', () => {
    ['prece-nombre-input', 'prece-email-input', 'prece-dni-input'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') verificarDatosPreceptoria(); });
    });

    if (sessionStorage.getItem('prece_auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('panel-screen').style.display  = 'block';
        cambiarPestania('avisos');
    }
});
 
// --- SIDEBAR SCROLL (no tocar) ---
(function () {
    const header = document.querySelector(".sidebar");
    let ultimoScroll = 0, ticking = false;
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
                ticking = false;
            });
            ticking = true;
        }
    });
})();
// ══════════════════════════════════════════
//  PANEL INGRESOS
// ══════════════════════════════════════════
let _cursoIngresosSeleccionado = null;

function iniciarPanelIngresos() {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('ingresos-fecha');
    if (fechaInput && !fechaInput.value) fechaInput.value = hoy;
}

function verIngresos(anio, btn) {
    document.querySelectorAll('#selector-ingresos-curso .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    _cursoIngresosSeleccionado = anio;
    cargarIngresos(anio);
}

function refrescarIngresos() {
    if (_cursoIngresosSeleccionado) cargarIngresos(_cursoIngresosSeleccionado);
}

function cargarIngresos(anio) {
    const contenedor = document.getElementById('ingresos-contenedor');
    const fecha = document.getElementById('ingresos-fecha')?.value || new Date().toISOString().split('T')[0];
    contenedor.innerHTML = '<p class="instruccion">Cargando...</p>';

    fetch(`http://127.0.0.1:5000/ingresos-fecha/${anio}?fecha=${fecha}`)
        .then(r => r.json())
        .then(ingresos => {
            if (!ingresos.length) {
                contenedor.innerHTML = `<p class="instruccion">Sin ingresos registrados para ${anio}° año en esa fecha.</p>`;
                return;
            }

            const horaEntrada = '08:00:00';
            const tarde  = ingresos.filter(i => i.hora > horaEntrada);
            const tiempo = ingresos.filter(i => i.hora <= horaEntrada);

            contenedor.innerHTML = `
                <div class="ingresos-resumen">
                    <span class="ingreso-chip ingreso-ok">✅ A tiempo: ${tiempo.length}</span>
                    <span class="ingreso-chip ingreso-tarde">⚠️ Tarde: ${tarde.length}</span>
                    <span class="ingreso-chip">Total: ${ingresos.length}</span>
                </div>
                <div class="ingresos-tarjetas">
                    ${ingresos.map(i => {
                        const esTarde = i.hora > horaEntrada;
                        const hora    = i.hora ? i.hora.substring(0, 5) : '—';
                        return `
                        <div class="ingreso-tarjeta ${esTarde ? 'ingreso-tarjeta-tarde' : ''}">
                            <p class="ingreso-tarjeta-nombre">${i.apellido} ${i.nombre}</p>
                            <p class="ingreso-tarjeta-sub">Código KRONO</p>
                            <p class="ingreso-tarjeta-hora">${hora}</p>
                            <span class="ingreso-tarjeta-estado">${esTarde ? '⚠️ Tarde' : '✅ A tiempo'}</span>
                        </div>`;
                    }).join('')}
                </div>`;
        })
        .catch(err => {
            contenedor.innerHTML = `<p style="color:#ff4d4d;">❌ Error: ${err.message}</p>`;
        });
}

function descargarExcelDirecto(anio) {
    // Obtenemos la fecha que esté seleccionada en el input de calendario
    // Si no hay ninguna, el backend usará la fecha de hoy por defecto
    const fechaInput = document.getElementById('ingresos-fecha').value;
    
    let url = `http://127.0.0.1:5000/descargar-excel/${anio}`;
    
    if (fechaInput) {
        url += `?fecha=${fechaInput}`;
    }

    // Ejecuta la descarga abriendo la URL en la misma ventana
    window.location.href = url;
}

// ══════════════════════════════════════════
//  PANEL ANUNCIOS — preceptor → alumno específico
// ══════════════════════════════════════════
let _cursoAnuncioSeleccionado = null;

function iniciarPanelAnuncios() {
    // Limpiar estado
    _cursoAnuncioSeleccionado = null;
    document.getElementById('campo-anuncio-alumno').style.display = 'none';
    document.getElementById('anuncio-alumno-select').innerHTML = '<option value="">— Seleccioná un alumno —</option>';
    document.getElementById('anuncio-mensaje').value = '';
    document.getElementById('anuncio-documento').value = '';
    document.getElementById('anuncio-es-peticion').checked = true;
    toggleAnuncioPeticion();
    document.getElementById('anuncio-form-error').style.display = 'none';
    document.getElementById('anuncio-ok').style.display = 'none';
}

function seleccionarCursoAnuncio(anio, btn) {
    document.querySelectorAll('#selector-anuncio-curso .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    _cursoAnuncioSeleccionado = anio;

    const select = document.getElementById('anuncio-alumno-select');
    const campo  = document.getElementById('campo-anuncio-alumno');
    select.innerHTML = '<option value="">Cargando...</option>';
    campo.style.display = 'flex';

    fetch(`http://127.0.0.1:5000/alumnos-lista/${anio}`)
        .then(r => r.json())
        .then(alumnos => {
            select.innerHTML = '<option value="">— Seleccioná un alumno —</option>' +
                alumnos.map(a => `<option value="${a.id_alumno}">${a.apellido}, ${a.nombre}</option>`).join('');
        })
        .catch(() => {
            select.innerHTML = '<option value="">Error al cargar</option>';
        });
}

function toggleAnuncioPeticion() {
    const es = document.getElementById('anuncio-es-peticion').checked;
    document.getElementById('campo-anuncio-documento').style.display = es ? '' : 'none';
    document.getElementById('anuncio-mensaje-label').textContent = es ? 'Mensaje (opcional)' : 'Mensaje';
}

function enviarAnuncio() {
    const id_alumno  = document.getElementById('anuncio-alumno-select').value;
    const mensaje    = document.getElementById('anuncio-mensaje').value.trim();
    const esPeticion = document.getElementById('anuncio-es-peticion').checked;
    const documento  = esPeticion ? document.getElementById('anuncio-documento').value.trim() : '';
    const errorEl    = document.getElementById('anuncio-form-error');
    const okEl       = document.getElementById('anuncio-ok');

    errorEl.style.display = 'none';
    okEl.style.display    = 'none';
    const fallo = t => { errorEl.textContent = t; errorEl.style.display = 'block'; };

    if (!_cursoAnuncioSeleccionado) return fallo('Seleccioná un curso.');
    if (!id_alumno)                 return fallo('Seleccioná un alumno.');
    if (esPeticion && !documento)   return fallo('Escribí qué documento se solicita.');
    if (!esPeticion && !mensaje)    return fallo('Escribí el mensaje.');

    const btn = document.querySelector('#panel-anuncios .btn-login');
    btn.disabled = true; btn.textContent = 'Enviando...';

    // Con documento va por el mismo endpoint que "Nueva petición" de Evidencias:
    // crea la petición y además el aviso privado al alumno.
    const url  = esPeticion ? 'http://127.0.0.1:5000/prece/peticiones' : 'http://127.0.0.1:5000/prece/anuncios';
    const body = esPeticion
        ? { id_alumno: parseInt(id_alumno), documento, mensaje }
        : { id_alumno: parseInt(id_alumno), mensaje };

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(r => r.json())
    .then(data => {
        btn.disabled = false; btn.textContent = 'Enviar anuncio';
        if (data.error) return fallo(data.error);
        okEl.textContent = esPeticion
            ? '✓ Petición enviada y registrada en Evidencias'
            : '✓ Anuncio enviado';
        okEl.style.display = 'block';
        document.getElementById('anuncio-mensaje').value = '';
        document.getElementById('anuncio-documento').value = '';
        setTimeout(() => okEl.style.display = 'none', 3500);
        if (esPeticion) evCargar('peticiones', true);
        // Refrescar lista si el mismo curso está seleccionado en "ver"
        const btnVerActivo = document.querySelector('#selector-ver-anuncios .btn-curso-mini.activo');
        if (btnVerActivo) verAnunciosCurso(_cursoAnuncioSeleccionado, btnVerActivo);
    })
    .catch(() => {
        btn.disabled = false; btn.textContent = 'Enviar anuncio';
        fallo('Error de conexión.');
    });
}

function verAnunciosCurso(anio, btn) {
    document.querySelectorAll('#selector-ver-anuncios .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');

    const contenedor = document.getElementById('anuncios-lista-contenedor');
    contenedor.innerHTML = '<p class="instruccion">Cargando...</p>';

    fetch(`http://127.0.0.1:5000/prece/anuncios/${anio}`)
        .then(r => r.json())
        .then(anuncios => {
            if (!anuncios.length) {
                contenedor.innerHTML = `<p class="instruccion">No hay anuncios en ${anio}° año.</p>`;
                return;
            }
            contenedor.innerHTML = anuncios.map(a => `
                <div class="anuncio-prece-item" id="anuncio-item-${a.id}">
                    <div class="anuncio-prece-top">
                        <span class="anuncio-prece-alumno">👤 ${a.apellido}, ${a.nombre}</span>
                        <span class="anuncio-prece-fecha">${a.creado_en}</span>
                    </div>
                    <p class="anuncio-prece-msg">${a.mensaje}</p>
                    <div class="anuncio-prece-footer">
                        <span class="anuncio-prece-estado ${a.leido ? 'leido' : 'no-leido'}">${a.leido ? '✅ Leído' : '⏳ Sin leer'}</span>
                        <button class="btn-eliminar-aviso" onclick="eliminarAnuncio(${a.id}, this)">🗑</button>
                    </div>
                </div>
            `).join('');
        })
        .catch(err => {
            contenedor.innerHTML = `<p style="color:#ff4d4d;">❌ Error: ${err.message}</p>`;
        });
}

async function eliminarAnuncio(id, btn) {
    if (!(await kConfirm('El anuncio se borra de la base de datos y el alumno deja de verlo.', { titulo: '¿Eliminar este anuncio?' }))) return;
    if (btn) btn.disabled = true;
    // La ruta real del backend es /prece/eliminar-anuncio/<id> (/prece/anuncios/<id> solo acepta GET)
    fetch(`http://127.0.0.1:5000/prece/eliminar-anuncio/${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                const el = document.getElementById(`anuncio-item-${id}`);
                if (el) {
                    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    el.style.opacity = '0';
                    el.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        el.remove();
                        const cont = document.getElementById('anuncios-lista-contenedor');
                        if (cont && !cont.querySelector('.anuncio-prece-item')) {
                            cont.innerHTML = '<p class="instruccion">No hay anuncios en este año.</p>';
                        }
                    }, 300);
                }
                kToast('Anuncio eliminado', 'ok');
            } else {
                if (btn) btn.disabled = false;
                kToast('No se pudo eliminar: ' + (data.error || 'error desconocido'), 'error');
            }
        })
        .catch(() => {
            if (btn) btn.disabled = false;
            kToast('No se pudo eliminar. Revisá la conexión con el servidor.', 'error');
        });
}


// ══════════════════════════════════════════════
//  MENÚ HAMBURGUESA — solo visible en pantallas chicas (ver CSS)
// ══════════════════════════════════════════════
(function () {
    const header = document.querySelector('.sidebar');
    const boton  = document.getElementById('menu-toggle');
    const menu   = document.getElementById('nav-principal');
    if (!header || !boton || !menu) return;

    function setMenu(abierto) {
        header.classList.toggle('menu-abierto', abierto);
        boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    }

    // Abrir / cerrar con el botón
    boton.addEventListener('click', () => {
        setMenu(!header.classList.contains('menu-abierto'));
    });

    // Al tocar una opción se cierra (el enlace sigue funcionando normal)
    menu.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', () => setMenu(false));
    });

    // Tocar fuera de la barra cierra el menú
    document.addEventListener('click', e => {
        if (!header.contains(e.target)) setMenu(false);
    });

    // Escape cierra el menú y devuelve el foco al botón
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && header.classList.contains('menu-abierto')) {
            setMenu(false);
            boton.focus();
        }
    });

    // Si se agranda la pantalla (o se rota el celular) hasta modo escritorio, se resetea
    const mq = window.matchMedia('(max-width: 768px)');
    const alCambiar = e => { if (!e.matches) setMenu(false); };
    if (mq.addEventListener) mq.addEventListener('change', alCambiar);
    else mq.addListener(alCambiar);
})();


// ══════════════════════════════════════════════
//  TUTORIAL GUIADO — recorrido paso a paso
//  Oscurece y desenfoca todo menos lo que se explica.
//  Se muestra solo la primera vez, se puede omitir y
//  se vuelve a abrir con el botón "?" de la barra.
// ══════════════════════════════════════════════
(function () {
    const KEY_LOGIN = 'krono-tuto-prece-login';
    const KEY_PANEL = 'krono-tuto-prece-panel';

    const $  = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));
    const esMovil = () => window.matchMedia('(max-width: 768px)').matches;
    const sinMov  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const soportaPath = !!(window.CSS && CSS.supports && CSS.supports('clip-path', 'path("M0 0H1V1Z")'));
    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

    function leer(k)    { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function guardar(k) { try { localStorage.setItem(k, '1'); } catch (e) {} }
    function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }
    function visible(el) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    }
    function pantallaVisible(id) {
        const el = document.getElementById(id);
        return !!el && getComputedStyle(el).display !== 'none';
    }
    const panelActivo = () => {
        const t = $('#panel-screen .tab-btn.tab-activa');
        return t ? t.id.replace('tab-', '') : null;
    };
    const extrasAbiertas = () => { const e = $('#tabs-extra'); return !!e && e.classList.contains('mostrar'); };
    const irATab = n => { if (n && panelActivo() !== n) cambiarPestania(n); };
    const fijarExtras = abrir => { if (extrasAbiertas() !== abrir) toggleTabsExtra(); };

    // ── PASOS ─────────────────────────────────
    // objetivo: selector | elemento | array | función que devuelve elementos (se calcula la caja que los une)
    // tab / extras: pestaña a mostrar y si el "+" debe estar desplegado
    // maxAlto: recorta la zona resaltada cuando el contenido es muy largo · alTope: sube al inicio (elementos de la barra)
    function pasosLogin() {
        return [
            { titulo: '¡Bienvenido a Krono!',
              texto: 'Este es el acceso de Preceptoría. Te muestro en un minuto cómo ingresar y dónde queda cada cosa. Podés omitir el recorrido cuando quieras.' },
            { titulo: 'Tus datos',
              texto: 'Completá nombre y apellido, correo institucional y DNI. Tienen que coincidir con los datos cargados en Krono.',
              objetivo: () => $$('.login-card .input-icon-wrap') },
            { titulo: 'Ingresar',
              texto: 'Con los tres datos listos, tocá «Ingresar» o apretá Enter. Si algo no coincide, aparece un aviso en rojo arriba del botón.',
              objetivo: '.login-card .btn-login' },
            { titulo: 'Tu ayuda, siempre a mano',
              texto: 'Este botón vuelve a abrir el tutorial cuando quieras. La primera vez que ingreses te muestro el panel completo.',
              objetivo: '.tuto-ayuda', alTope: true }
        ];
    }

    function pasosPanel() {
        const nombre = (sessionStorage.getItem('prece_nombre') || '').trim().split(/\s+/)[0];
        return [
            { titulo: nombre ? '¡Hola, ' + nombre + '!' : '¡Hola!',
              texto: 'Este es tu Panel de Gestión. Te muestro qué hace cada parte mientras el resto queda de fondo. Avanzá con «Siguiente» o con las flechas del teclado.' },
            { titulo: 'Menú principal',
              texto: 'Desde acá pasás de un panel a otro: Estudiantes, Preceptoría (donde estás), Directivos y Profesores.',
              textoMovil: 'Tocá las tres rayitas para abrir el menú y pasar de un panel a otro: Estudiantes, Preceptoría, Directivos y Profesores.',
              objetivo: () => esMovil() ? $('#menu-toggle') : $('#nav-principal'), alTope: true },
            { titulo: 'Modo claro u oscuro',
              texto: 'Cambiá la apariencia a gusto. El ícono muestra el modo al que vas a pasar y Krono recuerda tu elección.',
              objetivo: '#modo-toggle-btn', alTope: true },
            { titulo: 'Cerrar sesión',
              texto: 'Cuando termines, cerrá sesión, sobre todo si la compu la usa más gente.',
              objetivo: '.btn-logout' },
            { titulo: 'Las pestañas',
              texto: 'Cada pestaña es una herramienta. Las cuatro principales están siempre a la vista: Avisos, Comunicación, Faltas y Descargar Excel.',
              objetivo: ['#tab-avisos', '#tab-anuncios', '#tab-faltas', '#tab-excel', '#tab-toggle-extra'] },

            { titulo: 'Avisos de llegada tarde', tab: 'avisos',
              texto: 'Acá registrás que un curso va a llegar tarde, por ejemplo por un paro de transporte. Primero elegí el curso: el aviso les llega a todos sus alumnos.',
              objetivo: () => $('#selector-aviso-curso').closest('.aviso-campo') },
            { titulo: 'Fecha, hora y motivo', tab: 'avisos',
              texto: 'Indicá el día, la hora de llegada (con las flechitas ▲▼) y el motivo. Al final, «Guardar aviso».',
              objetivo: () => $$('#panel-avisos .aviso-form-card .aviso-campo').slice(1).concat($('#panel-avisos .aviso-form-card .btn-login')) },
            { titulo: 'Avisos registrados', tab: 'avisos', maxAlto: 260,
              texto: 'Consultá lo que ya cargaste: elegís curso, después el mes y ves los avisos de cada día. También podés eliminarlos.',
              objetivo: '#panel-avisos .aviso-lista-wrap' },

            { titulo: 'Anuncios para un alumno', tab: 'anuncios',
              texto: 'Mandale un mensaje privado a un alumno: elegí el curso, después el alumno y escribí el anuncio.',
              objetivo: '#panel-anuncios .aviso-form-card' },
            { titulo: 'Anuncios enviados', tab: 'anuncios', maxAlto: 260,
              texto: 'Elegí un curso y mirá lo que ya mandaste. Si te equivocaste, podés eliminar el anuncio.',
              objetivo: () => $('#selector-ver-anuncios').closest('.aviso-lista-wrap') },
            { titulo: 'Documentación', tab: 'anuncios', maxAlto: 260,
              texto: 'Acá aparecen los archivos que suben los alumnos desde su panel. Elegí un curso y abrí el detalle de cada uno; desde ahí también podés eliminarlos.',
              objetivo: () => $('#docs-contenedor').closest('.aviso-lista-wrap') },

            { titulo: 'Feriados y excepciones', tab: 'faltas',
              texto: 'Los días cargados acá no cuentan como falta. Los feriados nacionales fijos ya vienen listos; sumá paros o suspensiones desde «Mostrar».',
              objetivo: '.feriados-wrap' },
            { titulo: 'Faltas por curso', tab: 'faltas',
              texto: 'Elegí un curso para ver las ausencias de cada alumno y cuántas tienen motivo. Con el buscador y el orden encontrás rápido a quien necesitás.',
              objetivo: () => $$('#panel-faltas .filtros-row') },

            { titulo: 'Descargar Excel', tab: 'excel',
              texto: 'Elegí una fecha y bajá la planilla de asistencia del curso que necesites. Se abre directo en Excel.',
              objetivo: '#panel-excel .excel-panel-wrap' },

            { titulo: 'Más opciones con el +', tab: 'excel', extras: true,
              texto: 'Con el «+» se despliegan cuatro herramientas más: Alumnos, Motivos, Evidencias e Ingresos.',
              objetivo: ['#tab-toggle-extra', '#tabs-extra'] },
            { titulo: 'Alumnos', tab: 'alumnos', extras: true,
              texto: 'Elegí un año y aparece la lista de alumnos del curso con su mail.',
              objetivo: '#panel-alumnos .selector-cursos-grid' },
            { titulo: 'Motivos', tab: 'motivos', extras: true, maxAlto: 200,
              texto: 'Los motivos que cargaron los alumnos. Elegí un curso y desplegá a cada uno para ver el detalle.',
              objetivo: '#motivos-contenedor' },
            { titulo: 'Evidencias', tab: 'evidencias', extras: true, maxAlto: 200,
              texto: 'El historial de lo que enviaste: los avisos de ingreso tarde (uno por curso) y las peticiones de documentación a cada alumno, con su estado. Tocá el ojo para ver el detalle.',
              objetivo: '#evidencias-prece-contenedor' },
            { titulo: 'Ingresos', tab: 'ingresos', extras: true,
              texto: 'Elegí curso y fecha para ver quién ingresó (con su código KRONO) y a qué hora. Después de las 8:00 figura como tarde.',
              objetivo: '#panel-ingresos .ingresos-filtros' },

            { titulo: '¡Eso es todo!',
              texto: 'Ya conocés todo el panel. Cuando quieras repasarlo, tocá este botón.',
              objetivo: '.tuto-ayuda', alTope: true }
        ];
    }

    // ── ESTADO ────────────────────────────────
    let activo = false, tipo = null, pasos = [], idx = 0, ticket = 0;
    let raf = 0, animando = false, cambiando = false, pendiente = false;
    let actual = { x: 0, y: 0, w: 0, h: 0 };
    let bloqueo, velo, anillo, card, ro, previoFoco, estadoInicial;
    let elContador, elBarra, elTitulo, elTexto, btnAnt, btnSig, btnOmitir;

    // ── GEOMETRÍA ─────────────────────────────
    const anchoVista = () => document.documentElement.clientWidth;
    const centro = () => ({ x: anchoVista() / 2, y: window.innerHeight / 2, w: 0, h: 0 });

    function elementosDe(p) {
        if (!p || !p.objetivo) return [];
        let o = typeof p.objetivo === 'function' ? p.objetivo() : p.objetivo;
        if (!Array.isArray(o)) o = [o];
        return o.map(x => typeof x === 'string' ? $(x) : x).filter(visible);
    }

    // Caja que une todos los elementos del paso (sin recortar a la pantalla)
    function rectCrudo(p) {
        const els = elementosDe(p);
        if (!els.length) return null;
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        els.forEach(el => {
            const r = el.getBoundingClientRect();
            x1 = Math.min(x1, r.left);  y1 = Math.min(y1, r.top);
            x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
        });
        const pad = 8;
        const c = { x: x1 - pad, y: y1 - pad, w: (x2 - x1) + pad * 2, h: (y2 - y1) + pad * 2 };
        if (p.maxAlto) c.h = Math.min(c.h, p.maxAlto + pad * 2);
        return c;
    }

    // La misma caja, recortada a lo que se ve en pantalla
    function rectVisible(p) {
        const c = rectCrudo(p);
        if (!c) return null;
        const m = 8, W = anchoVista(), H = window.innerHeight;
        const x1 = Math.max(c.x, m), y1 = Math.max(c.y, m);
        const x2 = Math.min(c.x + c.w, W - m), y2 = Math.min(c.y + c.h, H - m);
        return (x2 > x1 && y2 > y1) ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : c;
    }
    const objetivoActual = () => rectVisible(pasos[idx]) || centro();

    function pintar(r) {
        actual = r;
        const rad = Math.max(0, Math.min(16, r.w / 2, r.h / 2));
        anillo.style.left = r.x + 'px';
        anillo.style.top = r.y + 'px';
        anillo.style.width = r.w + 'px';
        anillo.style.height = r.h + 'px';
        anillo.style.borderRadius = rad + 'px';
        if (soportaPath) {
            const W = anchoVista(), H = window.innerHeight;
            const { x, y, w, h } = r;
            velo.style.clipPath =
                'path(evenodd, "M0 0H' + W + 'V' + H + 'H0Z ' +
                'M' + (x + rad) + ' ' + y + 'H' + (x + w - rad) +
                'A' + rad + ' ' + rad + ' 0 0 1 ' + (x + w) + ' ' + (y + rad) +
                'V' + (y + h - rad) +
                'A' + rad + ' ' + rad + ' 0 0 1 ' + (x + w - rad) + ' ' + (y + h) +
                'H' + (x + rad) +
                'A' + rad + ' ' + rad + ' 0 0 1 ' + x + ' ' + (y + h - rad) +
                'V' + (y + rad) +
                'A' + rad + ' ' + rad + ' 0 0 1 ' + (x + rad) + ' ' + y + 'Z")';
        }
    }

    // Anima la zona resaltada hacia el paso actual (siguiendo al elemento si se mueve)
    function animar(dur) {
        cancelAnimationFrame(raf);
        const desde = Object.assign({}, actual);
        const t0 = performance.now();
        animando = true;
        const cuadro = ahora => {
            const t = dur ? Math.min(1, (ahora - t0) / dur) : 1;
            const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const h = objetivoActual();
            pintar({
                x: desde.x + (h.x - desde.x) * e, y: desde.y + (h.y - desde.y) * e,
                w: desde.w + (h.w - desde.w) * e, h: desde.h + (h.h - desde.h) * e
            });
            if (t < 1) raf = requestAnimationFrame(cuadro);
            else { animando = false; pintar(objetivoActual()); }
        };
        raf = requestAnimationFrame(cuadro);
    }

    function esperarScroll(max) {
        return new Promise(res => {
            let ultimo = window.scrollY, quieto = 0;
            const t0 = performance.now();
            (function f() {
                const y = window.scrollY;
                quieto = (y === ultimo) ? quieto + 1 : 0;
                ultimo = y;
                if (quieto >= 4 || performance.now() - t0 > (max || 900)) res();
                else requestAnimationFrame(f);
            })();
        });
    }

    // Acomoda el scroll para que se vean a la vez lo resaltado y la tarjeta
    async function asegurarVisible(p) {
        const beh = sinMov ? 'auto' : 'smooth';
        if (p.alTope) {
            if (window.scrollY > 4) { window.scrollTo({ top: 0, behavior: beh }); await esperarScroll(); }
            return;
        }
        const c = rectCrudo(p);
        if (!c) return;
        const H = window.innerHeight, m = 12, gap = 16, ch = card.offsetHeight;
        const hayLugar = (H - (c.y + c.h) - gap - m >= ch) || (c.y - gap - m >= ch);
        if (c.y >= m && c.y + c.h <= H - m && hayLugar) return;

        const sb = $('.sidebar');
        const calc = topMin => {
            const libre = H - topMin - m, bloque = c.h + gap + ch;
            const topDeseado = bloque <= libre ? topMin + (libre - bloque) / 2 : topMin;
            return c.y - topDeseado;
        };
        let delta = calc(m);
        // Si se sube, reaparece la barra fija: dejarle su lugar
        if (delta < -6 || window.scrollY + delta <= 10) delta = calc((sb ? sb.offsetHeight : 0) + m);
        if (Math.abs(delta) < 4) return;
        window.scrollBy({ top: delta, behavior: beh });
        await esperarScroll();
    }

    function ubicarCard() {
        const W = anchoVista(), H = window.innerHeight, m = 12, gap = 16;
        const cw = card.offsetWidth, ch = card.offsetHeight;
        const r = rectVisible(pasos[idx]);
        let left, top;
        if (!r) {
            left = (W - cw) / 2; top = (H - ch) / 2;
        } else {
            const x = clamp(r.x + r.w / 2 - cw / 2, m, W - cw - m);
            if (H - (r.y + r.h) - gap - m >= ch)      { left = x; top = r.y + r.h + gap; }
            else if (r.y - gap - m >= ch)              { left = x; top = r.y - gap - ch; }
            else if (W - (r.x + r.w) - gap - m >= cw)  { left = r.x + r.w + gap; top = clamp(r.y, m, H - ch - m); }
            else if (r.x - gap - m >= cw)              { left = r.x - gap - cw;  top = clamp(r.y, m, H - ch - m); }
            else                                       { left = x; top = H - ch - m; }
        }
        card.style.left = Math.round(left) + 'px';
        card.style.top  = Math.round(top) + 'px';
    }

    function pedirReubicar() {
        if (!activo || pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => {
            pendiente = false;
            if (!activo || animando || cambiando) return;
            pintar(objetivoActual());
            ubicarCard();
        });
    }

    // ── PASOS: MOSTRAR / NAVEGAR ──────────────
    function rellenar(p) {
        const titulo = typeof p.titulo === 'function' ? p.titulo() : p.titulo;
        const ultimo = idx === pasos.length - 1;
        elContador.textContent = 'Paso ' + (idx + 1) + ' de ' + pasos.length;
        elBarra.style.width = ((idx + 1) / pasos.length * 100) + '%';
        elTitulo.textContent = titulo;
        elTexto.textContent = (esMovil() && p.textoMovil) ? p.textoMovil : p.texto;
        btnAnt.disabled = idx === 0;
        btnSig.textContent = ultimo ? '¡Listo!' : 'Siguiente →';
        btnOmitir.hidden = ultimo;
    }

    async function mostrarPaso(i) {
        const mio = ++ticket;
        idx = i;
        cambiando = true;
        const p = pasos[i];
        card.classList.add('tuto-cambiando');

        if (tipo === 'panel') { fijarExtras(!!p.extras); irATab(p.tab); }
        await esperar(sinMov ? 0 : 120);
        if (mio !== ticket) return;

        rellenar(p);
        await asegurarVisible(p);
        if (mio !== ticket) return;

        anillo.classList.toggle('tuto-anillo-sin', !rectVisible(p));
        ubicarCard();
        cambiando = false;
        animar(sinMov ? 0 : 480);
        await esperar(sinMov ? 0 : 200);
        if (mio !== ticket) return;

        card.classList.remove('tuto-cambiando');
        btnSig.focus({ preventScroll: true });
    }

    const siguiente = () => { if (activo) (idx >= pasos.length - 1 ? cerrar('fin') : mostrarPaso(idx + 1)); };
    const anterior  = () => { if (activo && idx > 0) mostrarPaso(idx - 1); };

    function onKey(e) {
        if (!activo) return;
        if (e.key === 'Escape')          { e.preventDefault(); e.stopPropagation(); cerrar('omitir'); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); siguiente(); }
        else if (e.key === 'ArrowLeft')  { e.preventDefault(); anterior(); }
        else if (e.key === 'Tab') {
            const f = Array.from(card.querySelectorAll('button:not([disabled]):not([hidden])'));
            if (!f.length) return;
            const i = f.indexOf(document.activeElement);
            if (e.shiftKey && i <= 0)            { e.preventDefault(); f[f.length - 1].focus(); }
            else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
            else if (i === -1)                   { e.preventDefault(); f[0].focus(); }
        }
    }

    // ── INICIO / CIERRE ───────────────────────
    function crearDOM() {
        bloqueo = document.createElement('div'); bloqueo.className = 'tuto-bloqueo';
        velo    = document.createElement('div'); velo.className    = 'tuto-velo';
        anillo  = document.createElement('div'); anillo.className  = 'tuto-anillo';
        card    = document.createElement('div'); card.className    = 'tuto-card tuto-cambiando';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.setAttribute('aria-labelledby', 'tuto-titulo');
        card.setAttribute('aria-describedby', 'tuto-texto');
        card.tabIndex = -1;
        card.innerHTML =
            '<div class="tuto-card-top">' +
                '<span class="tuto-contador" id="tuto-contador"></span>' +
                '<button type="button" class="tuto-omitir" id="tuto-omitir">Omitir ✕</button>' +
            '</div>' +
            '<div class="tuto-progreso"><span id="tuto-barra"></span></div>' +
            '<p class="tuto-titulo" id="tuto-titulo"></p>' +
            '<p class="tuto-texto" id="tuto-texto" aria-live="polite"></p>' +
            '<div class="tuto-acciones">' +
                '<button type="button" class="tuto-btn-sec" id="tuto-ant">← Anterior</button>' +
                '<button type="button" class="tuto-btn-pri" id="tuto-sig">Siguiente →</button>' +
            '</div>';
        [bloqueo, velo, anillo, card].forEach(e => document.body.appendChild(e));

        elContador = card.querySelector('#tuto-contador');
        elBarra    = card.querySelector('#tuto-barra');
        elTitulo   = card.querySelector('#tuto-titulo');
        elTexto    = card.querySelector('#tuto-texto');
        btnAnt     = card.querySelector('#tuto-ant');
        btnSig     = card.querySelector('#tuto-sig');
        btnOmitir  = card.querySelector('#tuto-omitir');
        btnAnt.addEventListener('click', anterior);
        btnSig.addEventListener('click', siguiente);
        btnOmitir.addEventListener('click', () => cerrar('omitir'));
    }

    function iniciar(t) {
        if (activo) return;
        if (t === 'panel' && !pantallaVisible('panel-screen')) return;
        if (t === 'login' && !pantallaVisible('login-screen')) return;

        tipo = t;
        pasos = t === 'panel' ? pasosPanel() : pasosLogin();
        idx = 0;
        activo = true;
        previoFoco = document.activeElement;
        estadoInicial = t === 'panel' ? { tab: panelActivo(), extras: extrasAbiertas() } : null;
        const sb = $('.sidebar'); if (sb) sb.classList.remove('menu-abierto');

        crearDOM();
        pintar(centro());
        requestAnimationFrame(() => [velo, anillo].forEach(e => e.classList.add('tuto-in')));

        document.addEventListener('keydown', onKey, true);
        window.addEventListener('scroll', pedirReubicar, { passive: true });
        window.addEventListener('resize', pedirReubicar);
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(pedirReubicar);
            ro.observe(document.body);
        }
        mostrarPaso(0);
    }

    function cerrar(motivo) {
        if (!activo) return;
        activo = false; animando = false; cambiando = false; ticket++;
        cancelAnimationFrame(raf);

        if (tipo === 'panel') {
            guardar(KEY_PANEL);
            if (estadoInicial) { fijarExtras(estadoInicial.extras); irATab(estadoInicial.tab); }
        } else {
            guardar(KEY_LOGIN);
            if (motivo === 'omitir') guardar(KEY_PANEL);   // quien omite no quiere más tutoriales solos
        }

        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('scroll', pedirReubicar);
        window.removeEventListener('resize', pedirReubicar);
        if (ro) { ro.disconnect(); ro = null; }

        const viejos = [bloqueo, velo, anillo, card];
        [velo, anillo].forEach(e => e.classList.remove('tuto-in'));
        card.classList.add('tuto-cambiando');
        bloqueo.style.pointerEvents = 'none';
        setTimeout(() => viejos.forEach(e => e.remove()), 350);

        if (previoFoco && document.contains(previoFoco)) {
            try { previoFoco.focus({ preventScroll: true }); } catch (e) {}
        }
    }

    // ── BOTÓN "?" EN LA BARRA + ARRANQUE AUTOMÁTICO ──
    function crearBotonAyuda() {
        if ($('#tuto-ayuda-btn')) return;
        const b = document.createElement('button');
        b.id = 'tuto-ayuda-btn';
        b.type = 'button';
        b.className = 'tuto-ayuda';
        b.title = 'Ver tutorial';
        b.setAttribute('aria-label', 'Ver tutorial guiado');
        b.textContent = '?';
        b.addEventListener('click', () => iniciar(pantallaVisible('panel-screen') ? 'panel' : 'login'));
        const modo = $('#modo-toggle-btn'), sidebar = $('.sidebar');
        if (modo && modo.parentNode) modo.parentNode.insertBefore(b, modo.nextSibling);
        else if (sidebar) sidebar.appendChild(b);
    }

    function arrancarSiCorresponde() {
        if (pantallaVisible('panel-screen')) { if (!leer(KEY_PANEL)) iniciar('panel'); }
        else if (pantallaVisible('login-screen') && !leer(KEY_LOGIN)) iniciar('login');
    }

    window.kronoTutorial = {
        iniciar: iniciar,
        // Se llama tras un login correcto: muestra el panel la primera vez
        alIngresar: function () { if (!leer(KEY_PANEL)) setTimeout(() => iniciar('panel'), 700); }
    };

    function init() {
        crearBotonAyuda();
        if (document.readyState === 'complete') setTimeout(arrancarSiCorresponde, 500);
        else window.addEventListener('load', () => setTimeout(arrancarSiCorresponde, 500));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

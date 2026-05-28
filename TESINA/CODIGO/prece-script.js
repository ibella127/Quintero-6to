
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
 
const PASSWORD_CORRECTA = "tesina";
 
// --- AUTENTICACIÓN ---
 
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
 
// --- PANEL DE CURSOS ---
 
function seleccionarCurso(anio) {
    const display = document.getElementById('display-datos');
 
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
 
            let html = `
                <div class="curso-header">
                    <h2 class="curso-titulo">${anio}° Año</h2>
                    <span class="curso-badge">✓ ${data.length} alumnos</span>
                </div>
                <div class="placeholder-tabla">
                    <div class="placeholder-row header-row">
                        <span>Nombre</span>
                        <span>Apellido</span>
                        <span>Email</span>
                        <span>Acción</span>
                    </div>
                    <div class="tabla-scroll-wrap" id="scroll-wrap">
            `;
 
            data.forEach(alumno => {
                html += `
                    <div class="placeholder-row row-dim">
                        <span>${alumno.nombre}</span>
                        <span>${alumno.apellido}</span>
                        <span class="email-col">${alumno.gmail}</span>
                        <span><button class="btn-mini">Editar</button></span>
                    </div>
                `;
            });
 
            html += `
                    </div>
                </div>
                <p class="db-note">📡 Datos cargados desde MySQL vía Flask.</p>
            `;
 
            display.innerHTML = html;
 
            const wrap = document.getElementById('scroll-wrap');

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
                <small style="color:#999;">Detalle: ${err.message}</small></p>
            `;
        });
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
                            <div class="motivo-item">
                                <div class="motivo-item-top">
                                    <span class="motivo-fecha">📅 ${m.fecha}</span>
                                    ${m.certificado
                                        ? `<a class="btn-cert" href="http://127.0.0.1:5000/uploads/certificados/${m.certificado}" target="_blank">📎 Ver certificado</a>`
                                        : '<span class="sin-cert">Sin certificado</span>'}
                                </div>
                                <p class="motivo-texto">${m.motivo}</p>
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

// ══════════════════════════════════════════
//  PESTAÑA DE EVIDENCIAS — dividido por curso
// ══════════════════════════════════════════
function cargarEvidenciasPrece() {
    const contenedor = document.getElementById('evidencias-prece-contenedor');
    if (!contenedor) return;

    const btnsEv = [1,2,3,4,5,6].map(n =>
        '<button class="btn-curso-mini" onclick="cargarEvidenciasCurso(' + n + ', this)">' + n + '° Año</button>'
    ).join('');
    contenedor.innerHTML =
        '<div class="selector-cursos-mini" id="selector-evidencias">' + btnsEv + '</div>' +
        '<div class="evidencias-resultado" id="evidencias-resultado">' +
        '<p class="instruccion">Seleccioná un curso para ver las evidencias</p></div>';
}

function cargarEvidenciasCurso(anio, btn) {
    // Marcar botón activo
    document.querySelectorAll('#selector-evidencias .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');

    const resultado = document.getElementById('evidencias-resultado');
    resultado.innerHTML = '<p class="instruccion" style="padding:0.5rem;">Cargando...</p>';

    fetch(`http://127.0.0.1:5000/prece/evidencias?anio=${anio}`)
        .then(r => r.json())
        .then(fotos => {
            if (!fotos.length) {
                resultado.innerHTML = `<p class="instruccion">No hay fotos de clase en ${anio}° año.</p>`;
                return;
            }
            resultado.innerHTML = `
                <div class="evidencias-prece-galeria">
                    ${fotos.map(f => `
                        <div class="ev-prece-carta" id="ev-carta-${f.id}">
                            <img src="http://127.0.0.1:5000/uploads/fotos/${f.archivo}"
                                 alt="${f.descripcion || 'Foto'}"
                                 class="ev-prece-img"
                                 onclick="abrirLightbox('http://127.0.0.1:5000/uploads/fotos/${f.archivo}', '${(f.descripcion || '').replace(/'/g, '&#39;')}', '${f.apellido}, ${f.nombre}', '${f.fecha}')">
                            <div class="ev-prece-info">
                                <span class="ev-prece-alumno">${f.apellido}, ${f.nombre}</span>
                                <span class="ev-prece-desc">${f.descripcion || 'Sin descripción'}</span>
                                <span class="ev-prece-fecha">${f.fecha}</span>
                                <button class="btn-eliminar-foto" onclick="eliminarFoto(${f.id}, '${f.archivo}', this)">🗑 Eliminar</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        })
        .catch(err => {
            resultado.innerHTML = `<p style="color:#ff4d4d;">❌ Error: ${err.message}</p>`;
        });
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
                    if (footer) footer.innerHTML = '<span class="aci-estado">✅ Anotado</span>';
                }
            }
        })
        .catch(() => {
            if (btn) { btn.disabled = false; btn.textContent = '✓ Marcar anotado'; }
        });
}

function eliminarFoto(id, archivo, btn) {
    if (!confirm(`¿Eliminás esta foto? Esta acción no se puede deshacer.`)) return;
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    fetch(`http://127.0.0.1:5000/prece/eliminar-foto/${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                const carta = document.getElementById(`ev-carta-${id}`);
                if (carta) {
                    carta.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    carta.style.opacity = '0';
                    carta.style.transform = 'scale(0.9)';
                    setTimeout(() => carta.remove(), 300);
                }
            } else {
                if (btn) { btn.disabled = false; btn.textContent = '🗑 Eliminar'; }
                alert('Error al eliminar: ' + (data.error || 'desconocido'));
            }
        })
        .catch(() => {
            if (btn) { btn.disabled = false; btn.textContent = '🗑 Eliminar'; }
        });
}

function cambiarPestania(pestania) {
    ['alumnos','avisos','motivos','evidencias','ingresos'].forEach(p => {
        document.getElementById(`tab-${p}`).classList.toggle('tab-activa', p === pestania);
        document.getElementById(`panel-${p}`).style.display = p === pestania ? 'block' : 'none';
    });
    if (pestania === 'motivos')    cargarMotivos();
    if (pestania === 'evidencias') cargarEvidenciasPrece();
    if (pestania === 'avisos')     iniciarPanelAvisos();
    if (pestania === 'ingresos')   iniciarPanelIngresos();
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

function verAvisosCurso(anio, btn) {
    document.querySelectorAll('#selector-ver-avisos .btn-curso-mini')
        .forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');

    const contenedor = document.getElementById('avisos-lista-contenedor');
    contenedor.innerHTML = '<p class="instruccion">Cargando...</p>';

    fetch(`http://127.0.0.1:5000/prece/avisos/${anio}`)
        .then(r => r.json())
        .then(avisos => {
            if (!avisos.length) {
                contenedor.innerHTML = `<p class="instruccion">No hay avisos en ${anio}° año.</p>`;
                return;
            }

            const pendientes = avisos.filter(av => !av.anotado);
            const anotados   = avisos.filter(av =>  av.anotado);

            const tarjeta = (av) => `
                <div class="aviso-card-item ${av.anotado ? 'aviso-card-anotado' : 'aviso-card-pendiente'}" id="aviso-prece-${av.id}">
                    <span class="aci-nombre">👤 ${av.apellido}, ${av.nombre}</span>
                    <span class="aci-fecha">📅 ${av.fecha}</span>
                    <span class="aci-hora">⏰ ${av.hora}</span>
                    <span class="aci-motivo">📝 ${av.motivo}</span>
                    <div class="aci-footer">
                        <span class="aci-estado">${av.anotado ? '✅ Anotado' : '⏳ Pendiente'}</span>
                        ${!av.anotado ? `<button class="btn-marcar-anotado" onclick="marcarAnotadoPrece(${av.id}, this)">✓ Marcar anotado</button>` : ''}
                    </div>
                </div>
            `;

            contenedor.innerHTML = `
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
            `;
        })
        .catch(err => {
            contenedor.innerHTML = `<p style="color:#ff4d4d;">❌ Error: ${err.message}</p>`;
        });
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
    const inp = document.getElementById('password-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') verificarPassword(); });
 
    if (sessionStorage.getItem('prece_auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('panel-screen').style.display  = 'block';
        cambiarPestania('alumnos');
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

            const horaEntrada = '07:30';
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

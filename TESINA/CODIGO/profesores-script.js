
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
        btn.innerHTML = '<img src="' + (isDark ? 'Modo_oscuro.png' : 'Modo_claro.png') + '" alt="cambiar modo">';

        btn.addEventListener('click', () => {
            const ahora = document.body.classList.toggle('dark-mode');
            localStorage.setItem('krono-dark', ahora ? '1' : '0');
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
//  CURSOR TRAIL — puntos que siguen al mouse (con guarda para mobile/touch)
// ══════════════════════════════════════════════
(function () {
    const esTactil = window.matchMedia('(hover: none)').matches || window.innerWidth < 768;
    if (esTactil) return;

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
//  KRONO — Profesores Script
// ══════════════════════════════════════════

const API_BASE = 'http://127.0.0.1:5000';

const MATERIAS_DISPONIBLES = [
    'Matemática', 'Lengua y Literatura', 'Historia', 'Geografía', 'Biología',
    'Física', 'Química', 'Inglés', 'Educación Física', 'Arte', 'Música',
    'Formación Ética y Ciudadana', 'Tecnología', 'Economía', 'Filosofía'
];

const CURSO_TEXTO_A_NUM = { '1ro': 1, '2do': 2, '3ro': 3, '4to': 4, '5to': 5, '6to': 6 };
const CURSO_NUM_A_TEXTO = { 1: '1° Año', 2: '2° Año', 3: '3° Año', 4: '4° Año', 5: '5° Año', 6: '6° Año' };

// Materias/cursos que dicta el profesor logueado (vienen de la BD al verificar el código)
function materiasDelProfesor() {
    const raw = sessionStorage.getItem('prof_materias') || '';
    return raw.split('/').map(m => m.trim()).filter(Boolean);
}
function cursosDelProfesor() {
    const raw = sessionStorage.getItem('prof_cursos') || '';
    return raw.split('-')
        .map(c => CURSO_TEXTO_A_NUM[c.trim().toLowerCase()])
        .filter(n => !!n);
}

let cursoActual = null;
let notasData = [];
let notaEditandoId = null;

// Estado del asistente de tarjetas
const TOTAL_PASOS = 6;
const NOTA_MIN_SIN_MOTIVOS = 7; // desde esta nota en adelante no se piden motivos
let wizPaso = 0;
let wizAlumnos = [];
let wizAlumnosSeleccionados = [];
let wizNotaSeleccionada = null;

// Estado del panel de notas por materia
let materiasDisponibles = [];
let materiaActual = null;
let trimestrePanel = '1er Trimestre';   // trimestre que muestra el panel (por defecto el 1ro)

// --- AUTENTICACIÓN (correo + nombre + código OTP por mail) ---

let loginEmailActual = null;

function solicitarCodigo() {
    const email  = document.getElementById('login-email').value.trim().toLowerCase();
    const nombre = document.getElementById('login-nombre').value.trim();
    const error  = document.getElementById('login-error');
    const btn    = document.getElementById('btn-solicitar-codigo');
    error.style.display = 'none';

    if (!email || !nombre) {
        error.textContent = 'Completá tu correo y tu nombre.';
        error.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    fetch(`${API_BASE}/profesores/solicitar-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre })
    })
        .then(r => r.json().then(body => ({ status: r.status, body })))
        .then(({ status, body }) => {
            btn.disabled = false;
            btn.textContent = 'Enviar código';
            if (status !== 200) {
                error.textContent = body.error || 'No se pudo enviar el código.';
                error.style.display = 'block';
                return;
            }
            loginEmailActual = email;
            document.getElementById('login-email-mostrado').textContent = email;
            document.getElementById('login-paso-datos').style.display = 'none';
            document.getElementById('login-paso-codigo').style.display = 'block';
            document.getElementById('login-subtitle').textContent = 'Revisá tu correo institucional';
            document.getElementById('login-codigo').value = '';
            document.getElementById('login-codigo').focus();
            if (body.codigo_dev) {
                console.warn('KRONO: no se pudo enviar el mail, código de emergencia:', body.codigo_dev);
            }
        })
        .catch(() => {
            btn.disabled = false;
            btn.textContent = 'Enviar código';
            error.textContent = 'Error de conexión con el servidor.';
            error.style.display = 'block';
        });
}

function verificarCodigo() {
    const codigo = document.getElementById('login-codigo').value.trim();
    const error  = document.getElementById('login-codigo-error');
    error.style.display = 'none';

    if (!codigo) {
        error.textContent = 'Ingresá el código que te llegó por mail.';
        error.style.display = 'block';
        return;
    }

    fetch(`${API_BASE}/profesores/verificar-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmailActual, codigo })
    })
        .then(r => r.json().then(body => ({ status: r.status, body })))
        .then(({ status, body }) => {
            if (status !== 200) {
                error.textContent = body.error || 'Código incorrecto.';
                error.style.display = 'block';
                return;
            }
            sessionStorage.setItem('prof_auth', 'true');
            sessionStorage.setItem('prof_email', body.gmail || loginEmailActual);
            sessionStorage.setItem('prof_nombre', `${body.nombre} ${body.apellido}`.trim());
            sessionStorage.setItem('prof_materias', body.materias || '');
            sessionStorage.setItem('prof_cursos', body.cursos || '');
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('panel-screen').style.display  = 'block';
            iniciarPanelProfesores();
            if (window.kronoTutorial) window.kronoTutorial.alIngresar();
        })
        .catch(() => {
            error.textContent = 'Error de conexión con el servidor.';
            error.style.display = 'block';
        });
}

function reenviarCodigo() {
    document.getElementById('login-paso-codigo').style.display = 'none';
    document.getElementById('login-paso-datos').style.display = 'block';
    document.getElementById('login-subtitle').textContent = 'Ingresá tu correo institucional y tu nombre completo';
    document.getElementById('login-error').style.display = 'none';
    solicitarCodigo();
}

function cerrarSesion() {
    sessionStorage.removeItem('prof_auth');
    sessionStorage.removeItem('prof_email');
    sessionStorage.removeItem('prof_nombre');
    sessionStorage.removeItem('prof_materias');
    sessionStorage.removeItem('prof_cursos');
    document.getElementById('panel-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('login-paso-codigo').style.display = 'none';
    document.getElementById('login-paso-datos').style.display = 'block';
    document.getElementById('login-subtitle').textContent = 'Ingresá tu correo institucional y tu nombre completo';
    document.getElementById('login-email').value = '';
    document.getElementById('login-nombre').value = '';
    document.getElementById('login-codigo').value = '';
}

// --- INICIO DEL PANEL: el asistente aparece apenas se ingresa ---

function iniciarPanelProfesores() {
    const nombreGuardado = sessionStorage.getItem('prof_nombre');
    if (nombreGuardado) document.getElementById('wiz-nombre').value = nombreGuardado;

    const saludo = document.getElementById('panel-saludo');
    if (saludo) {
        saludo.innerHTML = nombreGuardado
            ? `Hola, <strong>${escapeHtml(nombreGuardado)}</strong>`
            : '';
    }

    // Materia: solo las que dicta este profesor (si no hay datos cargados, se usa la lista general)
    const materiasProf = materiasDelProfesor();
    const listaMaterias = materiasProf.length ? materiasProf : MATERIAS_DISPONIBLES;
    const selectMateria = document.getElementById('wiz-materia');
    selectMateria.innerHTML = '<option value="">— Seleccioná una materia —</option>' +
        listaMaterias.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('') +
        '<option value="__otra__">Otra materia...</option>';

    // Curso: solo los que le corresponden a este profesor (si no hay datos, se muestran los 6)
    const cursosProf = cursosDelProfesor();
    const listaCursos = cursosProf.length ? cursosProf : [1, 2, 3, 4, 5, 6];
    const selectCurso = document.getElementById('wiz-curso');
    selectCurso.innerHTML = '<option value="">— Seleccioná un curso —</option>' +
        listaCursos.map(n => `<option value="${n}">${CURSO_NUM_A_TEXTO[n]}</option>`).join('');

    document.getElementById('notas-panel-materia').style.display = 'none';
    document.getElementById('wizard-wrap').style.display = 'block';
    wizPaso = 0;
    renderWizardProgress();
    actualizarWizardTrack();
}

// --- ASISTENTE DE TARJETAS ---

// Nota actualmente elegida en el paso 5 (grilla o decimal); null si todavía no hay.
function notaWizardActual() {
    const decimalVal = document.getElementById('wiz-nota-decimal').value;
    const n = decimalVal !== '' ? parseFloat(decimalVal) : wizNotaSeleccionada;
    return (n === null || n === undefined || isNaN(n)) ? null : n;
}

// Los motivos solo se piden cuando la nota es menor a 7.
function necesitaMotivosWizard() {
    const n = notaWizardActual();
    return n !== null && n < NOTA_MIN_SIN_MOTIVOS;
}

// Ajusta el botón del paso 5 y la cantidad de puntos según la nota elegida.
function actualizarFlujoNotaWizard() {
    const n = notaWizardActual();
    const btn = document.getElementById('wiz-btn-paso-nota');
    if (btn) btn.textContent = (n !== null && n >= NOTA_MIN_SIN_MOTIVOS) ? 'Cargar nota' : 'Siguiente →';
    renderWizardProgress();
}

function totalPasosWizard() {
    const n = notaWizardActual();
    return (n !== null && n >= NOTA_MIN_SIN_MOTIVOS) ? TOTAL_PASOS - 1 : TOTAL_PASOS;
}

function renderWizardProgress() {
    const cont = document.getElementById('wizard-progress');
    const total = totalPasosWizard();
    let puntos = '';
    for (let i = 0; i < total; i++) {
        puntos += `<span class="wizard-dot ${i === wizPaso ? 'activo' : ''}"></span>`;
    }
    cont.innerHTML = `${puntos}<span class="wizard-contador">${wizPaso + 1}/${total}</span>`;
}

let wizAnimando = false;

function actualizarWizardTrack(direccion) {
    renderWizardProgress();

    const steps = Array.from(document.querySelectorAll('#wizard-track .wizard-step'));
    const nuevoStep = steps.find(s => Number(s.dataset.step) === wizPaso);
    if (!nuevoStep) return;

    const stepAnterior = steps.find(s => s !== nuevoStep && s.classList.contains('wizard-step-activo'));

    const clasesAnim = [
        'wizard-sale-derecha', 'wizard-sale-izquierda',
        'wizard-entra-desde-izquierda', 'wizard-entra-desde-derecha'
    ];

    // Sin paso anterior visible (primera carga del wizard): mostrar directo, sin animación.
    if (!stepAnterior || !direccion) {
        steps.forEach(s => s.classList.remove('wizard-step-activo', ...clasesAnim));
        nuevoStep.classList.add('wizard-step-activo');
        return;
    }

    if (wizAnimando) return;
    wizAnimando = true;

    const claseSalida = direccion === 'atras' ? 'wizard-sale-izquierda' : 'wizard-sale-derecha';
    const claseEntrada = direccion === 'atras' ? 'wizard-entra-desde-derecha' : 'wizard-entra-desde-izquierda';

    stepAnterior.classList.remove(...clasesAnim);
    stepAnterior.classList.add(claseSalida);

    setTimeout(() => {
        stepAnterior.classList.remove('wizard-step-activo', claseSalida);

        nuevoStep.classList.remove(...clasesAnim);
        nuevoStep.classList.add('wizard-step-activo', claseEntrada);

        setTimeout(() => {
            nuevoStep.classList.remove(claseEntrada);
            wizAnimando = false;
        }, 360);
    }, 300);
}

function mostrarErrorWizard(paso, msg) {
    const el = document.getElementById(`wiz-error-${paso}`);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

function ocultarErrorWizard(paso) {
    const el = document.getElementById(`wiz-error-${paso}`);
    if (el) el.style.display = 'none';
}

function validarPasoWizard(paso) {
    ocultarErrorWizard(paso);
    if (paso === 0) {
        const nombre = document.getElementById('wiz-nombre').value.trim();
        if (!nombre) { mostrarErrorWizard(0, 'Escribí tu nombre para continuar.'); return false; }
        sessionStorage.setItem('prof_nombre', nombre);
        return true;
    }
    if (paso === 1) {
        const materiaSel = document.getElementById('wiz-materia').value;
        if (!materiaSel) { mostrarErrorWizard(1, 'Seleccioná una materia.'); return false; }
        if (materiaSel === '__otra__' && !document.getElementById('wiz-materia-otra').value.trim()) {
            mostrarErrorWizard(1, 'Escribí el nombre de la materia.'); return false;
        }
        return true;
    }
    if (paso === 2) {
        const curso = document.getElementById('wiz-curso').value;
        if (!curso) { mostrarErrorWizard(2, 'Seleccioná un curso.'); return false; }
        return true;
    }
    if (paso === 3) {
        if (!wizAlumnosSeleccionados.length) { mostrarErrorWizard(3, 'Elegí al menos un estudiante de la lista.'); return false; }
        return true;
    }
    if (paso === 4) {
        const decimalVal = document.getElementById('wiz-nota-decimal').value;
        const notaValor  = decimalVal !== '' ? parseFloat(decimalVal) : wizNotaSeleccionada;
        if (notaValor === null || notaValor === undefined || isNaN(notaValor)) {
            mostrarErrorWizard(4, 'Seleccioná una nota para continuar.'); return false;
        }
        if (notaValor < 1 || notaValor > 10) {
            mostrarErrorWizard(4, 'La nota debe ser un número entre 1 y 10.'); return false;
        }
        return true;
    }
    return true;
}

function obtenerMateriaWizard() {
    const sel = document.getElementById('wiz-materia').value;
    if (sel === '__otra__') return document.getElementById('wiz-materia-otra').value.trim();
    return sel;
}

function wizardSiguiente() {
    if (wizAnimando) return;
    if (!validarPasoWizard(wizPaso)) return;

    if (wizPaso === 1) {
        document.getElementById('wiz-materia-otra').style.display =
            document.getElementById('wiz-materia').value === '__otra__' ? 'block' : 'none';
    }
    if (wizPaso === 2) {
        const curso = parseInt(document.getElementById('wiz-curso').value, 10);
        cursoActual = curso;
        wizAlumnosSeleccionados = [];
        cargarAlumnosParaWizard(curso);
    }
    if (wizPaso === TOTAL_PASOS - 1) return; // último paso: se carga con cargarNotaWizard()
    if (wizPaso === 4 && !necesitaMotivosWizard()) { cargarNotaWizard(); return; } // nota >= 7: sin motivos

    wizPaso++;

    if (wizPaso === 4) construirGrillaNotas();

    actualizarWizardTrack('siguiente');
}

function wizardAtras() {
    if (wizAnimando) return;
    if (wizPaso === 0) return;
    wizPaso--;
    actualizarWizardTrack('atras');
}

// Materia: mostrar el input libre apenas se elige "Otra materia..."
document.addEventListener('change', e => {
    if (e.target && e.target.id === 'wiz-materia') {
        document.getElementById('wiz-materia-otra').style.display = e.target.value === '__otra__' ? 'block' : 'none';
    }
});

function cargarAlumnosParaWizard(anio) {
    const cont = document.getElementById('wiz-alumno-lista');
    cont.innerHTML = '<p class="instruccion">Cargando...</p>';
    fetch(`${API_BASE}/alumnos-lista/${anio}`)
        .then(r => r.json())
        .then(data => {
            wizAlumnos = Array.isArray(data) ? data : [];
            renderListaAlumnosWizard('');
        })
        .catch(() => { cont.innerHTML = '<p class="instruccion">No se pudo cargar la lista de alumnos.</p>'; });
}

function toggleAlumnoWizard(id, marcado) {
    id = Number(id);
    if (marcado) {
        if (!wizAlumnosSeleccionados.includes(id)) wizAlumnosSeleccionados.push(id);
    } else {
        wizAlumnosSeleccionados = wizAlumnosSeleccionados.filter(x => x !== id);
    }
    actualizarContadorAlumnosWizard();
}

function actualizarContadorAlumnosWizard() {
    const cont = document.getElementById('wiz-alumno-contador');
    if (!cont) return;
    const n = wizAlumnosSeleccionados.length;
    cont.textContent = n === 0 ? '' : n === 1 ? '1 estudiante seleccionado' : `${n} estudiantes seleccionados`;
}

function renderListaAlumnosWizard(filtro) {
    const cont = document.getElementById('wiz-alumno-lista');
    const f = (filtro || '').toLowerCase();
    const filtrados = wizAlumnos.filter(al =>
        `${al.apellido} ${al.nombre}`.toLowerCase().includes(f)
    );
    if (!filtrados.length) {
        cont.innerHTML = '<p class="instruccion">No se encontraron estudiantes.</p>';
        return;
    }
    cont.innerHTML = filtrados.map(al => `
        <label class="wizard-alumno-item ${wizAlumnosSeleccionados.includes(al.id_alumno) ? 'seleccionado' : ''}">
            <input type="checkbox" name="wiz-alumno-check" value="${al.id_alumno}"
                   ${wizAlumnosSeleccionados.includes(al.id_alumno) ? 'checked' : ''}
                   onchange="toggleAlumnoWizard(${al.id_alumno}, this.checked); renderListaAlumnosWizard(document.getElementById('wiz-alumno-buscar').value);">
            <span>${escapeHtml(al.apellido)}, ${escapeHtml(al.nombre)}</span>
        </label>
    `).join('');
    actualizarContadorAlumnosWizard();
}

document.addEventListener('input', e => {
    if (e.target && e.target.id === 'wiz-alumno-buscar') {
        renderListaAlumnosWizard(e.target.value);
    }
});

function construirGrillaNotas() {
    wizNotaSeleccionada = null;
    document.getElementById('wiz-nota-decimal').value = '';
    document.getElementById('wiz-nota-decimal').style.display = 'none';
    document.getElementById('wiz-decimal-toggle').textContent = 'Usar una nota con decimales';
    const grid = document.getElementById('wiz-nota-grid');
    let html = '';
    for (let n = 1; n <= 10; n++) {
        html += `<button type="button" class="wizard-nota-btn" onclick="seleccionarNotaWizard(${n}, this)">${n}</button>`;
    }
    grid.innerHTML = html;
    actualizarFlujoNotaWizard();
}

function seleccionarNotaWizard(valor, btn) {
    wizNotaSeleccionada = valor;
    document.getElementById('wiz-nota-decimal').value = '';
    document.querySelectorAll('.wizard-nota-btn').forEach(b => b.classList.remove('seleccionada'));
    if (btn) btn.classList.add('seleccionada');
    actualizarFlujoNotaWizard();
}

function mostrarNotaDecimal() {
    const input = document.getElementById('wiz-nota-decimal');
    const abrir = input.style.display === 'none';
    input.style.display = abrir ? 'block' : 'none';
    document.getElementById('wiz-decimal-toggle').textContent =
        abrir ? 'Usar la grilla de notas enteras' : 'Usar una nota con decimales';
    if (abrir) {
        wizNotaSeleccionada = null;
        document.querySelectorAll('.wizard-nota-btn').forEach(b => b.classList.remove('seleccionada'));
        input.focus();
    }
    actualizarFlujoNotaWizard();
}

// --- CARGAR NOTA (desde el asistente) ---

// Arma el texto de motivos: los tildados + el texto libre de "Otros".
function obtenerMotivosWizard() {
    const motivos = [];
    document.querySelectorAll('input[name="wiz-motivo"]:checked').forEach(cb => {
        if (cb.value !== '__otros__') motivos.push(cb.value);
    });
    if (document.getElementById('wiz-motivo-otros').checked) {
        const otro = document.getElementById('wiz-observacion').value.trim();
        if (otro) motivos.push(otro);
    }
    return motivos.join(' | ');
}

function cargarNotaWizard() {
    ocultarErrorWizard(4);
    ocultarErrorWizard(5);

    const materia     = obtenerMateriaWizard();
    const trimestre   = document.getElementById('wiz-trimestre').value;

    const decimalVal  = document.getElementById('wiz-nota-decimal').value;
    const notaValor   = decimalVal !== '' ? parseFloat(decimalVal) : wizNotaSeleccionada;
    const conMotivos  = notaValor !== null && notaValor !== undefined && notaValor < NOTA_MIN_SIN_MOTIVOS;
    const observacion = conMotivos ? obtenerMotivosWizard() : '';
    // Si la nota es >= 7 se envía desde el paso 5, así que los errores se muestran ahí.
    const pasoError    = conMotivos ? 5 : 4;

    if (!wizAlumnosSeleccionados.length || !materia || notaValor === null || notaValor === undefined || isNaN(notaValor)) {
        mostrarErrorWizard(pasoError, 'Faltan datos: volvé atrás y seleccioná una nota.');
        return;
    }
    if (notaValor < 1 || notaValor > 10) {
        mostrarErrorWizard(pasoError, 'La nota debe ser un número entre 1 y 10.');
        return;
    }
    if (conMotivos && document.getElementById('wiz-motivo-otros').checked && !document.getElementById('wiz-observacion').value.trim()) {
        mostrarErrorWizard(pasoError, 'Escribí el motivo específico o destildá "Otros".');
        return;
    }

    const pedidos = wizAlumnosSeleccionados.map(id_alumno =>
        fetch(`${API_BASE}/profesores/notas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_alumno, materia, trimestre, nota: notaValor, observacion, gmail: sessionStorage.getItem('prof_email') || '' })
        }).then(r => r.json().then(body => ({ status: r.status, body })))
    );

    Promise.all(pedidos).then(resultados => {
        const fallidos = resultados.filter(r => r.status !== 201);
        if (fallidos.length === resultados.length) {
            mostrarErrorWizard(pasoError, fallidos[0]?.body?.error || 'No se pudo cargar la nota.');
            return;
        }
        if (fallidos.length) {
            mostrarErrorWizard(pasoError, `Se cargó para ${resultados.length - fallidos.length} de ${resultados.length} estudiantes. Algunos fallaron.`);
        }
        materiaActual = materia;
        trimestrePanel = trimestre;   // el panel abre en el trimestre donde se cargó la nota
        mostrarPanelNotasMateria(cursoActual);
    }).catch(() => mostrarErrorWizard(pasoError, 'Error de conexión con el servidor.'));
}

// --- CARGAR RECUPERATORIO (R1 / R2) desde la tarjeta 5 ---
// La nota elegida en la tarjeta 5 se guarda como R1 o R2 de la nota que el
// estudiante ya tiene en esa materia y trimestre (así sale en la columna R1/R2 del Excel).
function cargarRecuperatorioWizard(numero) {
    ocultarErrorWizard(4);

    const materia   = obtenerMateriaWizard();
    const trimestre = document.getElementById('wiz-trimestre').value;
    const notaValor = notaWizardActual();

    if (notaValor === null) {
        mostrarErrorWizard(4, 'Primero seleccioná la nota del recuperatorio.');
        return;
    }
    if (notaValor < 1 || notaValor > 10) {
        mostrarErrorWizard(4, 'La nota debe ser un número entre 1 y 10.');
        return;
    }
    if (!wizAlumnosSeleccionados.length || !materia) {
        mostrarErrorWizard(4, 'Faltan datos: volvé atrás y revisá la materia y los estudiantes.');
        return;
    }

    const botones = document.querySelectorAll('.btn-recu');
    botones.forEach(b => { b.disabled = true; });

    const pedidos = wizAlumnosSeleccionados.map(id_alumno =>
        fetch(`${API_BASE}/profesores/recuperatorio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_alumno, materia, trimestre, numero, nota: notaValor })
        }).then(r => r.json().catch(() => ({})).then(body => ({ status: r.status, body, id_alumno })))
    );

    Promise.all(pedidos).then(resultados => {
        botones.forEach(b => { b.disabled = false; });
        const fallidos = resultados.filter(r => r.status !== 200);

        if (!fallidos.length) {
            materiaActual = materia;
            trimestrePanel = trimestre;   // el panel abre en el trimestre donde se cargó el recuperatorio
            mostrarPanelNotasMateria(cursoActual);
            return;
        }

        // Quedan seleccionados solo los que fallaron, para poder corregir y reintentar.
        wizAlumnosSeleccionados = fallidos.map(f => f.id_alumno);
        renderListaAlumnosWizard(document.getElementById('wiz-alumno-buscar').value);
        const nombres = fallidos.map(f => {
            const al = wizAlumnos.find(a => a.id_alumno === f.id_alumno);
            return al ? `${al.apellido}, ${al.nombre}` : `#${f.id_alumno}`;
        }).join(' · ');
        const motivo = fallidos[0].body?.error || 'No se pudo cargar el recuperatorio.';
        const cargados = resultados.length - fallidos.length;
        mostrarErrorWizard(4, cargados
            ? `R${numero} cargado para ${cargados} de ${resultados.length}. ${motivo} (${nombres})`
            : `${motivo} (${nombres})`);
    }).catch(() => {
        botones.forEach(b => { b.disabled = false; });
        mostrarErrorWizard(4, 'Error de conexión con el servidor.');
    });
}

function saltarWizard() {
    const cursosProf = cursosDelProfesor();
    const curso = cursoActual || cursosProf[0] || 1;
    cursoActual = curso;
    materiaActual = null;
    mostrarPanelNotasMateria(curso);
}

function mostrarWizardDeNuevo() {
    document.getElementById('notas-panel-materia').style.display = 'none';
    document.getElementById('wizard-wrap').style.display = 'block';
    wizPaso = 0;
    wizAlumnosSeleccionados = [];
    document.getElementById('wiz-materia').value = '';
    document.getElementById('wiz-materia-otra').style.display = 'none';
    document.getElementById('wiz-materia-otra').value = '';
    document.getElementById('wiz-curso').value = cursoActual || '';
    document.getElementById('wiz-observacion').value = '';
    document.getElementById('wiz-observacion').style.display = 'none';
    document.querySelectorAll('input[name="wiz-motivo"]').forEach(cb => {
        cb.checked = false;
        cb.closest('.wizard-alumno-item').classList.remove('seleccionado');
    });
    document.getElementById('wiz-alumno-buscar').value = '';
    wizNotaSeleccionada = null;
    document.getElementById('wiz-nota-decimal').value = '';
    actualizarFlujoNotaWizard();
    actualizarWizardTrack();
}

// --- PANEL DE NOTAS POR MATERIA ---

function mostrarPanelNotasMateria(anio) {
    document.getElementById('wizard-wrap').style.display = 'none';
    document.getElementById('notas-panel-materia').style.display = 'block';
    document.getElementById('curso-panel-label').textContent = anio + '° Año';
    cargarNotasCurso(anio);
}

function cargarNotasCurso(anio) {
    const cont = document.getElementById('tabla-notas-contenedor');
    cont.innerHTML = '<p class="instruccion">Cargando...</p>';
    fetch(`${API_BASE}/profesores/notas/${anio}`)
        .then(r => r.json())
        .then(data => {
            const todasLasNotas = Array.isArray(data) ? data : [];
            const materiasProf = materiasDelProfesor();

            // Si el profesor tiene materias asignadas, solo ve sus propias materias
            // (no las de otros profesores que dan clase en el mismo curso).
            notasData = materiasProf.length
                ? todasLasNotas.filter(n => materiasProf.includes(n.materia))
                : todasLasNotas;

            materiasDisponibles = [...new Set(notasData.map(n => n.materia))].sort((a, b) => a.localeCompare(b));
            if (!materiaActual || !materiasDisponibles.includes(materiaActual)) {
                materiaActual = materiasDisponibles[0] || null;
            }
            renderPanelMateria();
        })
        .catch(() => {
            cont.innerHTML = '<p class="instruccion">No se pudieron cargar las notas.</p>';
        });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Nota de recuperatorio k (1 o 2) de una fila de notas: número, o null si no está cargada.
function recuDe(n, k) {
    const v = n[`r${k}_nota`];
    if (v === null || v === undefined || v === '') return null;
    const x = parseFloat(v);
    return isNaN(x) ? null : x;
}

// Marca como activa la pestaña del trimestre elegido
function actualizarTabsTrimestre() {
    document.querySelectorAll('#trimestre-tabs .trimestre-tab').forEach(btn => {
        const activo = btn.dataset.trimestre === trimestrePanel;
        btn.classList.toggle('activo', activo);
        btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
}

function seleccionarTrimestrePanel(trimestre) {
    trimestrePanel = trimestre;
    renderPanelMateria();
}

function renderPanelMateria() {
    const cont = document.getElementById('tabla-notas-contenedor');
    const tituloMateria = document.getElementById('materia-actual-nombre');
    actualizarTabsTrimestre();

    if (!materiasDisponibles.length) {
        tituloMateria.textContent = 'Sin notas';
        cont.innerHTML = '<p class="instruccion">Todavía no hay notas cargadas para este curso.</p>';
        return;
    }

    tituloMateria.textContent = materiaActual;

    const filas = notasData
        .filter(n => n.materia === materiaActual && n.trimestre === trimestrePanel)
        .sort((a, b) => (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre));

    if (!filas.length) {
        cont.innerHTML = `<p class="instruccion">Sin notas cargadas en el ${escapeHtml(trimestrePanel)} de esta materia.</p>`;
        return;
    }

    cont.innerHTML = `
        <table class="tabla-notas">
            <thead>
                <tr><th>Estudiante</th><th>Nota</th><th>Recuperatorios</th><th></th></tr>
            </thead>
            <tbody>
                ${filas.map(n => {
                    const notaNum = parseFloat(n.nota);
                    const badgeClass = notaNum < 6 ? 'nota-badge nota-baja' : 'nota-badge';
                    const r1 = recuDe(n, 1), r2 = recuDe(n, 2);
                    const chipRecu = (etq, v) => v === null
                        ? `<span class="recu-chip recu-vacio">${etq} —</span>`
                        : `<span class="recu-chip">${etq} <span class="${v < 6 ? 'nota-badge nota-baja' : 'nota-badge'}">${v.toFixed(2)}</span></span>`;
                    const recuCelda = `
                        <div class="recu-celda">${chipRecu('R1', r1)}${chipRecu('R2', r2)}</div>
                        <button class="btn-editar-nota" style="margin-top:6px;" onclick="abrirRecuperatorio(${n.id})">${(r1 !== null || r2 !== null) ? 'Editar' : '+ Cargar recuperatorio'}</button>
                    `;
                    return `
                        <tr>
                            <td>
                                <span class="nota-alumno">${escapeHtml(n.apellido)}, ${escapeHtml(n.nombre)}</span>
                                ${n.observacion ? `<div class="nota-observacion">"${escapeHtml(n.observacion)}"</div>` : ''}
                            </td>
                            <td><span class="${badgeClass}">${notaNum.toFixed(2)}</span></td>
                            <td class="nota-detalle">${recuCelda}</td>
                            <td class="nota-item-footer">
                                <button class="btn-editar-nota" onclick="abrirEdicionNota(${n.id})">Editar</button>
                                <button class="btn-eliminar-nota" onclick="eliminarNota(${n.id}, this)">Eliminar</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function materiaAnterior() {
    if (!materiasDisponibles.length) return;
    let i = materiasDisponibles.indexOf(materiaActual);
    i = (i - 1 + materiasDisponibles.length) % materiasDisponibles.length;
    materiaActual = materiasDisponibles[i];
    renderPanelMateria();
}

function materiaSiguiente() {
    if (!materiasDisponibles.length) return;
    let i = materiasDisponibles.indexOf(materiaActual);
    i = (i + 1) % materiasDisponibles.length;
    materiaActual = materiasDisponibles[i];
    renderPanelMateria();
}

function cursoPanelAnterior() {
    const cursosProf = cursosDelProfesor();
    const lista = cursosProf.length ? cursosProf : [1, 2, 3, 4, 5, 6];
    let i = lista.indexOf(cursoActual);
    i = i === -1 ? 0 : (i - 1 + lista.length) % lista.length;
    materiaActual = null;
    mostrarPanelNotasMateria(lista[i]);
}

function cursoPanelSiguiente() {
    const cursosProf = cursosDelProfesor();
    const lista = cursosProf.length ? cursosProf : [1, 2, 3, 4, 5, 6];
    let i = lista.indexOf(cursoActual);
    i = i === -1 ? 0 : (i + 1) % lista.length;
    materiaActual = null;
    mostrarPanelNotasMateria(lista[i]);
}

// --- EDITAR NOTA ---

// Motivos del modal de edición (misma lista que el asistente; solo si la nota es < 7)
const MOTIVOS_PREDETERMINADOS = [
    'Falta de estudio / compromiso',
    'Dificultades en la comprensión',
    'Inasistencias',
    'Problemas personales / familiares',
    'Trabajo grupal / cuaderno incompleto'
];

function cargarMotivosEdicion(observacion) {
    const partes = (observacion || '').split(' | ').map(s => s.trim()).filter(Boolean);
    const otros = [];
    partes.forEach(p => { if (!MOTIVOS_PREDETERMINADOS.includes(p)) otros.push(p); });

    document.querySelectorAll('input[name="edit-motivo"]').forEach(cb => {
        if (cb.value === '__otros__') cb.checked = otros.length > 0;
        else cb.checked = partes.includes(cb.value);
        cb.closest('.wizard-alumno-item').classList.toggle('seleccionado', cb.checked);
    });
    const ta = document.getElementById('edit-nota-observacion');
    ta.value = otros.join(' | ');
    ta.style.display = otros.length ? 'block' : 'none';
}

function obtenerMotivosEdicion() {
    const motivos = [];
    document.querySelectorAll('input[name="edit-motivo"]:checked').forEach(cb => {
        if (cb.value !== '__otros__') motivos.push(cb.value);
    });
    if (document.getElementById('edit-motivo-otros').checked) {
        const otro = document.getElementById('edit-nota-observacion').value.trim();
        if (otro) motivos.push(otro);
    }
    return motivos.join(' | ');
}

// Muestra la lista de motivos solo si la nota escrita es menor a 7.
function actualizarMotivosEdicion() {
    const v = parseFloat(document.getElementById('edit-nota-valor').value);
    const mostrar = !isNaN(v) && v < NOTA_MIN_SIN_MOTIVOS;
    document.getElementById('edit-motivos-campo').style.display = mostrar ? 'block' : 'none';
}

document.addEventListener('input', e => {
    if (e.target && e.target.id === 'edit-nota-valor') actualizarMotivosEdicion();
});
document.addEventListener('change', e => {
    if (!e.target || e.target.name !== 'edit-motivo') return;
    e.target.closest('.wizard-alumno-item').classList.toggle('seleccionado', e.target.checked);
    if (e.target.id === 'edit-motivo-otros') {
        const ta = document.getElementById('edit-nota-observacion');
        ta.style.display = e.target.checked ? 'block' : 'none';
        if (e.target.checked) ta.focus();
    }
});

function abrirEdicionNota(id) {
    const nota = notasData.find(n => n.id === id);
    if (!nota) return;
    notaEditandoId = id;

    document.getElementById('edit-nota-alumno-nombre').textContent = `${nota.apellido}, ${nota.nombre}`;
    document.getElementById('edit-nota-materia').value = nota.materia;
    document.getElementById('edit-nota-trimestre').value = nota.trimestre;
    document.getElementById('edit-nota-valor').value = nota.nota;
    cargarMotivosEdicion(nota.observacion);
    actualizarMotivosEdicion();
    document.getElementById('edit-nota-error').style.display = 'none';

    document.getElementById('nota-modal-overlay').style.display = 'flex';
}

function cerrarNotaModal() {
    document.getElementById('nota-modal-overlay').style.display = 'none';
    notaEditandoId = null;
}

function guardarEdicionNota() {
    if (!notaEditandoId) return;
    const error = document.getElementById('edit-nota-error');
    error.style.display = 'none';

    const materia     = document.getElementById('edit-nota-materia').value.trim();
    const trimestre   = document.getElementById('edit-nota-trimestre').value;
    const notaValor   = document.getElementById('edit-nota-valor').value;

    if (!materia || !notaValor) {
        error.textContent = 'Completá materia y nota.';
        error.style.display = 'block';
        return;
    }
    const notaNum = parseFloat(notaValor);
    if (isNaN(notaNum) || notaNum < 1 || notaNum > 10) {
        error.textContent = 'La nota debe ser un número entre 1 y 10.';
        error.style.display = 'block';
        return;
    }

    // Motivos solo para notas menores a 7; con 7 o más no se guarda observación.
    const conMotivos = notaNum < NOTA_MIN_SIN_MOTIVOS;
    if (conMotivos && document.getElementById('edit-motivo-otros').checked &&
        !document.getElementById('edit-nota-observacion').value.trim()) {
        error.textContent = 'Escribí el motivo específico o destildá "Otros".';
        error.style.display = 'block';
        return;
    }
    const observacion = conMotivos ? obtenerMotivosEdicion() : '';

    fetch(`${API_BASE}/profesores/notas/${notaEditandoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materia, trimestre, nota: notaNum, observacion })
    })
        .then(r => r.json().then(body => ({ status: r.status, body })))
        .then(({ status, body }) => {
            if (status !== 200) {
                error.textContent = body.error || 'No se pudo guardar la edición.';
                error.style.display = 'block';
                return;
            }
            cerrarNotaModal();
            materiaActual = materia;
            cargarNotasCurso(cursoActual);
        })
        .catch(() => {
            error.textContent = 'Error de conexión con el servidor.';
            error.style.display = 'block';
        });
}

// --- ELIMINAR NOTA ---

function eliminarNota(id, btn) {
    if (!confirm('¿Eliminar esta nota?')) return;
    if (btn) btn.disabled = true;
    fetch(`${API_BASE}/profesores/eliminar-nota/${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(() => cargarNotasCurso(cursoActual))
        .catch(() => {
            if (btn) btn.disabled = false;
            alert('No se pudo eliminar la nota.');
        });
}

// --- RECUPERATORIOS (R1 / R2) ---

function abrirRecuperatorio(notaId) {
    const nota = notasData.find(n => n.id === notaId);
    if (!nota) return;
    notaEditandoId = notaId;

    document.getElementById('recu-modal-alumno-nombre').textContent = `${nota.apellido}, ${nota.nombre}`;
    document.getElementById('recu-modal-detalle').textContent = `${nota.materia} · ${nota.trimestre}`;
    const r1 = recuDe(nota, 1), r2 = recuDe(nota, 2);
    document.getElementById('recu-r1').value = r1 === null ? '' : r1;
    document.getElementById('recu-r2').value = r2 === null ? '' : r2;
    document.getElementById('recu-modal-error').style.display = 'none';

    document.getElementById('recu-modal-overlay').style.display = 'flex';
}

function cerrarRecuModal() {
    document.getElementById('recu-modal-overlay').style.display = 'none';
    notaEditandoId = null;
}

function guardarRecuperatorio() {
    if (!notaEditandoId) return;
    const error = document.getElementById('recu-modal-error');
    error.style.display = 'none';

    const leer = id => {
        const txt = document.getElementById(id).value.trim();
        return txt === '' ? null : parseFloat(txt);
    };
    const r1 = leer('recu-r1');
    const r2 = leer('recu-r2');

    const invalido = v => v !== null && (isNaN(v) || v < 1 || v > 10);
    if (invalido(r1) || invalido(r2)) {
        error.textContent = 'Las notas deben ser números entre 1 y 10.';
        error.style.display = 'block';
        return;
    }

    fetch(`${API_BASE}/profesores/notas/${notaEditandoId}/recuperatorios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r1, r2 })
    })
        .then(r => r.json().catch(() => ({})).then(body => ({ status: r.status, body })))
        .then(({ status, body }) => {
            if (status !== 200) {
                error.textContent = body.error || 'No se pudieron guardar los recuperatorios.';
                error.style.display = 'block';
                return;
            }
            cerrarRecuModal();
            cargarNotasCurso(cursoActual);
        })
        .catch(() => {
            error.textContent = 'Error de conexión con el servidor.';
            error.style.display = 'block';
        });
}


// ══════════════════════════════════════════
//  DESCARGAR LIBRETA (Excel)
//  Una hoja por curso + materia:
//      fila 1:  Trimestre 1 | Trimestre 2 | ...   (cada uno ocupa 3 columnas)
//      fila 2:  Alumno | Nota | R1 | R2 | Nota | R1 | R2 | ...
// ══════════════════════════════════════════

const TRIMESTRES_LIBRETA = [
    { valor: '1er Trimestre', numero: 1 },
    { valor: '2do Trimestre', numero: 2 },
    { valor: '3er Trimestre', numero: 3 },
    { valor: '4to Trimestre', numero: 4 }
];

function abrirLibretaModal() {
    const trims = document.getElementById('libreta-trimestres');
    trims.innerHTML = TRIMESTRES_LIBRETA.map(t => `
        <label class="wizard-alumno-item">
            <input type="checkbox" name="libreta-trimestre" value="${t.valor}">
            <span>${t.valor}</span>
        </label>
    `).join('') + `
        <label class="wizard-alumno-item">
            <input type="checkbox" id="libreta-trimestre-todos">
            <span>Los cuatro trimestres</span>
        </label>
    `;
    // "Los cuatro trimestres" marca/desmarca todos; y se mantiene sincronizado con los individuales
    const chkTodos = document.getElementById('libreta-trimestre-todos');
    const chkTrims = () => Array.from(document.querySelectorAll('input[name="libreta-trimestre"]'));
    chkTodos.addEventListener('change', () => chkTrims().forEach(c => { c.checked = chkTodos.checked; }));
    chkTrims().forEach(c => c.addEventListener('change', () => {
        chkTodos.checked = chkTrims().every(x => x.checked);
    }));

    // Materias que dicta el profesor (si no hay datos cargados, no se filtra por materia)
    const materiasProfesor = materiasDelProfesor();
    const campoMaterias = document.getElementById('libreta-materias-campo');
    campoMaterias.style.display = materiasProfesor.length ? 'flex' : 'none';
    document.getElementById('libreta-materias-label').textContent = materiasProfesor.length > 1 ? '¿Qué materias?' : 'Materia';
    document.getElementById('libreta-materias').innerHTML = materiasProfesor.map(m => `
        <label class="wizard-alumno-item">
            <input type="checkbox" name="libreta-materia" value="${escapeHtml(m)}" checked>
            <span>${escapeHtml(m)}</span>
        </label>
    `).join('');

    const cursosProf = cursosDelProfesor();
    const cursos = cursosProf.length ? cursosProf : [1, 2, 3, 4, 5, 6];
    document.getElementById('libreta-anios-label').textContent = cursos.length > 1 ? '¿Qué años?' : 'Año';
    document.getElementById('libreta-anios').innerHTML = cursos.map(n => `
        <label class="wizard-alumno-item">
            <input type="checkbox" name="libreta-anio" value="${n}" checked>
            <span>${CURSO_NUM_A_TEXTO[n]}</span>
        </label>
    `).join('');

    document.getElementById('libreta-error').style.display = 'none';
    const btn = document.getElementById('btn-libreta-descargar');
    btn.disabled = false;
    btn.textContent = 'Descargar Excel';
    document.getElementById('libreta-modal-overlay').style.display = 'flex';
}

function cerrarLibretaModal() {
    const ov = document.getElementById('libreta-modal-overlay');
    if (ov) ov.style.display = 'none';
}

function errorLibreta(msg) {
    const el = document.getElementById('libreta-error');
    el.textContent = msg;
    el.style.display = 'block';
}

function descargarLibreta() {
    document.getElementById('libreta-error').style.display = 'none';

    const trimsElegidos = Array.from(document.querySelectorAll('input[name="libreta-trimestre"]:checked'))
        .map(i => i.value);
    if (!trimsElegidos.length) { errorLibreta('Elegí al menos un trimestre.'); return; }
    const anios = Array.from(document.querySelectorAll('input[name="libreta-anio"]:checked'))
        .map(i => parseInt(i.value, 10));
    if (!anios.length) { errorLibreta('Elegí al menos un año.'); return; }
    const materiasElegidas = Array.from(document.querySelectorAll('input[name="libreta-materia"]:checked'))
        .map(i => i.value);
    if (materiasDelProfesor().length && !materiasElegidas.length) {
        errorLibreta('Elegí al menos una materia.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        errorLibreta('No se pudo cargar la librería de Excel. Revisá tu conexión y recargá la página.');
        return;
    }

    // Se respeta el orden 1° → 4° sin importar en qué orden se tildaron
    const trimestres = TRIMESTRES_LIBRETA.filter(t => trimsElegidos.includes(t.valor));

    const btn = document.getElementById('btn-libreta-descargar');
    btn.disabled = true;
    btn.textContent = 'Generando...';

    const materiasProf = materiasElegidas;

    // Para cada año: lista de alumnos del curso + todas las notas del curso
    Promise.all(anios.map(anio =>
        Promise.all([
            fetch(`${API_BASE}/alumnos-lista/${anio}`).then(r => r.json()),
            fetch(`${API_BASE}/profesores/notas/${anio}`).then(r => r.json())
        ]).then(([alumnos, notas]) => ({
            anio,
            alumnos: Array.isArray(alumnos) ? alumnos : [],
            notas: (Array.isArray(notas) ? notas : [])
                .filter(n => !materiasProf.length || materiasProf.includes(n.materia))
        }))
    ))
        .then(datos => {
            const wb = XLSX.utils.book_new();
            const nombresUsados = new Set();

            datos.forEach(({ anio, alumnos, notas }) => {
                let materias = [...new Set(notas.map(n => n.materia))].sort((a, b) => a.localeCompare(b));
                if (!materias.length) materias = materiasProf.length ? materiasProf : [''];

                materias.forEach(materia => {
                    const { filas, merges } = armarFilasLibreta(alumnos, notas, materia, trimestres);
                    const ws = XLSX.utils.aoa_to_sheet(filas);
                    ws['!merges'] = merges;
                    ws['!cols'] = filas[1].map((_, i) => ({ wch: i === 0 ? 30 : 9 }));

                    const base = limpiarNombreHoja(`${anio}° ${materia}`.trim(), 31);
                    let nombre = base, k = 2;
                    while (nombresUsados.has(nombre.toLowerCase())) {
                        const suf = ` (${k++})`;
                        nombre = base.slice(0, 31 - suf.length) + suf;
                    }
                    nombresUsados.add(nombre.toLowerCase());
                    XLSX.utils.book_append_sheet(wb, ws, nombre);
                });
            });

            if (!wb.SheetNames.length) {
                errorLibreta('No hay datos para descargar.');
                btn.disabled = false; btn.textContent = 'Descargar Excel';
                return;
            }

            const etiqueta = trimestres.length === TRIMESTRES_LIBRETA.length
                ? 'Todos-los-trimestres'
                : trimestres.length > 1
                    ? trimestres.map(t => t.numero + '°').join('-') + '-Trimestres'
                    : trimestres[0].valor.replace(/\s+/g, '-');
            XLSX.writeFile(wb, `Libreta_${etiqueta}.xlsx`);
            cerrarLibretaModal();
        })
        .catch(() => {
            errorLibreta('No se pudieron obtener los datos del servidor.');
            btn.disabled = false;
            btn.textContent = 'Descargar Excel';
        });
}

function limpiarNombreHoja(txt, max) {
    return txt.replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function claveAlumno(apellido, nombre) {
    return `${apellido}|${nombre}`.trim().toLowerCase();
}

// Arma la hoja de una materia: dos filas de encabezado (Trimestre N / Alumno, Nota, R1, R2...)
// y una fila por alumno. Devuelve { filas, merges } para XLSX.utils.aoa_to_sheet.
function armarFilasLibreta(alumnos, notas, materia, trimestres) {
    // Alumnos del curso (aunque todavía no tengan notas) + los que aparezcan en las notas
    const mapa = new Map();
    alumnos.forEach(a => mapa.set(claveAlumno(a.apellido, a.nombre), { apellido: a.apellido, nombre: a.nombre }));
    notas.forEach(n => {
        const k = claveAlumno(n.apellido, n.nombre);
        if (!mapa.has(k)) mapa.set(k, { apellido: n.apellido, nombre: n.nombre });
    });

    // Notas de esta materia agrupadas por alumno + trimestre (ordenadas por id: la última es la vigente)
    const grupos = new Map();
    notas.filter(n => n.materia === materia).forEach(n => {
        const k = `${claveAlumno(n.apellido, n.nombre)}#${n.trimestre}`;
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k).push(n);
    });
    grupos.forEach(arr => arr.sort((a, b) => a.id - b.id));

    const num = v => {
        if (v === null || v === undefined || v === '') return null;
        const x = parseFloat(v);
        return isNaN(x) ? null : Math.round(x * 100) / 100;
    };
    // Último valor cargado (no vacío) de una columna dentro del grupo
    const ultimo = (arr, campo) => {
        for (let i = arr.length - 1; i >= 0; i--) {
            const v = num(arr[i][campo]);
            if (v !== null) return v;
        }
        return null;
    };

    const fila1 = [null];
    const fila2 = ['Alumno'];
    const merges = [];
    trimestres.forEach((t, i) => {
        fila1.push(`Trimestre ${t.numero}`, null, null);
        fila2.push('Nota', 'R1', 'R2');
        merges.push({ s: { r: 0, c: 1 + i * 3 }, e: { r: 0, c: 3 + i * 3 } });
    });

    const alumnosOrdenados = Array.from(mapa.entries())
        .sort((a, b) => `${a[1].apellido} ${a[1].nombre}`.localeCompare(`${b[1].apellido} ${b[1].nombre}`, 'es'));

    const filas = alumnosOrdenados.map(([k, al]) => {
        const fila = [`${al.apellido} ${al.nombre}`.trim()];
        trimestres.forEach(t => {
            const g = grupos.get(`${k}#${t.valor}`) || [];
            fila.push(ultimo(g, 'nota'), ultimo(g, 'r1_nota'), ultimo(g, 'r2_nota'));
        });
        return fila;
    });

    return { filas: [fila1, fila2, ...filas], merges };
}

// Cerrar modales con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cerrarNotaModal(); cerrarRecuModal(); cerrarLibretaModal(); }
});

// --- INIT ---

document.addEventListener('DOMContentLoaded', () => {
    const inpEmail   = document.getElementById('login-email');
    const inpNombre  = document.getElementById('login-nombre');
    const inpCodigo  = document.getElementById('login-codigo');
    const btnEnviar  = document.getElementById('btn-solicitar-codigo');
    const btnVerif   = document.getElementById('btn-verificar-codigo');
    const btnReenv   = document.getElementById('btn-reenviar-codigo');

    if (inpEmail && inpNombre) {
        [inpEmail, inpNombre].forEach(el => {
            el.addEventListener('keydown', e => { if (e.key === 'Enter') solicitarCodigo(); });
        });
    }
    if (btnEnviar) btnEnviar.addEventListener('click', solicitarCodigo);

    if (inpCodigo) {
        inpCodigo.addEventListener('keydown', e => { if (e.key === 'Enter') verificarCodigo(); });
    }
    if (btnVerif) btnVerif.addEventListener('click', verificarCodigo);
    if (btnReenv) btnReenv.addEventListener('click', reenviarCodigo);

    if (sessionStorage.getItem('prof_auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('panel-screen').style.display  = 'block';
        // Siempre se vuelve a leer el perfil (materias/cursos) de la BD al entrar
        refrescarPerfilProfesor().finally(iniciarPanelProfesores);
    }
});

// Trae de la BD las materias/cursos actuales del profesor (evita usar datos viejos de la sesión)
function refrescarPerfilProfesor() {
    const email = sessionStorage.getItem('prof_email');
    if (!email) return Promise.resolve();
    return fetch(`${API_BASE}/profesores/perfil?gmail=${encodeURIComponent(email)}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(p => {
            if (!p) return;
            sessionStorage.setItem('prof_nombre', `${p.nombre} ${p.apellido}`.trim());
            sessionStorage.setItem('prof_materias', p.materias || '');
            sessionStorage.setItem('prof_cursos', p.cursos || '');
        })
        .catch(() => {});
}

// Si el navegador restaura la página desde la caché (botón "atrás"), se recargan los datos
window.addEventListener('pageshow', e => {
    if (e.persisted && sessionStorage.getItem('prof_auth') === 'true') location.reload();
});


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


// Motivos: resaltar los tildados y mostrar el campo de texto al elegir "Otros"
document.addEventListener('change', e => {
    if (!e.target || e.target.name !== 'wiz-motivo') return;
    e.target.closest('.wizard-alumno-item').classList.toggle('seleccionado', e.target.checked);
    if (e.target.id === 'wiz-motivo-otros') {
        const ta = document.getElementById('wiz-observacion');
        ta.style.display = e.target.checked ? 'block' : 'none';
        if (e.target.checked) ta.focus();
    }
});

// Nota con decimales: actualizar el botón/puntos del paso 5 mientras se escribe
document.addEventListener('input', e => {
    if (e.target && e.target.id === 'wiz-nota-decimal') actualizarFlujoNotaWizard();
});


// ══════════════════════════════════════════════
//  TUTORIAL GUIADO — recorrido paso a paso
//  Oscurece y desenfoca todo menos lo que se explica.
//  Se muestra solo la primera vez, se puede omitir y
//  se vuelve a abrir con el botón "?" de la barra.
// ══════════════════════════════════════════════
(function () {
    const KEY_LOGIN = 'krono-tuto-prof-login';
    const KEY_PANEL = 'krono-tuto-prof-panel';

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

    // ── VISTAS DEL PANEL ──────────────────────
    // El panel tiene dos vistas: el asistente de carga (wizard) y el panel de notas.
    const vistaActual = () => pantallaVisible('notas-panel-materia') ? 'notas' : 'wizard';

    // Muestra la vista (y el paso del asistente) que pide cada paso del tutorial.
    async function ponerVista(p) {
        if (!p.vista) return;
        const wrap  = document.getElementById('wizard-wrap');
        const notas = document.getElementById('notas-panel-materia');
        if (p.vista === 'wizard') {
            notas.style.display = 'none';
            wrap.style.display  = 'block';
            if (typeof p.wizPaso === 'number') {
                wizPaso = p.wizPaso;
                if (p.wizPaso === 4) construirGrillaNotas();
                actualizarWizardTrack();
            }
            await esperar(sinMov ? 0 : 380);
        } else if (p.vista === 'notas') {
            if (vistaActual() !== 'notas') {
                const curso = cursoActual || (cursosDelProfesor()[0]) || 1;
                cursoActual = curso;
                mostrarPanelNotasMateria(curso);
                await esperar(sinMov ? 0 : 700);   // deja cargar la tabla
            }
        }
    }

    // ── PASOS ─────────────────────────────────
    // objetivo: selector | elemento | array | función que devuelve
    //           elementos (se calcula la caja que los une)
    // vista / wizPaso: qué vista del panel mostrar (y qué tarjeta del asistente)
    // maxAlto: recorta la zona resaltada cuando el contenido es muy largo
    // alTope: sube al inicio (elementos de la barra)
    function pasosLogin() {
        return [
            { titulo: '¡Bienvenido a Krono!',
              texto: 'Este es el acceso de Profesores. Te muestro en un minuto cómo ingresar y cómo cargar notas. Podés omitir el recorrido cuando quieras.' },
            { titulo: 'Tus datos',
              texto: 'Escribí tu correo institucional y tu nombre completo. Tienen que coincidir con los datos que la escuela cargó en Krono.',
              objetivo: () => $$('#login-paso-datos .login-input') },
            { titulo: 'Código por mail',
              texto: 'Tocá «Enviar código»: te llega un código de 6 dígitos al correo. Lo escribís en la pantalla siguiente y entrás al panel.',
              objetivo: '#btn-solicitar-codigo' },
            { titulo: 'Tu ayuda, siempre a mano',
              texto: 'Este botón vuelve a abrir el tutorial cuando quieras. La primera vez que ingreses te muestro el panel completo.',
              objetivo: '.tuto-ayuda', alTope: true }
        ];
    }

    function pasosPanel() {
        const nombre = (sessionStorage.getItem('prof_nombre') || '').trim().split(/\s+/)[0];
        return [
            { titulo: nombre ? '¡Hola, ' + nombre + '!' : '¡Hola!',
              texto: 'Este es tu Panel de Profesores, donde cargás las notas de tus alumnos. Te muestro qué hace cada parte mientras el resto queda de fondo. Avanzá con «Siguiente» o con las flechas del teclado.',
              objetivo: '.panel-header-row', alTope: true },
            { titulo: 'Menú principal',
              texto: 'Desde acá pasás de un panel a otro: Estudiantes, Preceptoría, Directivos y Profesores (donde estás).',
              textoMovil: 'Tocá las tres rayitas para abrir el menú y pasar de un panel a otro: Estudiantes, Preceptoría, Directivos y Profesores.',
              objetivo: () => esMovil() ? $('#menu-toggle') : $('#nav-principal'), alTope: true },
            { titulo: 'Modo claro u oscuro',
              texto: 'Cambiá la apariencia a gusto. Krono recuerda tu elección.',
              objetivo: '#modo-toggle-btn', alTope: true },
            { titulo: 'Cerrar sesión',
              texto: 'Cuando termines, cerrá sesión, sobre todo si la compu la usa más gente.',
              objetivo: '.panel-header-row .btn-logout', alTope: true },

            { titulo: 'Cargar una nota: paso 1',
              vista: 'wizard', wizPaso: 0,
              texto: 'Cargar una nota es un asistente de pocos pasos, una tarjeta por vez. Empieza con tu nombre, que ya aparece completo. Seguí con «Siguiente».',
              objetivo: '#wizard-wrap .wizard-step-activo .wizard-card' },
            { titulo: 'Materia y trimestre',
              vista: 'wizard', wizPaso: 1,
              texto: 'Elegí la materia (solo figuran las que dictás vos) y el trimestre al que corresponde la nota.',
              objetivo: '#wizard-wrap .wizard-step-activo .wizard-card' },
            { titulo: 'Curso',
              vista: 'wizard', wizPaso: 2,
              texto: 'Elegí el curso. Solo aparecen los que tenés asignados.',
              objetivo: '#wizard-wrap .wizard-step-activo .wizard-card' },
            { titulo: 'Estudiantes',
              vista: 'wizard', wizPaso: 3,
              texto: 'Buscá y tildá a uno o varios alumnos de la lista. Si tildás a varios, todos reciben la misma nota de una sola vez.',
              objetivo: '#wizard-wrap .wizard-step-activo .wizard-card' },
            { titulo: 'La nota',
              vista: 'wizard', wizPaso: 4,
              texto: 'Tocá la nota del 1 al 10, o usá «Usar una nota con decimales» si necesitás, por ejemplo, un 8,5. Con los botones de abajo cargás un Recuperatorio 1 o 2.',
              objetivo: '#wizard-wrap .wizard-step-activo .wizard-card', maxAlto: 420 },
            { titulo: 'Motivos',
              vista: 'wizard', wizPaso: 5,
              texto: 'Este paso aparece solo si la nota es menor a 7: marcá uno o más motivos (es opcional) o escribí uno propio en «Otros». Con «Cargar nota» queda guardada.',
              objetivo: '#wizard-wrap .wizard-step-activo .wizard-card', maxAlto: 420 },
            { titulo: 'Ir directo al panel de notas',
              vista: 'wizard', wizPaso: 0,
              texto: 'Si solo querés ver o corregir notas que ya cargaste, «Saltar» te lleva directo al panel de notas.',
              objetivo: '.wizard-skip' },

            { titulo: 'Materia y curso',
              vista: 'notas',
              texto: 'En el panel de notas cambiás de materia con las flechas de arriba y de curso con las de la píldora de abajo.',
              objetivo: () => [$('#notas-panel-materia .materia-nav'), $('#notas-panel-materia .curso-pill-nav')] },
            { titulo: 'Trimestres',
              vista: 'notas',
              texto: 'Elegí el trimestre para ver las notas de esa etapa.',
              objetivo: '#trimestre-tabs' },
            { titulo: 'Tabla de notas',
              vista: 'notas', maxAlto: 280,
              texto: 'Acá ves la nota de cada alumno y sus recuperatorios (R1 y R2). Con «Editar» corregís una nota y con «Eliminar» la borrás.',
              objetivo: '#tabla-notas-contenedor' },
            { titulo: 'Cargar otra nota',
              vista: 'notas',
              texto: 'Este botón te devuelve al asistente para cargar una nota nueva.',
              objetivo: '#notas-panel-materia > .btn-logout' },
            { titulo: 'Descargar libreta',
              texto: 'Bajá la libreta en Excel: elegís trimestres, materia y año, y cada trimestre sale con Nota, R1 y R2.',
              objetivo: '.libreta-section' },
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

        await esperar(sinMov ? 0 : 120);
        if (tipo === 'panel') await ponerVista(p);
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
        estadoInicial = t === 'panel' ? { vista: vistaActual(), paso: wizPaso, curso: cursoActual, materia: materiaActual } : null;
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
            if (estadoInicial) {
                cursoActual = estadoInicial.curso; materiaActual = estadoInicial.materia;
                const wrap = document.getElementById('wizard-wrap'), notas = document.getElementById('notas-panel-materia');
                if (estadoInicial.vista === 'notas') { wrap.style.display = 'none'; notas.style.display = 'block'; }
                else { notas.style.display = 'none'; wrap.style.display = 'block'; wizPaso = estadoInicial.paso; actualizarWizardTrack(); }
            }
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
        if (document.readyState === 'complete') setTimeout(arrancarSiCorresponde, 900);
        else window.addEventListener('load', () => setTimeout(arrancarSiCorresponde, 900));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();


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
const TOTAL_PASOS = 5;
let wizPaso = 0;
let wizAlumnos = [];
let wizAlumnosSeleccionados = [];
let wizNotaSeleccionada = null;

// Estado del panel de notas por materia
let materiasDisponibles = [];
let materiaActual = null;

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

function renderWizardProgress() {
    const cont = document.getElementById('wizard-progress');
    let puntos = '';
    for (let i = 0; i < TOTAL_PASOS; i++) {
        puntos += `<span class="wizard-dot ${i === wizPaso ? 'activo' : ''}"></span>`;
    }
    cont.innerHTML = `${puntos}<span class="wizard-contador">${wizPaso + 1}/${TOTAL_PASOS}</span>`;
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
    if (wizPaso === 4) return; // último paso: se carga con cargarNotaWizard()

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
}

function seleccionarNotaWizard(valor, btn) {
    wizNotaSeleccionada = valor;
    document.getElementById('wiz-nota-decimal').value = '';
    document.querySelectorAll('.wizard-nota-btn').forEach(b => b.classList.remove('seleccionada'));
    if (btn) btn.classList.add('seleccionada');
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
}

// --- CARGAR NOTA (desde el asistente) ---

function cargarNotaWizard() {
    ocultarErrorWizard(4);

    const materia     = obtenerMateriaWizard();
    const trimestre   = document.getElementById('wiz-trimestre').value;
    const observacion = document.getElementById('wiz-observacion').value.trim();
    const decimalVal  = document.getElementById('wiz-nota-decimal').value;
    const notaValor   = decimalVal !== '' ? parseFloat(decimalVal) : wizNotaSeleccionada;

    if (!wizAlumnosSeleccionados.length || !materia || notaValor === null || notaValor === undefined || isNaN(notaValor)) {
        mostrarErrorWizard(4, 'Seleccioná una nota para continuar.');
        return;
    }
    if (notaValor < 1 || notaValor > 10) {
        mostrarErrorWizard(4, 'La nota debe ser un número entre 1 y 10.');
        return;
    }

    const pedidos = wizAlumnosSeleccionados.map(id_alumno =>
        fetch(`${API_BASE}/profesores/notas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_alumno, materia, trimestre, nota: notaValor, observacion })
        }).then(r => r.json().then(body => ({ status: r.status, body })))
    );

    Promise.all(pedidos).then(resultados => {
        const fallidos = resultados.filter(r => r.status !== 201);
        if (fallidos.length === resultados.length) {
            mostrarErrorWizard(4, fallidos[0]?.body?.error || 'No se pudo cargar la nota.');
            return;
        }
        if (fallidos.length) {
            mostrarErrorWizard(4, `Se cargó para ${resultados.length - fallidos.length} de ${resultados.length} estudiantes. Algunos fallaron.`);
        }
        materiaActual = materia;
        mostrarPanelNotasMateria(cursoActual);
    }).catch(() => mostrarErrorWizard(4, 'Error de conexión con el servidor.'));
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
    document.getElementById('wiz-alumno-buscar').value = '';
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

function renderPanelMateria() {
    const cont = document.getElementById('tabla-notas-contenedor');
    const tituloMateria = document.getElementById('materia-actual-nombre');

    if (!materiasDisponibles.length) {
        tituloMateria.textContent = 'Sin notas';
        cont.innerHTML = '<p class="instruccion">Todavía no hay notas cargadas para este curso.</p>';
        return;
    }

    tituloMateria.textContent = materiaActual;

    const filas = notasData
        .filter(n => n.materia === materiaActual)
        .sort((a, b) => (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre));

    if (!filas.length) {
        cont.innerHTML = '<p class="instruccion">Sin notas cargadas en esta materia.</p>';
        return;
    }

    cont.innerHTML = `
        <table class="tabla-notas">
            <thead>
                <tr><th>Estudiante</th><th>Trimestre</th><th>Nota</th><th>Recuperatorio</th><th></th></tr>
            </thead>
            <tbody>
                ${filas.map(n => {
                    const notaNum = parseFloat(n.nota);
                    const badgeClass = notaNum < 6 ? 'nota-badge nota-baja' : 'nota-badge';
                    const tieneRecu = n.recu_nota !== null && n.recu_nota !== undefined;
                    const recuCelda = tieneRecu ? `
                        <span class="nota-alumno">N°${escapeHtml(n.recu_numero)} — ${escapeHtml(n.recu_titulo)}</span>
                        <div class="nota-observacion">
                            <span class="${parseFloat(n.recu_nota) < 6 ? 'nota-badge nota-baja' : 'nota-badge'}">${parseFloat(n.recu_nota).toFixed(2)}</span>
                        </div>
                        <button class="btn-editar-nota" style="margin-top:6px;" onclick="abrirRecuperatorio(${n.id})">Editar</button>
                    ` : `
                        <button class="btn-editar-nota" onclick="abrirRecuperatorio(${n.id})">+ Cargar recuperatorio</button>
                    `;
                    return `
                        <tr>
                            <td>
                                <span class="nota-alumno">${escapeHtml(n.apellido)}, ${escapeHtml(n.nombre)}</span>
                                ${n.observacion ? `<div class="nota-observacion">"${escapeHtml(n.observacion)}"</div>` : ''}
                            </td>
                            <td class="nota-detalle">${escapeHtml(n.trimestre)}</td>
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

function abrirEdicionNota(id) {
    const nota = notasData.find(n => n.id === id);
    if (!nota) return;
    notaEditandoId = id;

    document.getElementById('edit-nota-alumno-nombre').textContent = `${nota.apellido}, ${nota.nombre}`;
    document.getElementById('edit-nota-materia').value = nota.materia;
    document.getElementById('edit-nota-trimestre').value = nota.trimestre;
    document.getElementById('edit-nota-valor').value = nota.nota;
    document.getElementById('edit-nota-observacion').value = nota.observacion || '';
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
    const observacion = document.getElementById('edit-nota-observacion').value.trim();

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

// --- RECUPERATORIO ---

function abrirRecuperatorio(notaId) {
    const nota = notasData.find(n => n.id === notaId);
    if (!nota) return;
    notaEditandoId = notaId;

    document.getElementById('recu-modal-alumno-nombre').textContent = `${nota.apellido}, ${nota.nombre}`;
    document.getElementById('recu-numero').value = nota.recu_numero ?? '';
    document.getElementById('recu-titulo').value = nota.recu_titulo || '';
    document.getElementById('recu-valor').value  = nota.recu_nota ?? '';
    document.getElementById('recu-modal-error').style.display = 'none';
    document.getElementById('recu-modal-quitar').style.display =
        (nota.recu_nota !== null && nota.recu_nota !== undefined) ? 'block' : 'none';

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

    const numero = document.getElementById('recu-numero').value;
    const titulo = document.getElementById('recu-titulo').value.trim();
    const valor  = document.getElementById('recu-valor').value;

    if (!numero || !titulo || valor === '') {
        error.textContent = 'Completá número de evaluación, título y nota.';
        error.style.display = 'block';
        return;
    }
    const notaNum = parseFloat(valor);
    if (isNaN(notaNum) || notaNum < 1 || notaNum > 10) {
        error.textContent = 'La nota debe ser un número entre 1 y 10.';
        error.style.display = 'block';
        return;
    }

    fetch(`${API_BASE}/profesores/notas/${notaEditandoId}/recuperatorio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, titulo, nota: notaNum })
    })
        .then(r => r.json().then(body => ({ status: r.status, body })))
        .then(({ status, body }) => {
            if (status !== 200) {
                error.textContent = body.error || 'No se pudo guardar el recuperatorio.';
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

function quitarRecuperatorioDesdeModal() {
    if (!notaEditandoId) return;
    if (!confirm('¿Quitar el recuperatorio cargado?')) return;
    fetch(`${API_BASE}/profesores/notas/${notaEditandoId}/recuperatorio`, { method: 'DELETE' })
        .then(r => r.json())
        .then(() => {
            cerrarRecuModal();
            cargarNotasCurso(cursoActual);
        })
        .catch(() => alert('No se pudo quitar el recuperatorio.'));
}

// Cerrar modales con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cerrarNotaModal(); cerrarRecuModal(); }
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
        iniciarPanelProfesores();
    }
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

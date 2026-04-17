// ══════════════════════════════════════════
//  KRONO — Alumno Script
// ══════════════════════════════════════════

// ── Base de datos SIMULADA por alumno (reemplazar con fetch() a tu BD) ──
// TODO: GET /api/alumno?email=... para traer los datos reales
const BD_ALUMNOS = {
    'lucia.gomez@escuelasproa.edu.ar': {
        nombre:    'Lucía Gómez',
        curso:     '4° Año',
        division:  'B',
        legajo:    'A-1042',
        avatar:    null,
        clasesSubidas: 7,
        faltas: [
            { fecha: '2025-03-12', mes: 'Mar', tipo: 'injust',  motivo: 'Sin justificación presentada',      hora: null },
            { fecha: '2025-03-28', mes: 'Mar', tipo: 'tarde',   motivo: 'Transporte demorado',               hora: '8:25' },
            { fecha: '2025-04-05', mes: 'Abr', tipo: 'just',    motivo: 'Turno médico (certificado)',        hora: null },
            { fecha: '2025-04-18', mes: 'Abr', tipo: 'injust',  motivo: 'Sin justificación presentada',      hora: null },
            { fecha: '2025-05-07', mes: 'May', tipo: 'just',    motivo: 'Enfermedad (certificado médico)',   hora: null },
            { fecha: '2025-05-07', mes: 'May', tipo: 'just',    motivo: 'Enfermedad (certificado médico)',   hora: null },
            { fecha: '2025-06-03', mes: 'Jun', tipo: 'tarde',   motivo: 'Lluvia intensa',                   hora: '8:40' },
            { fecha: '2025-07-22', mes: 'Jul', tipo: 'injust',  motivo: 'Sin justificación presentada',     hora: null },
            { fecha: '2025-08-14', mes: 'Ago', tipo: 'just',    motivo: 'Paro de transporte (constancia)',  hora: null },
            { fecha: '2025-09-09', mes: 'Sep', tipo: 'just',    motivo: 'Acto escolar — representación',    hora: null },
            { fecha: '2025-10-21', mes: 'Oct', tipo: 'injust',  motivo: 'Sin justificación presentada',     hora: null },
        ]
    },
    'pedro.ramirez@escuelasproa.edu.ar': {
        nombre:    'Pedro Ramírez',
        curso:     '2° Año',
        division:  'A',
        legajo:    'A-0876',
        avatar:    null,
        clasesSubidas: 4,
        faltas: [
            { fecha: '2025-03-20', mes: 'Mar', tipo: 'just',   motivo: 'Turno odontológico',                hora: null },
            { fecha: '2025-04-10', mes: 'Abr', tipo: 'injust', motivo: 'Sin justificación presentada',     hora: null },
            { fecha: '2025-05-15', mes: 'May', tipo: 'tarde',  motivo: 'Problemas con el transporte',      hora: '8:15' },
            { fecha: '2025-06-18', mes: 'Jun', tipo: 'injust', motivo: 'Sin justificación presentada',     hora: null },
            { fecha: '2025-08-05', mes: 'Ago', tipo: 'just',   motivo: 'Enfermedad (certificado médico)',  hora: null },
        ]
    },
    'demo@escuelasproa.edu.ar': {
        nombre:    'Estudiante Demo',
        curso:     '3° Año',
        division:  'C',
        legajo:    'A-0001',
        avatar:    null,
        clasesSubidas: 6,
        faltas: [
            { fecha: '2025-03-12', mes: 'Mar', tipo: 'injust', motivo: 'Sin justificación presentada',      hora: null },
            { fecha: '2025-04-05', mes: 'Abr', tipo: 'just',   motivo: 'Turno médico (certificado)',        hora: null },
            { fecha: '2025-04-22', mes: 'Abr', tipo: 'tarde',  motivo: 'Transporte demorado',               hora: '8:30' },
            { fecha: '2025-05-08', mes: 'May', tipo: 'just',   motivo: 'Enfermedad (certificado médico)',   hora: null },
            { fecha: '2025-06-03', mes: 'Jun', tipo: 'injust', motivo: 'Sin justificación presentada',      hora: null },
            { fecha: '2025-07-25', mes: 'Jul', tipo: 'tarde',  motivo: 'Lluvia / tránsito',                hora: '8:50' },
            { fecha: '2025-08-14', mes: 'Ago', tipo: 'just',   motivo: 'Paro de transporte',               hora: null },
            { fecha: '2025-09-09', mes: 'Sep', tipo: 'just',   motivo: 'Representación institucional',     hora: null },
            { fecha: '2025-10-01', mes: 'Oct', tipo: 'injust', motivo: 'Sin justificación presentada',     hora: null },
            { fecha: '2025-11-11', mes: 'Nov', tipo: 'tarde',  motivo: 'Problemas de salud',               hora: '9:05' },
        ]
    }
};

const MESES_ORDEN = ['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_NOMBRE = {
    Mar:'Marzo', Abr:'Abril', May:'Mayo', Jun:'Junio',
    Jul:'Julio', Ago:'Agosto', Sep:'Septiembre', Oct:'Octubre',
    Nov:'Noviembre', Dic:'Diciembre'
};

let alumnoActual = null; // datos del alumno logueado

// ══════════════════════════════════════════
//  LOGIN — GOOGLE (simulado)
// ══════════════════════════════════════════

let googleStep = 1; // 1=email, 2=password

function iniciarLoginGoogle() {
    googleStep = 1;
    document.getElementById('google-email').value = '';
    document.getElementById('google-pass').value  = '';
    document.getElementById('google-pass-wrap').style.display = 'none';
    document.getElementById('google-error').style.display     = 'none';
    document.getElementById('btn-google-next').textContent    = 'Siguiente';
    document.getElementById('modal-google').style.display     = 'flex';
    setTimeout(() => document.getElementById('google-email').focus(), 100);
}

function cerrarModalGoogle(e) {
    if (!e || e.target === document.getElementById('modal-google')) {
        document.getElementById('modal-google').style.display = 'none';
    }
}

function pasoGoogle() {
    const errorEl = document.getElementById('google-error');
    errorEl.style.display = 'none';

    if (googleStep === 1) {
        const email = document.getElementById('google-email').value.trim().toLowerCase();
        if (!email.endsWith('@escuelasproa.edu.ar')) {
            errorEl.style.display = 'block'; return;
        }
        // Pasar a paso contraseña
        googleStep = 2;
        document.getElementById('google-pass-wrap').style.display = 'block';
        document.getElementById('btn-google-next').textContent    = 'Ingresar';
        setTimeout(() => document.getElementById('google-pass').focus(), 80);

    } else {
        const email = document.getElementById('google-email').value.trim().toLowerCase();
        const pass  = document.getElementById('google-pass').value;
        if (pass.length < 4) {
            errorEl.innerHTML = 'Ingresá tu contraseña correctamente.';
            errorEl.style.display = 'block'; return;
        }
        document.getElementById('modal-google').style.display = 'none';
        activarPanel(email);
    }
}

// ══════════════════════════════════════════
//  LOGIN — EMAIL MANUAL
// ══════════════════════════════════════════

function togglePassword() {
    const inp = document.getElementById('password-input');
    const btn = document.getElementById('toggle-pw-btn');
    if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
    else                         { inp.type = 'password'; btn.textContent = '👁'; }
}

function verificarLogin() {
    const email = document.getElementById('email-input').value.trim().toLowerCase();
    const pass  = document.getElementById('password-input').value;
    const error = document.getElementById('login-error');

    if (!email.endsWith('@escuelasproa.edu.ar') || pass.length < 4) {
        error.style.display = 'block'; return;
    }
    error.style.display = 'none';
    activarPanel(email);
}

// ══════════════════════════════════════════
//  ACTIVAR PANEL
// ══════════════════════════════════════════

function activarPanel(email) {
    sessionStorage.setItem('alumno_email', email);

    // Buscar datos en la BD simulada; si no existe, crear datos vacíos
    alumnoActual = BD_ALUMNOS[email] || {
        nombre: email.split('@')[0].replace('.', ' '),
        curso: '—', division: '—', legajo: '—',
        clasesSubidas: 0, avatar: null, faltas: []
    };

    // UI
    document.getElementById('login-screen').style.display  = 'none';
    document.getElementById('panel-screen').style.display  = 'block';

    // Nombre e iniciales
    const partes   = alumnoActual.nombre.split(' ');
    const iniciales = (partes[0]?.[0] || '') + (partes[1]?.[0] || '');
    const avatarEl = document.getElementById('avatar-circle');
    avatarEl.textContent = iniciales.toUpperCase();

    document.getElementById('nombre-display').textContent  = alumnoActual.nombre;
    document.getElementById('bienvenida-texto').textContent = email;

    // Info card
    document.getElementById('info-curso').textContent    = alumnoActual.curso;
    document.getElementById('info-division').textContent = alumnoActual.division;
    document.getElementById('info-legajo').textContent   = alumnoActual.legajo;

    iniciarEstadisticas();
}

function cerrarSesion() {
    sessionStorage.removeItem('alumno_email');
    alumnoActual = null;
    document.getElementById('panel-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('email-input').value    = '';
    document.getElementById('password-input').value = '';
    if (window._chartFaltas)    { window._chartFaltas.destroy();    window._chartFaltas    = null; }
    if (window._chartBeneficio) { window._chartBeneficio.destroy(); window._chartBeneficio = null; }
}

// ══════════════════════════════════════════
//  ESTADÍSTICAS
// ══════════════════════════════════════════

function iniciarEstadisticas() {
    if (!alumnoActual) return;
    const d = alumnoActual;

    // Contar por tipo
    const totalJust   = d.faltas.filter(f => f.tipo === 'just').length;
    const totalInjust = d.faltas.filter(f => f.tipo === 'injust').length;
    const totalTarde  = d.faltas.filter(f => f.tipo === 'tarde').length;
    const total       = totalJust + totalInjust + totalTarde;
    const fotos       = d.clasesSubidas;

    // Resumen
    document.getElementById('stat-total').textContent  = total;
    document.getElementById('stat-injust').textContent = totalInjust;
    document.getElementById('stat-just').textContent   = totalJust;
    document.getElementById('stat-fotos').textContent  = fotos;

    // % beneficio
    const pct = Math.min(100, Math.max(0, 100 - totalInjust * 10 + fotos * 2));
    document.getElementById('pct-numero').textContent = pct + '%';

    const maxInjust = 10, maxFotos = 20;
    document.getElementById('barra-injust').style.width = Math.min(100, (totalInjust / maxInjust) * 100) + '%';
    document.getElementById('barra-fotos').style.width  = Math.min(100, (fotos / maxFotos) * 100) + '%';
    document.getElementById('val-injust').textContent   = '−' + totalInjust;
    document.getElementById('val-fotos').textContent    = '+' + fotos;

    const chip = document.getElementById('estado-chip');
    if (pct >= 80)      { chip.className = 'beneficio-estado estado-excelente'; chip.innerHTML = '✦ ¡Excelente! Tenés el máximo beneficio en cantina'; }
    else if (pct >= 50) { chip.className = 'beneficio-estado estado-bueno';     chip.innerHTML = '◈ Buen rendimiento — seguí subiendo clases para mejorar'; }
    else                { chip.className = 'beneficio-estado estado-riesgo';     chip.innerHTML = '⚠ Riesgo de perder el beneficio — justificá tus faltas'; }

    // Agrupar faltas por mes para el gráfico
    const justPorMes   = MESES_ORDEN.map(m => d.faltas.filter(f => f.mes === m && f.tipo === 'just').length);
    const injustPorMes = MESES_ORDEN.map(m => d.faltas.filter(f => f.mes === m && f.tipo === 'injust').length);

    // Tabla detalle
    renderTablaFaltas('todos');

    setTimeout(() => {
        dibujarGraficoFaltas(justPorMes, injustPorMes);
        dibujarGraficoBeneficio(pct);
    }, 80);
}

// ── Tabla detalle de faltas ──
function renderTablaFaltas(filtroMes) {
    const wrap = document.getElementById('tabla-faltas-wrap');
    if (!alumnoActual || alumnoActual.faltas.length === 0) {
        wrap.innerHTML = '<p class="tabla-empty">Sin inasistencias registradas 🎉</p>'; return;
    }

    // Agrupar por mes
    const grupos = {};
    alumnoActual.faltas.forEach(f => {
        if (filtroMes !== 'todos' && f.mes !== filtroMes) return;
        if (!grupos[f.mes]) grupos[f.mes] = [];
        grupos[f.mes].push(f);
    });

    const mesesPresentes = MESES_ORDEN.filter(m => grupos[m]);

    if (mesesPresentes.length === 0) {
        wrap.innerHTML = '<p class="tabla-empty">No hay inasistencias para este mes.</p>'; return;
    }

    let html = '<table class="tabla-faltas"><thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Hora llegada</th></tr></thead><tbody>';

    mesesPresentes.forEach(mes => {
        html += `<tr><td colspan="4" class="falta-mes-sep">${MESES_NOMBRE[mes]}</td></tr>`;
        grupos[mes].forEach(f => {
            const fecha  = formatearFecha(f.fecha);
            const badge  = f.tipo === 'just'   ? '<span class="badge-tipo badge-just">Justificada</span>'
                         : f.tipo === 'injust' ? '<span class="badge-tipo badge-injust">Injustificada</span>'
                                               : '<span class="badge-tipo badge-tarde">Tardanza</span>';
            const hora   = f.hora ? `<strong>${f.hora}</strong>` : '<span style="color:var(--ink-muted)">—</span>';
            html += `<tr><td>${fecha}</td><td>${badge}</td><td>${f.motivo}</td><td>${hora}</td></tr>`;
        });
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
}

function filtrarFaltas() {
    const val = document.getElementById('filtro-mes').value;
    renderTablaFaltas(val);
}

function formatearFecha(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

// ── Gráfico de barras ──
function dibujarGraficoFaltas(justPorMes, injustPorMes) {
    if (window._chartFaltas) window._chartFaltas.destroy();
    const ctx = document.getElementById('grafico-faltas');
    if (!ctx) return;

    window._chartFaltas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: MESES_ORDEN,
            datasets: [
                {
                    label: 'Justificadas',
                    data: justPorMes,
                    backgroundColor: 'rgba(45,138,94,0.65)',
                    borderColor: 'rgba(45,138,94,0.9)',
                    borderWidth: 1.5, borderRadius: 6, borderSkipped: false,
                },
                {
                    label: 'Injustificadas',
                    data: injustPorMes,
                    backgroundColor: 'rgba(200,80,80,0.60)',
                    borderColor: 'rgba(200,80,80,0.85)',
                    borderWidth: 1.5, borderRadius: 6, borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} falta${ctx.parsed.y !== 1 ? 's' : ''}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 12 }, color: '#4a5568' } },
                y: {
                    beginAtZero: true,
                    max: Math.max(4, Math.max(...justPorMes, ...injustPorMes) + 1),
                    ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 }, color: '#4a5568' },
                    grid: { color: 'rgba(168,212,245,0.2)' }
                }
            }
        }
    });
}

// ── Gráfico de dónut ──
function dibujarGraficoBeneficio(pct) {
    if (window._chartBeneficio) window._chartBeneficio.destroy();
    const ctx = document.getElementById('grafico-beneficio');
    if (!ctx) return;

    const colorPct = pct >= 80 ? 'rgba(45,138,94,0.85)' : pct >= 50 ? 'rgba(75,163,217,0.85)' : 'rgba(200,80,80,0.85)';

    window._chartBeneficio = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [pct, 100 - pct],
                backgroundColor: [colorPct, 'rgba(200,200,200,0.18)'],
                borderWidth: 0, borderRadius: [8, 0], hoverOffset: 0
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
    const texto = document.getElementById('motivo-texto').value.trim();
    if (!texto) { alert('Por favor escribí el motivo antes de enviar.'); return; }
    // TODO: fetch POST a tu endpoint PHP con FormData
    console.log('Enviando motivo de tardanza:', texto);
    document.getElementById('tarde-ok').style.display = 'block';
    document.getElementById('motivo-texto').value = '';
    document.getElementById('nombre-archivo').textContent = '';
    document.getElementById('motivo-archivo').value = '';
    setTimeout(() => {
        document.getElementById('tarde-ok').style.display = 'none';
        document.getElementById('form-tarde').style.display = 'none';
    }, 3000);
}

function toggleFormFoto() {
    const f = document.getElementById('form-foto');
    f.style.display = f.style.display === 'none' ? 'flex' : 'none';
}

function enviarFoto() {
    const foto = document.getElementById('foto-input').files[0];
    const desc = document.getElementById('foto-desc').value.trim();
    if (!foto) { alert('Elegí una foto primero.'); return; }
    // TODO: fetch POST a tu endpoint PHP con FormData
    console.log('Enviando foto de clase:', foto.name, '| Desc:', desc);

    alumnoActual.clasesSubidas++;
    iniciarEstadisticas();

    document.getElementById('foto-ok').style.display = 'block';
    document.getElementById('foto-desc').value = '';
    document.getElementById('nombre-foto').textContent = '';
    document.getElementById('foto-preview-wrap').style.display = 'none';
    document.getElementById('foto-input').value = '';
    setTimeout(() => {
        document.getElementById('foto-ok').style.display = 'none';
        document.getElementById('form-foto').style.display = 'none';
    }, 3000);
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Enter en campos del login manual
    ['email-input', 'password-input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') verificarLogin(); });
    });

    // Enter en modal Google
    ['google-email', 'google-pass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') pasoGoogle(); });
    });

    // Sesión guardada
    const emailGuardado = sessionStorage.getItem('alumno_email');
    if (emailGuardado) activarPanel(emailGuardado);

    // Listeners archivos
    const archivoInput = document.getElementById('motivo-archivo');
    if (archivoInput) archivoInput.addEventListener('change', () => {
        document.getElementById('nombre-archivo').textContent = archivoInput.files[0]?.name || '';
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
});

/* ── Ocultar header al hacer scroll ── */
(function () {
    const header = document.querySelector('.sidebar');
    let ultimoScroll = 0, ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const s = window.scrollY;
                if (s <= 10)                  header.classList.remove('header-oculto');
                else if (s > ultimoScroll + 6) header.classList.add('header-oculto');
                else if (s < ultimoScroll - 6) header.classList.remove('header-oculto');
                ultimoScroll = s; ticking = false;
            });
            ticking = true;
        }
    });
})();

// ══════════════════════════════════════════════
//  MODO OSCURO — idéntico a prece-script.js
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
        // Muestra el ícono del modo al que VAS a pasar (igual que prece)
        btn.innerHTML = '<img src="' + (isDark ? 'Modo_oscuro.png' : 'Modo_claro.png') + '" alt="cambiar modo">';
        btn.addEventListener('click', () => {
            const ahora = document.body.classList.toggle('dark-mode');
            localStorage.setItem('krono-dark', ahora ? '1' : '0');
            btn.querySelector('img').src = ahora ? 'Modo_oscuro.png' : 'Modo_claro.png';
            if (typeof _reRenderAllCharts === 'function') _reRenderAllCharts();
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
//  CURSOR TRAIL — idéntico a prece-script.js
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

// ══════════════════════════════════════════════
//  CONFIG — mismo API base que prece-script.js
// ══════════════════════════════════════════════
const API = 'http://127.0.0.1:5000';
const PASSWORD_DIR = 'tesina-directivos';
const HORA_ENTRADA = '08:00:00';

// ══════════════════════════════════════════════
//  GRÁFICOS (Chart.js) — helpers
// ══════════════════════════════════════════════
const _charts = {};
const _lastRender = {};

function _cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function _themeColors() {
    return {
        sky:    _cssVar('--sky-strong') || '#4ba3d9',
        skyDeep:_cssVar('--sky-deep')   || '#164a6d',
        ambar:  _cssVar('--ambar')      || '#b07a10',
        rojo:   _cssVar('--rojo')       || '#c84040',
        verde:  _cssVar('--verde')      || '#2d8a5e',
        ink:    document.body.classList.contains('dark-mode') ? '#c8dff0' : (_cssVar('--ink') || '#1e2a38'),
        inkMuted: document.body.classList.contains('dark-mode') ? '#7aa8c8' : (_cssVar('--ink-muted') || '#4a5568'),
        grid:   document.body.classList.contains('dark-mode') ? 'rgba(75,163,217,0.12)' : 'rgba(75,163,217,0.15)'
    };
}

function _reRenderAllCharts() {
    const fns = { _renderDonutMotivos };
    Object.values(_lastRender).forEach(({ fn, args }) => {
        if (fns[fn]) fns[fn](...args);
    });
    if (typeof _eaRenderCharts === 'function' && _eaDatos) _eaRenderCharts(_eaDatos);
}

function _destroyChart(id) {
    if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

// ══════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════
function togglePw() {
    const inp = document.getElementById('password-input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
}

function verificarPassword() {
    const val = document.getElementById('password-input').value.trim();
    const err = document.getElementById('login-error');
    if (val === PASSWORD_DIR) {
        err.style.display = 'none';
        document.getElementById('login-screen').style.display  = 'none';
        document.getElementById('panel-screen').style.display  = 'block';
        _motProfesoresCargados = false;   // renovar la lista de profesores en cada ingreso
        // Cargar las estadísticas académicas automáticamente
        _eaFiltrosListos = false;
        cargarEstadisticas();
    } else {
        err.style.display = 'block';
        document.getElementById('password-input').value = '';
    }
}

function cerrarSesion() {
    document.getElementById('panel-screen').style.display  = 'none';
    document.getElementById('login-screen').style.display  = 'block';
    document.getElementById('password-input').value = '';
}

// ══════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════
function cambiarPestania(tab) {
    // Al salir de Agenda se apaga el velo desenfocado
    if (tab !== 'agenda' && typeof agCerrarPanel === 'function') agCerrarPanel();
    ['estadisticas','motivos','estudiantes','agenda'].forEach(t => {
        // Estadísticas usa display:flex (con gap) en su CSS; con 'block' se perdía el espaciado
        document.getElementById('panel-' + t).style.display = t === tab ? (t === 'estadisticas' ? 'flex' : 'block') : 'none';
        const btn = document.getElementById('tab-' + t);
        if (btn) btn.classList.toggle('tab-activa', t === tab);
    });
    if (tab === 'motivos') iniciarMotivosNotas();
    if (tab === 'estudiantes') cargarResumenEstudiantes();
    if (tab === 'agenda') iniciarAgenda();
    if (tab === 'estadisticas') requestAnimationFrame(() => Object.values(_charts).forEach(ch => ch.resize()));
}

// ══════════════════════════════════════════════
//  ESTADÍSTICAS ACADÉMICAS (sección "Estadísticas")
//  Usa: GET /dir/estadisticas-academicas  (notas cargadas por los profesores)
// ══════════════════════════════════════════════
let _eaDatos = null;            // última respuesta (se re-dibuja al cambiar el modo claro/oscuro)
let _eaSeq = 0;                 // evita que una respuesta vieja pise a una más nueva
let _eaFiltrosListos = false;   // las opciones de año y materia se cargan una sola vez

const _eaEsc = txt => _motEsc(txt);
const _eaEntero = n => Number(n || 0).toLocaleString('es-AR');
const _eaPct = n => (n === null || n === undefined) ? '—' : (Math.round(n * 10) / 10).toLocaleString('es-AR') + '%';
const _eaPctEntero = n => (n === null || n === undefined) ? '—' : Math.round(n) + '%';

/** Colores de los gráficos: mismos azules de la web (en modo oscuro se aclaran para que se lean) */
function _eaColores() {
    const oscuro = document.body.classList.contains('dark-mode');
    const t = _themeColors();
    return {
        oscuro,
        c1: oscuro ? '#4ba3d9' : '#164a6d',     // aprobados
        c2: oscuro ? '#a8d4f5' : '#4ba3d9',     // aprobados con recuperatorio
        c3: oscuro ? '#2f7fb5' : '#8cc6ec',     // desaprobados
        barra: '#4ba3d9',
        ink: t.ink, inkMuted: t.inkMuted, grid: t.grid,
        tooltipBg: 'rgba(8,20,38,0.95)',
        borde: oscuro ? 'rgba(8,20,38,0.9)' : '#ffffff'
    };
}

/** Tooltip común a todos los gráficos */
function _eaTooltip(extra) {
    return Object.assign({
        backgroundColor: 'rgba(8,20,38,0.95)',
        titleColor: '#ffffff', bodyColor: '#dbeaf6',
        borderColor: 'rgba(75,163,217,0.35)', borderWidth: 1,
        padding: 10, cornerRadius: 10, boxPadding: 4,
        titleFont: { family: "'DM Sans', sans-serif", weight: '500' },
        bodyFont:  { family: "'DM Sans', sans-serif" }
    }, extra || {});
}

/** Escribe el valor al final de cada barra (barras horizontales) o encima (verticales) */
const _eaValoresPlugin = {
    id: 'eaValores',
    afterDatasetsDraw(chart, _args, opts) {
        if (!opts || !opts.formato) return;
        const { ctx } = chart;
        const horizontal = chart.options.indexAxis === 'y';
        ctx.save();
        ctx.font = "500 11px 'DM Sans', sans-serif";
        ctx.fillStyle = opts.color || '#4a5568';
        chart.data.datasets.forEach((ds, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            meta.data.forEach((el, j) => {
                const v = ds.data[j];
                if (v === null || v === undefined) return;
                const texto = opts.formato(v);
                if (horizontal) {
                    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                    ctx.fillText(texto, el.x + 6, el.y);
                } else {
                    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    ctx.fillText(texto, el.x, el.y - 4);
                }
            });
        });
        ctx.restore();
    }
};

function _eaMostrarVacio(canvasId, vacioId, vacio) {
    const canvas = document.getElementById(canvasId);
    const cont = canvas && (canvas.closest('.ea-scroll') || canvas.closest('.ea-chart') || canvas.closest('.ea-donut-body'));
    if (cont) cont.hidden = vacio;
    const msg = document.getElementById(vacioId);
    if (msg) msg.hidden = !vacio;
    if (vacio) _destroyChart(canvasId);
}

// ── Carga ─────────────────────────────────────
function cargarEstadisticas() {
    const seq = ++_eaSeq;
    const q = new URLSearchParams();
    const val = id => document.getElementById(id).value;
    if (_eaFiltrosListos && val('ea-f-anio') !== '') q.set('anio_lectivo', val('ea-f-anio'));
    if (val('ea-f-curso'))     q.set('curso', val('ea-f-curso'));
    if (val('ea-f-materia'))   q.set('materia', val('ea-f-materia'));
    if (val('ea-f-trimestre')) q.set('trimestre', val('ea-f-trimestre'));

    document.getElementById('ea-error').hidden = true;
    fetch(`${API}/dir/estadisticas-academicas?${q.toString()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
            if (seq !== _eaSeq) return;
            if (d.error) throw new Error(d.error);
            if (_eaLlenarFiltros(d)) { cargarEstadisticas(); return; }
            _eaDatos = d;
            _eaRender(d);
        })
        .catch(err => {
            if (seq !== _eaSeq) return;
            console.error('Error estadísticas:', err);
            document.getElementById('ea-error').hidden = false;
            ['ea-k-alumnos', 'ea-k-aprobadas', 'ea-k-desaprobadas', 'ea-k-notas'].forEach(id => {
                document.getElementById(id).textContent = '—';
            });
        });
}

/** Año: se carga una vez. Materia: se rearma en cada respuesta con las materias que tienen notas. */
function _eaLlenarFiltros(d) {
    if (!_eaFiltrosListos) {
        _eaFiltrosListos = true;
        const selAnio = document.getElementById('ea-f-anio');
        const anios = (d.filtros && d.filtros.anios) || [];
        selAnio.innerHTML = anios.length
            ? '<option value="0">Todos</option>' + anios.map(a => `<option value="${a}">${a}</option>`).join('')
            : '<option value="0">Sin datos</option>';
        selAnio.value = String(d.aplicados.anio_lectivo || 0);
    }

    const selMat = document.getElementById('ea-f-materia');
    const actual = selMat.value;
    const lista = (d.filtros && d.filtros.materias) || [];
    selMat.length = 1;                                   // deja solo "Todas"
    lista.forEach(m => {
        const op = document.createElement('option');
        op.value = m; op.textContent = m;
        selMat.appendChild(op);
    });
    if (actual && !lista.includes(actual)) {             // la materia elegida ya no tiene notas con este año/curso
        selMat.value = '';
        return true;                                     // hay que volver a pedir los datos
    }
    selMat.value = actual;
    return false;
}

// ── Dibujo ────────────────────────────────────
function _eaRender(d) {
    const k = d.kpis || {};
    document.getElementById('ea-k-alumnos').textContent     = _eaEntero(k.alumnos_registrados);
    document.getElementById('ea-k-alumnos-nota').textContent =
        k.notas_cargadas ? `${_eaEntero(k.alumnos_con_notas)} con notas cargadas` : '\u00a0';
    document.getElementById('ea-k-aprobadas').textContent    = _eaPctEntero(k.pct_aprobadas);
    document.getElementById('ea-k-desaprobadas').textContent = _eaPctEntero(k.pct_desaprobadas);
    document.getElementById('ea-k-notas').textContent        = _eaEntero(k.notas_cargadas);
    _eaRenderCharts(d);
}

function _eaRenderCharts(d) {
    if (!d || typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    _eaRenderEvolucion(d);
    _eaRenderDona(d);
    _eaRenderMaterias();
    _eaRenderCursos(d);
}

function _eaRenderEvolucion(d) {
    const evo = d.evolucion || [];
    const vacio = !evo.some(p => p.total > 0);
    _eaMostrarVacio('chart-ea-evolucion', 'ea-v-evolucion', vacio);
    if (vacio) return;
    _destroyChart('chart-ea-evolucion');
    const c = _eaColores();
    const ctx = document.getElementById('chart-ea-evolucion');

    _charts['chart-ea-evolucion'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: evo.map(p => p.etiqueta),
            datasets: [
                { label: 'Aprobados', data: evo.map(p => p.total ? p.pct_directas : null),
                  borderColor: c.c1, backgroundColor: 'rgba(75,163,217,0.16)', fill: true, tension: 0.3,
                  borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: c.c1, spanGaps: false },
                { label: 'Con recuperatorio', data: evo.map(p => p.total ? p.pct_recuperadas : null),
                  borderColor: c.c2, fill: false, tension: 0.3,
                  borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: c.c2, spanGaps: false },
                { label: 'Desaprobados', data: evo.map(p => p.total ? p.pct_desaprobadas : null),
                  borderColor: c.c3, fill: false, tension: 0.3,
                  borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: c.c3, spanGaps: false }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 450 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: _eaTooltip({
                    callbacks: {
                        label: it => ` ${it.dataset.label}: ${_eaPct(it.parsed.y)}`,
                        afterBody: items => {
                            const p = evo[items[0].dataIndex];
                            return p && p.total ? `${_eaEntero(p.total)} notas` : '';
                        }
                    }
                })
            },
            scales: {
                y: { min: 0, max: 100, ticks: { color: c.inkMuted, stepSize: 25, callback: v => v + '%' }, grid: { color: c.grid } },
                x: { ticks: { color: c.inkMuted }, grid: { display: false } }
            }
        }
    });
}

function _eaRenderDona(d) {
    const dist = d.distribucion || {};
    const total = dist.total || 0;
    const vacio = !total;
    document.getElementById('ea-dona-total').textContent = _eaEntero(total);
    _eaMostrarVacio('chart-ea-dona', 'ea-v-dona', vacio);
    if (vacio) return;

    const c = _eaColores();
    const cats = [
        { nombre: 'Aprobadas',                   n: dist.aprobadas,    color: c.c1 },
        { nombre: 'Aprobadas con recuperatorio', n: dist.recuperadas,  color: c.c2 },
        { nombre: 'Desaprobadas',                n: dist.desaprobadas, color: c.c3 }
    ];
    document.getElementById('ea-dona-leyenda').innerHTML = cats.map(x => `
        <div class="ea-donut-fila">
            <i class="ea-dot" style="background:${x.color}"></i>
            <span class="ea-donut-nombre">${_eaEsc(x.nombre)}</span>
            <span class="ea-donut-pct">${_eaPctEntero(total ? x.n * 100 / total : 0)}</span>
            <span class="ea-donut-cant">${_eaEntero(x.n)}</span>
        </div>`).join('');

    _destroyChart('chart-ea-dona');
    _charts['chart-ea-dona'] = new Chart(document.getElementById('chart-ea-dona'), {
        type: 'doughnut',
        data: {
            labels: cats.map(x => x.nombre),
            datasets: [{ data: cats.map(x => x.n || 0), backgroundColor: cats.map(x => x.color),
                         borderColor: c.borde, borderWidth: 2, hoverOffset: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '64%',
            animation: { duration: 450 },
            plugins: {
                legend: { display: false },
                tooltip: _eaTooltip({
                    callbacks: {
                        label: it => ` ${it.label}: ${_eaEntero(it.parsed)} (${_eaPct(total ? it.parsed * 100 / total : 0)})`
                    }
                })
            }
        }
    });
}

/** Barras horizontales: promedio (0-10) o % de aprobación (0-100) por materia */
function _eaRenderMaterias() {
    const d = _eaDatos;
    if (!d || typeof Chart === 'undefined') return;
    const metrica = document.getElementById('ea-metrica-materias').value;
    const esProm = metrica === 'promedio';
    const mats = (d.por_materia || []).filter(m => m.total > 0);
    const vacio = !mats.length;
    _eaMostrarVacio('chart-ea-materias', 'ea-v-materias', vacio);
    if (vacio) return;

    const lista = [...mats].sort((a, b) => esProm
        ? (b.promedio || 0) - (a.promedio || 0)
        : (b.pct_aprobadas || 0) - (a.pct_aprobadas || 0));
    const valor = m => esProm ? m.promedio : m.pct_aprobadas;

    // Alto según la cantidad de materias; si son muchas, la tarjeta scrollea en vez de crecer
    document.getElementById('ea-wrap-mat').style.height = Math.max(220, lista.length * 30 + 24) + 'px';

    _destroyChart('chart-ea-materias');
    const c = _eaColores();
    _charts['chart-ea-materias'] = new Chart(document.getElementById('chart-ea-materias'), {
        type: 'bar',
        data: {
            labels: lista.map(m => m.materia),
            datasets: [{ label: esProm ? 'Promedio' : '% de aprobación', data: lista.map(valor),
                         backgroundColor: c.barra, borderRadius: 6, maxBarThickness: 18 }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            animation: { duration: 450 },
            layout: { padding: { right: 38 } },
            plugins: {
                legend: { display: false },
                eaValores: { color: c.inkMuted, formato: v => esProm ? v.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : _eaPctEntero(v) },
                tooltip: _eaTooltip({
                    callbacks: {
                        label: it => {
                            const m = lista[it.dataIndex];
                            return [` Promedio: ${m.promedio === null ? '—' : m.promedio.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
                                    ` Aprobación: ${_eaPct(m.pct_aprobadas)}`];
                        },
                        afterBody: items => `${_eaEntero(lista[items[0].dataIndex].total)} notas`
                    }
                })
            },
            scales: {
                x: { min: 0, max: esProm ? 10 : 100, ticks: { color: c.inkMuted, callback: v => esProm ? v : v + '%' }, grid: { color: c.grid } },
                y: { ticks: { color: c.ink, font: { size: 11 } }, grid: { display: false } }
            }
        },
        plugins: [_eaValoresPlugin]
    });
}

/** Barras verticales: aprobados vs desaprobados (%) de 1° a 6° año */
function _eaRenderCursos(d) {
    const cur = d.por_curso || [];
    const vacio = !cur.some(x => x.total > 0);
    _eaMostrarVacio('chart-ea-cursos', 'ea-v-cursos', vacio);
    if (vacio) return;

    _destroyChart('chart-ea-cursos');
    const c = _eaColores();
    _charts['chart-ea-cursos'] = new Chart(document.getElementById('chart-ea-cursos'), {
        type: 'bar',
        data: {
            labels: cur.map(x => x.etiqueta),
            datasets: [
                { label: 'Aprobados',    data: cur.map(x => x.total ? x.pct_aprobadas : null),    backgroundColor: c.c1, borderRadius: 6, maxBarThickness: 22 },
                { label: 'Desaprobados', data: cur.map(x => x.total ? x.pct_desaprobadas : null), backgroundColor: c.c3, borderRadius: 6, maxBarThickness: 22 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 450 },
            layout: { padding: { top: 16 } },
            plugins: {
                legend: { display: false },
                eaValores: { color: c.inkMuted, formato: v => _eaPctEntero(v) },
                tooltip: _eaTooltip({
                    callbacks: {
                        label: it => ` ${it.dataset.label}: ${_eaPct(it.parsed.y)}`,
                        afterBody: items => `${_eaEntero(cur[items[0].dataIndex].total)} notas`
                    }
                })
            },
            scales: {
                y: { min: 0, max: 100, ticks: { color: c.inkMuted, stepSize: 25, callback: v => v + '%' }, grid: { color: c.grid } },
                x: { ticks: { color: c.inkMuted }, grid: { display: false } }
            }
        },
        plugins: [_eaValoresPlugin]
    });
}


// ══════════════════════════════════════════════
//  HEADER — ocultar al bajar, mostrar al subir
// ══════════════════════════════════════════════
(function () {
    let lastY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const currentY = window.scrollY;
                const header = document.querySelector('.sidebar');
                if (header) {
                    if (currentY > lastY && currentY > 60) {
                        header.classList.add('header-oculto');
                    } else {
                        header.classList.remove('header-oculto');
                    }
                }
                lastY = currentY;
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
})();

// ══════════════════════════════════════════════
//  FIN directivos-script.js
// ══════════════════════════════════════════════


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
//  MOTIVOS DE NOTAS BAJAS
// ══════════════════════════════════════════════
const MOT_COLORES_DONA = ['#164a6d', '#2f7fb5', '#4ba3d9', '#8cc6ec', '#b9dcf3', '#dbeaf6'];
let _motProfesoresCargados = false;

function _motEsc(txt) {
    const d = document.createElement('div');
    d.textContent = txt == null ? '' : String(txt);
    return d.innerHTML;
}

function _motPct(n) {
    return Math.round(Number(n) || 0) + '%';
}

function _motIcono(materia) {
    const m = (materia || '').toLowerCase();
    if (m.includes('educación física') || m.includes('ed. f') || m.includes('deporte')) return '🏃';
    if (m.includes('matem'))                          return '📐';
    if (m.includes('lengua') || m.includes('liter'))  return '📖';
    if (m.includes('natural') || m.includes('biolog') || m.includes('física') || m.includes('química')) return '🔬';
    if (m.includes('social') || m.includes('historia') || m.includes('geograf')) return '🌎';
    if (m.includes('ingl') || m.includes('idioma'))   return '💬';
    if (m.includes('arte') || m.includes('música') || m.includes('plástica')) return '🎨';
    return '📘';
}

function _cargarFiltroProfes() {
    return fetch(`${API}/dir/profesores-lista`, { cache: 'no-store' })
        .then(r => r.json())
        .then(lista => {
            const sel = document.getElementById('mot-filtro-prof');
            if (!Array.isArray(lista)) return;
            const actual = sel.value;
            sel.length = 1;                       // deja solo "Todos los profesores"
            lista.forEach(p => {
                const op = document.createElement('option');
                op.value = p.id_profesor;
                op.textContent = `${p.apellido}, ${p.nombre}`;
                sel.appendChild(op);
            });
            sel.value = lista.some(p => String(p.id_profesor) === actual) ? actual : '';
        });
}

function iniciarMotivosNotas() {
    if (!_motProfesoresCargados) {
        _motProfesoresCargados = true;
        _cargarFiltroProfes().catch(() => { _motProfesoresCargados = false; });
    }
    cargarCuadrosProfes();
    cargarMotivosNotas();
}

function cargarMotivosNotas() {
    const prof = document.getElementById('mot-filtro-prof').value;
    cargarNotasDeProfe(prof);
    const url = `${API}/dir/motivos-notas${prof ? '?profesor=' + encodeURIComponent(prof) : ''}`;
    fetch(url, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            renderMotivosNotas(data);
        })
        .catch(() => {
            document.getElementById('mot-leyenda').innerHTML = '<p class="mot-vacio">No se pudieron cargar los datos.</p>';
        });
}

function renderMotivosNotas(d) {
    const vacio = !d.total_notas_bajas;

    // ── Dona + leyenda ──
    document.getElementById('mot-total').textContent = vacio ? '0' : d.total_notas_bajas.toLocaleString('es-AR');
    const items = d.motivos || [];
    _renderDonutMotivos('chart-motivos-donut', items.map(m => m.nombre), items.map(m => m.cantidad), vacio);

    document.getElementById('mot-leyenda').innerHTML = vacio
        ? `<p class="mot-vacio">${document.getElementById('mot-filtro-prof').value ? 'Este profesor no tiene notas bajas (menores a 7) con motivos registrados. Las notas de 7 o más no entran en este resumen: las ves abajo, en Notas cargadas.' : 'Todavía no hay notas bajas con motivos registrados.'}</p>`
        : items.map((m, i) => `
            <div class="mot-leyenda-fila">
                <i class="mot-dot mot-c${i + 1}"></i>
                <span>${_motEsc(m.nombre)}</span>
                <span class="mot-num">${m.cantidad.toLocaleString('es-AR')}</span>
                <span class="mot-pct">${_motPct(m.porcentaje)}</span>
            </div>`).join('');

    let pie = '';
    if (!vacio) pie = 'Una nota puede tener más de un motivo; los porcentajes se calculan sobre los motivos registrados.';
    if (d.sin_motivo) pie += ` ${d.sin_motivo} ${d.sin_motivo === 1 ? 'nota baja sin motivo registrado no se incluye' : 'notas bajas sin motivo registrado no se incluyen'}.`;
    document.getElementById('mot-pie').textContent = pie.trim();

    // ── Observaciones ──
    const obs = d.observaciones || [];
    document.getElementById('mot-observaciones').innerHTML = obs.length
        ? obs.map(t => `<li><i class="mot-dot"></i><span>${_motEsc(t)}</span></li>`).join('')
        : '<li class="mot-obs-vacio"><span class="mot-vacio">Sin datos suficientes para generar observaciones.</span></li>';

    // ── Motivos por materia ──
    const mats = d.por_materia || [];
    document.getElementById('mot-tabla').innerHTML = !mats.length
        ? '<p class="mot-vacio">Sin datos.</p>'
        : `<table class="mot-tabla">
            <thead><tr><th>Materia</th><th>Falta de estudio</th><th>Comprensión</th><th>Inasistencias</th><th>Otros</th></tr></thead>
            <tbody>${mats.map(m => `
                <tr>
                    <td><span class="mot-materia-ico">${_motIcono(m.materia)}</span>${_motEsc(m.materia)}</td>
                    <td>${_motPct(m.estudio)}</td><td>${_motPct(m.comprension)}</td>
                    <td>${_motPct(m.inasistencias)}</td><td>${_motPct(m.otros)}</td>
                </tr>`).join('')}
            </tbody></table>`;

    // ── Evolución por trimestre ──
    const evo = d.evolucion || [];
    document.getElementById('mot-evolucion').innerHTML = !evo.length
        ? '<p class="mot-vacio">Sin datos.</p>'
        : evo.map(p => {
            const seg = (clase, v) => v > 0
                ? `<div class="mot-seg ${clase}" style="width:${v}%" title="${_motPct(v)}">${v >= 9 ? _motPct(v) : ''}</div>` : '';
            const barra = p.notas
                ? `${seg('mot-g1', p.estudio)}${seg('mot-g2', p.comprension)}${seg('mot-g3', p.inasistencias)}${seg('mot-g4', p.otros)}`
                : '<div class="mot-seg-vacio">Sin notas bajas</div>';
            return `<div class="mot-evol-fila">
                <span>${_motEsc(p.periodo)}</span>
                <div class="mot-barra">${barra}</div>
            </div>`;
        }).join('');
}

// ══════════════════════════════════════════════
//  PROFESORES (profesores + profesoras juntos) y ESTUDIANTES
// ══════════════════════════════════════════════
let _profes = [];                      // profesores y profesoras juntos
const _PROF_CURSO_TEXTO = { '1ro': 1, '2do': 2, '3ro': 3, '4to': 4, '5to': 5, '6to': 6 };

function _profCantTexto(n) {
    return `${n} ${n === 1 ? 'profesor' : 'profesores'}`;
}

function _profBuscar(id) {
    return _profes.find(p => p.id_profesor === id);
}

function cargarCuadrosProfes() {
    return fetch(`${API}/dir/profesores-detalle`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
            if (d.error) throw new Error(d.error);
            // El botón "Profesores" junta profesores y profesoras
            _profes = (d.profesores || []).concat(d.profesoras || [])
                .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '', 'es') ||
                                (a.nombre || '').localeCompare(b.nombre || '', 'es'));
            document.getElementById('prof-cant-profesores').textContent = _profCantTexto(_profes.length);
            if (_profListaAbierta) renderListaProfes();
        })
        .catch(() => {
            document.getElementById('prof-cant-profesores').textContent = 'No se pudo cargar';
        });
}

let _profListaAbierta = false;

function abrirListaProfes() {
    _profListaAbierta = true;
    document.getElementById('prof-cuadros').style.display = 'none';
    document.getElementById('mot-dashboard').style.display = 'none';
    document.getElementById('prof-lista-vista').style.display = 'block';
    renderListaProfes();
}

function cerrarListaProfes() {
    _profListaAbierta = false;
    document.getElementById('prof-lista-vista').style.display = 'none';
    document.getElementById('prof-cuadros').style.display = '';
    document.getElementById('mot-dashboard').style.display = '';
}

function renderListaProfes() {
    if (!_profListaAbierta) return;
    const lista = _profes;
    document.getElementById('prof-lista-titulo').textContent = 'Profesores';
    document.getElementById('prof-lista-cant').textContent = _profCantTexto(lista.length);

    const cont = document.getElementById('prof-tabla');
    if (!lista.length) {
        cont.innerHTML = `<div class="prof-vacio">Todavía no hay profesores en el sistema.</div>`;
        return;
    }
    cont.innerHTML = `
        <div class="dir-tabla-header cols-profes">
            <div>Nombre</div><div>Apellido</div><div>Gmail</div><div></div>
        </div>
        ${lista.map(p => `
        <div class="dir-fila cols-profes">
            <div class="dir-fila-nombre">${_motEsc(p.nombre)}</div>
            <div class="dir-fila-nombre">${_motEsc(p.apellido)}</div>
            <div class="dir-fila-email">${_motEsc(p.gmail)}</div>
            <div class="prof-acciones">
                <button type="button" class="prof-btn" onclick="abrirActualizarProfe(${p.id_profesor})">Actualizar</button>
                <button type="button" class="prof-btn prof-btn-peligro" onclick="abrirEliminarProfe(${p.id_profesor})">Eliminar</button>
            </div>
        </div>`).join('')}`;
}

// ── Notas altas (7 o más) del profesor elegido en el filtro ──
let _motNotasProfSeq = 0;   // evita que una respuesta vieja pise a una más nueva
const NOTA_ALTA_DESDE = 7;
let _motAbiertos = new Set();   // bloques que el usuario desplegó (solo mientras no recargue la página)
let _motProfeVisto = null;

// Todo arranca plegado; se recuerda lo que el usuario abre para que no se cierre al refrescar los datos
document.getElementById('mot-notas-prof-grupos').addEventListener('toggle', e => {
    const k = e.target.dataset && e.target.dataset.key;
    if (!k) return;
    if (e.target.open) _motAbiertos.add(k); else _motAbiertos.delete(k);
}, true);
const _abierto = k => (_motAbiertos.has(k) ? 'open' : '');

function cargarNotasDeProfe(idProfe) {
    const card = document.getElementById('mot-notas-prof');
    if (!idProfe) { card.style.display = 'none'; return; }

    if (idProfe !== _motProfeVisto) { _motProfeVisto = idProfe; _motAbiertos = new Set(); }
    const seq = ++_motNotasProfSeq;
    card.style.display = '';
    document.getElementById('mot-notas-prof-cant').textContent = '';
    document.getElementById('mot-notas-prof-stats').innerHTML = '';
    document.getElementById('mot-notas-prof-pie').textContent = '';
    const grupos = document.getElementById('mot-notas-prof-grupos');
    grupos.innerHTML = '<p class="mot-vacio">Cargando notas…</p>';

    fetch(`${API}/dir/profesores/${encodeURIComponent(idProfe)}/notas?desde=${NOTA_ALTA_DESDE}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
            if (seq !== _motNotasProfSeq) return;
            if (d.error) throw new Error(d.error);
            renderNotasDeProfe(d);
        })
        .catch(() => {
            if (seq !== _motNotasProfSeq) return;
            grupos.innerHTML = '<p class="mot-vacio">No se pudieron cargar las notas.</p>';
        });
}

function renderNotasDeProfe(d) {
    const notas = d.notas || [];
    const res = d.resumen || {};
    const fmt = n => String(n).replace('.', ',');
    const grupos = document.getElementById('mot-notas-prof-grupos');

    document.getElementById('mot-notas-prof-cant').textContent =
        `${d.total} ${d.total === 1 ? 'nota' : 'notas'}`;
    document.getElementById('mot-notas-prof-pie').textContent =
        d.total > notas.length ? `Se muestran las ${notas.length} más recientes de ${d.total}.` : '';

    if (!notas.length) {
        document.getElementById('mot-notas-prof-stats').innerHTML = '';
        grupos.innerHTML = '<p class="mot-vacio">Este profesor todavía no cargó notas de 7 o más.</p>';
        return;
    }

    const stat = (num, label) => `
        <div class="tend-mini-card"><span class="tend-mini-num">${num}</span><span class="tend-mini-label">${label}</span></div>`;
    document.getElementById('mot-notas-prof-stats').innerHTML =
        stat(res.total, res.total === 1 ? 'nota' : 'notas') +
        stat(res.promedio !== null && res.promedio !== undefined ? fmt(res.promedio) : '—', 'promedio') +
        stat(res.alumnos, res.alumnos === 1 ? 'alumno' : 'alumnos') +
        stat(res.materias, res.materias === 1 ? 'materia' : 'materias');

    // Agrupa: materia → curso → trimestre → alumno
    const numTrim = t => { const m = /\d/.exec(t || ''); return m ? Number(m[0]) : 99; };
    const porMateria = new Map();
    notas.forEach(n => {
        if (!porMateria.has(n.materia)) porMateria.set(n.materia, new Map());
        const cursos = porMateria.get(n.materia);
        if (!cursos.has(n.curso)) cursos.set(n.curso, new Map());
        const trims = cursos.get(n.curso);
        if (!trims.has(n.trimestre)) trims.set(n.trimestre, []);
        trims.get(n.trimestre).push(n);
    });

    const promedio = lista => Math.round(lista.reduce((t, n) => t + n.nota, 0) / lista.length * 100) / 100;
    const cuenta = n => `${n} ${n === 1 ? 'nota' : 'notas'}`;
    const todas = m => [...m.values()].flatMap(x => x instanceof Map ? todas(x) : x);

    const orden = [...porMateria.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));

    grupos.innerHTML = orden.map(([materia, cursos]) => {
        const deMateria = todas(cursos);
        const kMateria = materia;
        const bloquesCurso = [...cursos.entries()].sort((a, b) => a[0] - b[0]).map(([curso, trims]) => {
            const deCurso = todas(trims);
            const kCurso = `${kMateria}|${curso}`;
            const bloquesTrim = [...trims.entries()]
                .sort((a, b) => numTrim(a[0]) - numTrim(b[0]) || a[0].localeCompare(b[0], 'es'))
                .map(([trim, lista]) => {
                    const kTrim = `${kCurso}|${trim}`;
                    lista.sort((a, b) => a.alumno.localeCompare(b.alumno, 'es'));
                    return `
                    <details class="notas-altas-trim" data-key="${_motEsc(kTrim)}" ${_abierto(kTrim)}>
                        <summary class="notas-altas-trim-head">
                            <span class="notas-altas-trim-nombre">${_motEsc(trim)}</span>
                            <span class="notas-altas-meta">${cuenta(lista.length)} · promedio ${fmt(promedio(lista))}</span>
                        </summary>
                        <div class="dir-tabla">
                            <div class="dir-tabla-header cols-notasprof"><div>Alumno</div><div>Nota</div><div>Fecha</div></div>
                            ${lista.map(n => `
                            <div class="dir-fila cols-notasprof">
                                <div class="dir-fila-nombre">${_motEsc(n.alumno)}</div>
                                <div><span class="badge-num badge-verde">${fmt(n.nota)}</span></div>
                                <div class="dir-fila-email">${_motEsc(n.fecha)}</div>
                            </div>`).join('')}
                        </div>
                    </details>`;
                }).join('');
            return `
            <details class="notas-altas-curso" data-key="${_motEsc(kCurso)}" ${_abierto(kCurso)}>
                <summary>
                    <span class="notas-altas-curso-nombre">${_motEsc(curso)}° año</span>
                    <span class="notas-altas-meta">${cuenta(deCurso.length)} · promedio ${fmt(promedio(deCurso))}</span>
                </summary>
                ${bloquesTrim}
            </details>`;
        }).join('');

        return `
        <details class="notas-altas-materia" data-key="${_motEsc(kMateria)}" ${_abierto(kMateria)}>
            <summary>
                <span class="notas-altas-nombre"><span class="mot-materia-ico">${_motIcono(materia)}</span>${_motEsc(materia)}</span>
                <span class="notas-altas-meta">${cuenta(deMateria.length)} · promedio ${fmt(promedio(deMateria))}</span>
            </summary>
            <div class="notas-altas-cuerpo">${bloquesCurso}</div>
        </details>`;
    }).join('');
}

// ── Modal genérico ──
function _abrirModalProf({ titulo, sub, cuerpo, okTexto, peligro, onOk }) {
    document.getElementById('prof-modal-titulo').textContent = titulo;
    document.getElementById('prof-modal-cuerpo').innerHTML =
        (sub ? `<p class="prof-modal-sub">${_motEsc(sub)}</p>` : '') + cuerpo;
    document.getElementById('prof-modal-error').textContent = '';
    const ok = document.getElementById('prof-modal-ok');
    ok.textContent = okTexto;
    ok.disabled = false;
    ok.classList.toggle('peligro', !!peligro);
    ok.onclick = async () => {
        ok.disabled = true;
        document.getElementById('prof-modal-error').textContent = '';
        try {
            await onOk();
            cerrarModalProf();
        } catch (e) {
            document.getElementById('prof-modal-error').textContent = e.message || 'No se pudo completar la acción.';
            ok.disabled = false;
        }
    };
    document.getElementById('prof-modal').style.display = 'flex';
    const primero = document.querySelector('#prof-modal-cuerpo input[type="text"]');
    (primero || ok).focus();
}

function cerrarModalProf() {
    document.getElementById('prof-modal').style.display = 'none';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('prof-modal').style.display !== 'none') cerrarModalProf();
});

async function _profLlamar(url, opciones) {
    let res;
    try { res = await fetch(url, opciones); }
    catch (_) { throw new Error('No se pudo conectar con el servidor.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || 'No se pudo completar la acción.');
    return data;
}

// Después de cambiar algo: refresca tarjetas, lista, filtro del resumen y resumen
async function _profRefrescarTodo() {
    await Promise.all([cargarCuadrosProfes(), _cargarFiltroProfes().catch(() => {})]);
    cargarMotivosNotas();
}

// ── Actualizar: materias, años y género ──
function abrirActualizarProfe(id) {
    const p = _profBuscar(id);
    if (!p) return;
    const cursosActuales = (p.cursos || '').split('-')
        .map(t => _PROF_CURSO_TEXTO[t.trim().toLowerCase()]).filter(Boolean);

    const cuerpo = `
        <div class="prof-campo">
            <label class="mot-filtro-label" for="prof-edit-materias">Materias</label>
            <input type="text" id="prof-edit-materias" class="prof-input" maxlength="300"
                   value="${_motEsc(p.materias || '').replace(/"/g, '&quot;')}">
            <div class="prof-ayuda">Separadas con barra. Ej.: Matemáticas / Física</div>
        </div>
        <div class="prof-campo">
            <span class="mot-filtro-label">Años</span>
            <div class="prof-anios">
                ${[1, 2, 3, 4, 5, 6].map(n => `
                <label class="prof-anio">
                    <input type="checkbox" value="${n}" ${cursosActuales.includes(n) ? 'checked' : ''}>
                    <span>${n}° año</span>
                </label>`).join('')}
            </div>
        </div>
        <div class="prof-campo">
            <label class="mot-filtro-label" for="prof-edit-genero">Género</label>
            <select id="prof-edit-genero" class="aviso-select">
                <option value="M" ${p.genero !== 'F' ? 'selected' : ''}>Profesor</option>
                <option value="F" ${p.genero === 'F' ? 'selected' : ''}>Profesora</option>
            </select>
        </div>`;

    _abrirModalProf({
        titulo: 'Actualizar',
        sub: `${p.nombre} ${p.apellido} · ${p.gmail}`,
        cuerpo,
        okTexto: 'Guardar cambios',
        onOk: async () => {
            const cursos = [...document.querySelectorAll('#prof-modal-cuerpo .prof-anio input:checked')]
                .map(i => Number(i.value));
            await _profLlamar(`${API}/dir/profesores/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    materias: document.getElementById('prof-edit-materias').value,
                    cursos,
                    genero: document.getElementById('prof-edit-genero').value
                })
            });
            await _profRefrescarTodo();
        }
    });
}

// ── Eliminar ──
function abrirEliminarProfe(id) {
    const p = _profBuscar(id);
    if (!p) return;
    _abrirModalProf({
        titulo: 'Eliminar',
        sub: `${p.nombre} ${p.apellido} · ${p.gmail}`,
        cuerpo: `<p class="prof-modal-texto">¿Seguro que querés eliminar a ${_motEsc(p.nombre)} ${_motEsc(p.apellido)}?
                 Ya no va a poder ingresar al panel de Profesores. Las notas que cargó se conservan.</p>`,
        okTexto: 'Eliminar',
        peligro: true,
        onOk: async () => {
            await _profLlamar(`${API}/dir/profesores/${id}`, { method: 'DELETE' });
            await _profRefrescarTodo();
        }
    });
}

// ══════════════════════════════════════════════
//  ESTUDIANTES: altas, bajas e ingresantes
// ══════════════════════════════════════════════
let _estResumen = { total: 0, por_curso: {} };
let _estAbierto = false;
let _estCurso = null;
let _estLista = [];

function _estCantTexto(n) { return `${n} ${n === 1 ? 'estudiante' : 'estudiantes'}`; }

function cargarResumenEstudiantes() {
    return fetch(`${API}/dir/estudiantes-resumen`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
            if (d.error) throw new Error(d.error);
            _estResumen = d;
            document.getElementById('est-cant-total').textContent = _estCantTexto(d.total);
            document.getElementById('est-vista-cant').textContent = _estCantTexto(d.total);
            const n6 = (d.por_curso && d.por_curso['6']) || 0;
            document.getElementById('est-sexto-cant').textContent =
                n6 ? `Se borran los ${_estCantTexto(n6)} de 6° año` : 'Todavía no hay estudiantes en 6° año';
        })
        .catch(() => {
            document.getElementById('est-cant-total').textContent = 'No se pudo cargar';
        });
}

function abrirEstudiantes() {
    _estAbierto = true;
    document.getElementById('est-cuadros').style.display = 'none';
    document.getElementById('est-vista').style.display = 'block';
    cargarResumenEstudiantes();
}

function cerrarEstudiantes() {
    _estAbierto = false;
    document.getElementById('est-vista').style.display = 'none';
    document.getElementById('est-cuadros').style.display = '';
}

function verEstudiantesCurso(anio, btn) {
    _estCurso = anio;
    document.querySelectorAll('#est-selector-curso .btn-curso-mini')
        .forEach(b => b.classList.toggle('activo', b === btn));
    document.getElementById('est-buscar').value = '';
    return _estCargarCurso();
}

function _estCargarCurso() {
    const cont = document.getElementById('est-tabla');
    if (!_estCurso) return Promise.resolve();
    cont.innerHTML = '<p class="instruccion">Cargando...</p>';
    return fetch(`${API}/dir/estudiantes/curso/${_estCurso}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
            if (d.error) throw new Error(d.error);
            _estLista = d;
            renderListaEstudiantes();
        })
        .catch(() => { cont.innerHTML = '<p class="instruccion">No se pudo cargar la lista.</p>'; });
}

function renderListaEstudiantes() {
    const cont = document.getElementById('est-tabla');
    if (!_estCurso) return;
    const q = (document.getElementById('est-buscar').value || '').trim().toLowerCase();
    const lista = _estLista.filter(e =>
        !q || `${e.nombre} ${e.apellido} ${e.gmail}`.toLowerCase().includes(q));
    if (!lista.length) {
        cont.innerHTML = `<div class="prof-vacio">${_estLista.length
            ? 'Ningún estudiante coincide con la búsqueda.'
            : 'No hay estudiantes en ' + _estCurso + '° año.'}</div>`;
        return;
    }
    cont.innerHTML = `
        <div class="dir-tabla-header cols-profes">
            <div>Nombre</div><div>Apellido</div><div>Gmail</div><div></div>
        </div>
        ${lista.map(e => `
        <div class="dir-fila cols-profes">
            <div class="dir-fila-nombre">${_motEsc(e.nombre)}</div>
            <div class="dir-fila-nombre">${_motEsc(e.apellido)}</div>
            <div class="dir-fila-email">${_motEsc(e.gmail)}</div>
            <div class="prof-acciones">
                <button type="button" class="prof-btn prof-btn-peligro" onclick="abrirBajaEstudiante(${e.id_alumno})">Dar de baja</button>
            </div>
        </div>`).join('')}`;
}

async function _estRefrescar() {
    await cargarResumenEstudiantes();
    await _estCargarCurso();
    libCargarAlumnos();   // mantiene al día la lista de "Descargar libretas"
}

// ── Dar de baja a un estudiante que ya no está en la institución ──
function abrirBajaEstudiante(id) {
    const e = _estLista.find(x => x.id_alumno === id);
    if (!e) return;
    _abrirModalProf({
        titulo: 'Dar de baja',
        sub: `${e.nombre} ${e.apellido} · ${e.gmail}`,
        cuerpo: `<p class="prof-modal-texto">¿Seguro que querés dar de baja a ${_motEsc(e.nombre)} ${_motEsc(e.apellido)}?
                 Se elimina del sistema junto con su historial (faltas, tardanzas, notas y documentos). Esto no se puede deshacer.</p>`,
        okTexto: 'Dar de baja',
        peligro: true,
        onOk: async () => {
            await _profLlamar(`${API}/dir/estudiantes/${id}`, { method: 'DELETE' });
            await _estRefrescar();
        }
    });
}

// ── Cambiar de año a un estudiante (por ejemplo, si repite) ──
function abrirCambiarAnio() {
    const anios = [1, 2, 3, 4, 5, 6];
    _abrirModalProf({
        titulo: 'Cambiar de año',
        sub: 'Elegí el estudiante y el año al que pasa',
        cuerpo: `
            <div class="prof-campo">
                <label class="mot-filtro-label" for="cam-anio-actual">Año actual</label>
                <select id="cam-anio-actual" class="aviso-select">
                    <option value="">Elegí un año</option>
                    ${anios.map(n => `<option value="${n}">${n}° año</option>`).join('')}
                </select>
            </div>
            <div class="prof-campo">
                <label class="mot-filtro-label" for="cam-alumno">Estudiante</label>
                <select id="cam-alumno" class="aviso-select" disabled>
                    <option value="">Primero elegí el año actual</option>
                </select>
            </div>
            <div class="prof-campo">
                <label class="mot-filtro-label" for="cam-anio-nuevo">Nuevo año</label>
                <select id="cam-anio-nuevo" class="aviso-select" disabled>
                    <option value="">Elegí un estudiante</option>
                </select>
            </div>
            <p class="prof-modal-texto">Sus faltas, tardanzas, notas y documentos se conservan.</p>`,
        okTexto: 'Cambiar de año',
        onOk: async () => {
            const id    = document.getElementById('cam-alumno').value;
            const nuevo = document.getElementById('cam-anio-nuevo').value;
            if (!id)    throw new Error('Elegí el estudiante.');
            if (!nuevo) throw new Error('Elegí el nuevo año.');
            await _profLlamar(`${API}/dir/estudiantes/${id}/anio`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ curso: Number(nuevo) })
            });
            await _estRefrescar();
        }
    });

    const selActual = document.getElementById('cam-anio-actual');
    const selAlumno = document.getElementById('cam-alumno');
    const selNuevo  = document.getElementById('cam-anio-nuevo');

    selActual.addEventListener('change', async () => {
        const actual = selActual.value;
        selNuevo.disabled = true;
        selNuevo.innerHTML = '<option value="">Elegí un estudiante</option>';
        if (!actual) {
            selAlumno.disabled = true;
            selAlumno.innerHTML = '<option value="">Primero elegí el año actual</option>';
            return;
        }
        selAlumno.disabled = true;
        selAlumno.innerHTML = '<option value="">Cargando...</option>';
        try {
            const lista = await _profLlamar(`${API}/dir/estudiantes/curso/${actual}`, { cache: 'no-store' });
            if (selActual.value !== actual) return;   // eligió otro año mientras cargaba
            selAlumno.innerHTML = lista.length
                ? '<option value="">Elegí un estudiante</option>' + lista.map(e =>
                    `<option value="${e.id_alumno}">${_motEsc(e.apellido)}, ${_motEsc(e.nombre)}</option>`).join('')
                : '<option value="">No hay estudiantes en este año</option>';
            selAlumno.disabled = !lista.length;
        } catch (err) {
            selAlumno.innerHTML = '<option value="">No se pudo cargar la lista</option>';
        }
    });

    selAlumno.addEventListener('change', () => {
        const actual = Number(selActual.value);
        if (!selAlumno.value) {
            selNuevo.disabled = true;
            selNuevo.innerHTML = '<option value="">Elegí un estudiante</option>';
            return;
        }
        selNuevo.innerHTML = '<option value="">Elegí el nuevo año</option>' +
            anios.filter(n => n !== actual).map(n => `<option value="${n}">${n}° año</option>`).join('');
        selNuevo.disabled = false;
    });
}

// ── Eliminar por completo a sexto año ──
function abrirEliminarSexto() {
    const n = (_estResumen.por_curso && _estResumen.por_curso['6']) || 0;
    if (!n) {
        _abrirModalProf({
            titulo: 'Eliminar 6° año',
            cuerpo: '<p class="prof-modal-texto">Todavía no hay estudiantes en 6° año.</p>',
            okTexto: 'Entendido',
            onOk: async () => {}
        });
        return;
    }
    _abrirModalProf({
        titulo: 'Eliminar 6° año',
        sub: `${_estCantTexto(n)} · se borran todos`,
        cuerpo: `<p class="prof-modal-texto">Vas a eliminar por completo a 6° año, con todo su historial
                 (faltas, tardanzas, notas y documentos). Esto no se puede deshacer.</p>
                 <div class="prof-campo">
                     <label class="mot-filtro-label" for="est-confirmar">Para confirmar, escribí ELIMINAR</label>
                     <input type="text" id="est-confirmar" class="prof-input" autocomplete="off">
                 </div>`,
        okTexto: 'Eliminar 6° año',
        peligro: true,
        onOk: async () => {
            if (document.getElementById('est-confirmar').value.trim().toUpperCase() !== 'ELIMINAR') {
                throw new Error('Escribí ELIMINAR para confirmar.');
            }
            await _profLlamar(`${API}/dir/estudiantes/anio/6`, { method: 'DELETE' });
            await _estRefrescar();
        }
    });
}

// ── Agregar un estudiante ──
function abrirAgregarEstudiante() {
    const cuerpo = `
        <div class="prof-campo">
            <label class="mot-filtro-label" for="est-nombre">Nombre</label>
            <input type="text" id="est-nombre" class="prof-input" maxlength="100">
        </div>
        <div class="prof-campo">
            <label class="mot-filtro-label" for="est-apellido">Apellido</label>
            <input type="text" id="est-apellido" class="prof-input" maxlength="100">
        </div>
        <div class="prof-campo">
            <label class="mot-filtro-label" for="est-dni">DNI</label>
            <input type="text" id="est-dni" class="prof-input" maxlength="12" inputmode="numeric">
        </div>
        <div class="prof-campo">
            <label class="mot-filtro-label" for="est-gmail">Gmail</label>
            <input type="text" id="est-gmail" class="prof-input" maxlength="150">
        </div>
        <div class="prof-campo">
            <label class="mot-filtro-label" for="est-curso-nuevo">Año</label>
            <select id="est-curso-nuevo" class="aviso-select">
                ${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === 1 ? 'selected' : ''}>${n}° año</option>`).join('')}
            </select>
        </div>`;
    _abrirModalProf({
        titulo: 'Agregar estudiante',
        cuerpo,
        okTexto: 'Agregar',
        onOk: async () => {
            await _profLlamar(`${API}/dir/estudiantes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: document.getElementById('est-nombre').value,
                    apellido: document.getElementById('est-apellido').value,
                    dni: document.getElementById('est-dni').value,
                    gmail: document.getElementById('est-gmail').value,
                    curso: Number(document.getElementById('est-curso-nuevo').value)
                })
            });
            await _estRefrescar();
        }
    });
}

// ── Ingresantes de 1° año (varios a la vez) ──
function abrirIngresantes() {
    _abrirModalProf({
        titulo: 'Ingresantes de 1° año',
        sub: 'Un estudiante por línea: Nombre, Apellido, DNI, Gmail',
        cuerpo: `
            <div class="prof-campo">
                <textarea id="est-ingresantes" class="prof-input est-textarea" rows="8"
                    placeholder="Lucía, Pérez, 50123456, lperez@escuelasproa.edu.ar"></textarea>
                <div class="prof-ayuda">Podés pegar las filas desde una planilla (separadas por coma, punto y coma o tabulación).</div>
            </div>`,
        okTexto: 'Agregar a 1° año',
        onOk: async () => {
            const lineas = document.getElementById('est-ingresantes').value
                .split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (!lineas.length) throw new Error('Pegá al menos un estudiante.');
            const estudiantes = lineas.map(l => {
                const f = l.split(/[;\t,]/).map(x => x.trim());
                return { nombre: f[0], apellido: f[1], dni: f[2], gmail: f[3] };
            });
            const r = await _profLlamar(`${API}/dir/estudiantes/ingresantes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estudiantes })
            });
            await _estRefrescar();
            if (r.omitidos && r.omitidos.length) {
                // Se agregaron los válidos: en el cuadro quedan solo las líneas con problemas
                document.getElementById('est-ingresantes').value =
                    r.omitidos.map(o => lineas[o.linea - 1]).join('\n');
                throw new Error(`Se agregaron ${r.agregados}. Quedan ${r.omitidos.length} sin agregar: ` +
                    r.omitidos.map(o => `${estudiantes[o.linea - 1].apellido || '(sin apellido)'}: ${o.motivo}`).join(' · '));
            }
        }
    });
}

// ══════════════════════════════════════════════
//  DESCARGAR LIBRETAS (PDF)
//  Usa: GET /dir/estudiantes/curso/<año>  y  GET /dir/libreta/<id_alumno>/pdf
// ══════════════════════════════════════════════
let _libSeq = 0;

function _libMsg(texto, tipo) {
    const el = document.getElementById('lib-msg');
    el.textContent = texto || '';
    el.className = 'lib-msg' + (tipo ? ' lib-' + tipo : '');
}

function libActualizarBoton() {
    document.getElementById('lib-btn').disabled = !document.getElementById('lib-alumno').value;
}

function libCargarAlumnos() {
    const anio = document.getElementById('lib-anio').value;
    const sel = document.getElementById('lib-alumno');
    const previo = sel.value;
    _libMsg('');
    if (!anio) {
        sel.innerHTML = '<option value="">Primero elegí el año</option>';
        sel.disabled = true;
        libActualizarBoton();
        return Promise.resolve();
    }
    const seq = ++_libSeq;
    sel.disabled = true;
    sel.innerHTML = '<option value="">Cargando…</option>';
    libActualizarBoton();
    return fetch(`${API}/dir/estudiantes/curso/${anio}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(lista => {
            if (seq !== _libSeq) return;
            if (!Array.isArray(lista)) throw new Error('respuesta inválida');
            if (!lista.length) {
                sel.innerHTML = '<option value="">No hay estudiantes en este año</option>';
                return;
            }
            sel.innerHTML = '<option value="">Elegí un estudiante</option>' + lista.map(e =>
                `<option value="${e.id_alumno}" data-nombre="${_motEsc(e.apellido + ' ' + e.nombre).replace(/"/g, '&quot;')}">${_motEsc(e.apellido)}, ${_motEsc(e.nombre)}</option>`
            ).join('');
            sel.disabled = false;
            if (previo && lista.some(e => String(e.id_alumno) === previo)) sel.value = previo;
        })
        .catch(() => {
            if (seq !== _libSeq) return;
            sel.innerHTML = '<option value="">No se pudo cargar la lista</option>';
            _libMsg('No se pudo cargar la lista de estudiantes. Revisá que el servidor esté en funcionamiento.', 'error');
        })
        .finally(() => { if (seq === _libSeq) libActualizarBoton(); });
}

async function descargarLibreta() {
    const sel = document.getElementById('lib-alumno');
    const id = sel.value;
    if (!id) return;
    const btn = document.getElementById('lib-btn');
    const nombre = (sel.selectedOptions[0].dataset.nombre || 'estudiante').trim().replace(/\s+/g, '_');
    btn.disabled = true;
    _libMsg('Generando la libreta…');
    try {
        let res;
        try { res = await fetch(`${API}/dir/libreta/${encodeURIComponent(id)}/pdf`, { cache: 'no-store' }); }
        catch (_) { throw new Error('No se pudo conectar con el servidor.'); }
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'No se pudo generar la libreta.');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Libreta_${nombre}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        _libMsg('Libreta descargada.', 'ok');
    } catch (e) {
        _libMsg(e.message || 'No se pudo generar la libreta.', 'error');
    } finally {
        libActualizarBoton();
    }
}

/** Dona — motivos de notas bajas */
function _renderDonutMotivos(canvasId, labels, valores, vacio) {
    _lastRender[canvasId] = { fn: '_renderDonutMotivos', args: [canvasId, labels, valores, vacio] };
    _destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    const oscuro = document.body.classList.contains('dark-mode');

    _charts[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: vacio ? ['Sin datos'] : labels,
            datasets: [{
                data: vacio ? [1] : valores,
                backgroundColor: vacio ? ['rgba(75,163,217,0.15)'] : MOT_COLORES_DONA,
                borderColor: oscuro ? 'rgba(8,20,38,0.9)' : '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: { legend: { display: false }, tooltip: { enabled: !vacio } }
        }
    });
}


// Al volver con el botón "atrás" (página restaurada de la caché) se renueva todo desde cero
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

// Si se vuelve a esta pestaña del navegador con "Profesores" o "Estudiantes" abierta, se actualizan los datos
document.addEventListener('visibilitychange', () => {
    if (document.hidden || document.getElementById('panel-screen').style.display === 'none') return;
    const panel = document.getElementById('panel-motivos');
    const panelEst = document.getElementById('panel-estudiantes');
    if (panel && panel.style.display !== 'none') {
        cargarMotivosNotas();
        cargarCuadrosProfes();
    }
    if (panelEst && panelEst.style.display !== 'none') {
        cargarResumenEstudiantes();
    }
});

// ══════════════════════════════════════════════
//  AGENDA — calendario propio + avisos a docentes
//  Usa: GET/POST/PUT/DELETE /dir/agenda/fechas       (solo la ve la directiva)
//       GET/POST/DELETE     /dir/agenda/avisos       (se envían a los docentes)
//       GET                 /dir/agenda/avisos/<id>  (quién se anotó y quién no)
//       GET                 /dir/profesores-lista    (docentes para elegir)
// ══════════════════════════════════════════════
const _AG_COLORES = [
    { id: 'c1', nombre: 'Azul noche' },
    { id: 'c2', nombre: 'Azul profundo' },
    { id: 'c3', nombre: 'Azul medio' },
    { id: 'c4', nombre: 'Azul cielo' },
    { id: 'c5', nombre: 'Celeste' },
    { id: 'c6', nombre: 'Celeste claro' }
];
const _AG_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const _AG_DIAS  = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const _AG_TIPOS = {
    privada: { titulo: 'Mi agenda',         url: '/dir/agenda/fechas' },
    avisos:  { titulo: 'Avisos a docentes', url: '/dir/agenda/avisos' }
};

let _ag = _agEstadoNuevo();
const _agObserva = { on: false };

function _agEstadoNuevo() {
    return {
        tipo: null,          // 'privada' | 'avisos'
        mes: null,           // Date (día 1 del mes que se ve)
        items: [],           // fechas / avisos de la grilla visible
        filtro: null,        // id de color para filtrar (null = todos)
        sel: null,           // 'YYYY-MM-DD' de la fecha tocada
        itemId: null,        // fecha/aviso abierto en el panel
        paso: 'form',        // 'form' | 'destinatarios' | 'detalle'
        borrador: null,      // lo escrito en el formulario mientras se elige a quién enviar
        detalle: null,       // aviso enviado con la lista de docentes
        destino: 'todos',    // 'todos' | 'elegir'
        docs: null,          // docentes disponibles
        docSel: new Set(),   // docentes elegidos
        docBusca: '',
        enviando: false,
        error: false,
        seq: 0
    };
}

// ── utilidades de fecha ──
const _agPad = n => String(n).padStart(2, '0');
const _agIso = d => `${d.getFullYear()}-${_agPad(d.getMonth() + 1)}-${_agPad(d.getDate())}`;
const _agHoy = () => _agIso(new Date());
const _agCap = t => t.charAt(0).toUpperCase() + t.slice(1);
const _agAttr = t => _motEsc(t).replace(/"/g, '&quot;');

function _agParse(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// Días que se dibujan: arranca en lunes. fijo=true → siempre 6 semanas (alto estable)
function _agDiasGrilla(primero, fijo) {
    const desfase = (primero.getDay() + 6) % 7;
    const diasMes = new Date(primero.getFullYear(), primero.getMonth() + 1, 0).getDate();
    const total = fijo ? 42 : Math.ceil((desfase + diasMes) / 7) * 7;
    return Array.from({ length: total }, (_, i) =>
        new Date(primero.getFullYear(), primero.getMonth(), 1 - desfase + i));
}

function _agMapa(items) {
    const m = {};
    items.forEach(it => { (m[it.fecha] = m[it.fecha] || []).push(it); });
    return m;
}

async function _agFetch(tipo, dias) {
    const desde = _agIso(dias[0]), hasta = _agIso(dias[dias.length - 1]);
    const data = await _profLlamar(`${API}${_AG_TIPOS[tipo].url}?desde=${desde}&hasta=${hasta}`);
    return Array.isArray(data) ? data : [];
}

function _agToast(texto) {
    let t = document.getElementById('ag-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'ag-toast';
        t.className = 'ag-toast';
        t.setAttribute('role', 'status');
        document.body.appendChild(t);
    }
    t.textContent = texto;
    t.classList.remove('on');
    void t.offsetWidth;                       // reinicia la animación si ya estaba visible
    t.classList.add('on');
    clearTimeout(_agToast._t);
    _agToast._t = setTimeout(() => t.classList.remove('on'), 3400);
}

function _agMsg(texto) {
    const m = document.getElementById('ag-msg');
    if (m) m.textContent = texto || '';
}

// ══ INICIO: dos vistas previas ══
function iniciarAgenda() {
    cerrarAgendaVista(true);
    _agCargarPrevias();
}

function _agHtmlMini(primero, dias, items) {
    const mapa = _agMapa(items);
    const mes = primero.getMonth();
    const cab = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => `<span class="ag-mini-dow">${d}</span>`).join('');
    const hoy = _agHoy();
    const celdas = dias.map(d => {
        if (d.getMonth() !== mes) return '<span class="ag-mini-dia ag-mini-fuera"></span>';
        const iso = _agIso(d);
        const it = mapa[iso];
        return `<span class="ag-mini-dia${it ? ' ag-' + it[0].color : ''}${iso === hoy ? ' ag-mini-hoy' : ''}">${d.getDate()}</span>`;
    }).join('');
    return `<div class="ag-mini-mes">${_agCap(_AG_MESES[mes])} ${primero.getFullYear()}</div>
            <div class="ag-mini-grid">${cab}${celdas}</div>`;
}

async function _agCargarPrevias() {
    const h = new Date();
    const primero = new Date(h.getFullYear(), h.getMonth(), 1);
    const dias = _agDiasGrilla(primero, false);
    const prefijo = `${primero.getFullYear()}-${_agPad(primero.getMonth() + 1)}`;
    await Promise.all(Object.keys(_AG_TIPOS).map(async tipo => {
        const cont = document.getElementById('ag-mini-' + tipo);
        const cant = document.getElementById('ag-cant-' + tipo);
        if (!cont) return;
        try {
            const items = await _agFetch(tipo, dias);
            cont.innerHTML = _agHtmlMini(primero, dias, items);
            const n = items.filter(i => i.fecha.startsWith(prefijo)).length;
            const unidad = tipo === 'privada' ? ['fecha guardada', 'fechas guardadas'] : ['aviso enviado', 'avisos enviados'];
            cant.textContent = n === 0 ? `Sin ${unidad[1]} este mes` : `${n} ${n === 1 ? unidad[0] : unidad[1]} este mes`;
        } catch (e) {
            cont.innerHTML = '<p class="ag-mini-error">No se pudo cargar la vista previa.</p>';
            cant.textContent = '—';
        }
    }));
}

// ══ CALENDARIO ══
async function abrirAgenda(tipo) {
    _ag = _agEstadoNuevo();
    _ag.tipo = tipo;
    const h = new Date();
    _ag.mes = new Date(h.getFullYear(), h.getMonth(), 1);
    document.getElementById('ag-inicio').style.display = 'none';
    document.getElementById('ag-vista').style.display = 'block';
    document.getElementById('ag-vista-titulo').textContent = _AG_TIPOS[tipo].titulo;
    document.getElementById('ag-vista-sub').textContent = tipo === 'privada' ? 'Solo la ves vos' : 'Se envían a los docentes';
    _agRenderFiltros();
    _agRenderLado();
    _agRenderCal();
    await _agRecargar();
}

function cerrarAgendaVista(silencioso) {
    agCerrarPanel();
    document.getElementById('ag-vista').style.display = 'none';
    document.getElementById('ag-inicio').style.display = 'block';
    _ag = _agEstadoNuevo();
    if (!silencioso) _agCargarPrevias();
}

async function _agRecargar() {
    const seq = ++_ag.seq;
    const dias = _agDiasGrilla(_ag.mes, true);
    _agRenderCal();                            // el mes elegido se ve al instante; los datos se completan al llegar
    let items = [], error = false;
    try { items = await _agFetch(_ag.tipo, dias); }
    catch (e) { error = true; }
    if (seq !== _ag.seq) return;               // llegó una respuesta más nueva
    _ag.items = items;
    _ag.error = error;
    _agRenderCal();
}

function _agRenderFiltros() {
    const cont = document.getElementById('ag-filtros');
    if (!cont) return;
    cont.innerHTML =
        `<button type="button" class="ag-filtro-todos${_ag.filtro ? '' : ' on'}" onclick="agFiltrar(null)">Todos</button>` +
        _AG_COLORES.map(c =>
            `<button type="button" class="ag-sw ag-sw-mini ag-${c.id}${_ag.filtro === c.id ? ' on' : ''}"
                     onclick="agFiltrar('${c.id}')" title="${c.nombre}" aria-label="Ver solo ${c.nombre}"
                     aria-pressed="${_ag.filtro === c.id}"></button>`).join('');
}

function agFiltrar(id) {
    _ag.filtro = (_ag.filtro === id) ? null : id;
    _agRenderFiltros();
    _agRenderCal();
}

function _agRenderCal() {
    const cont = document.getElementById('ag-cal');
    if (!cont || !_ag.mes) return;
    const dias = _agDiasGrilla(_ag.mes, true);
    const mes = _ag.mes.getMonth();
    const hoy = _agHoy();
    const visibles = _ag.items.filter(it => !_ag.filtro || it.color === _ag.filtro);
    const mapa = _agMapa(visibles);

    document.getElementById('ag-mes-titulo').textContent = `${_agCap(_AG_MESES[mes])} ${_ag.mes.getFullYear()}`;

    const cab = _AG_DIAS.map(d => `<span class="ag-dow">${d.slice(0, 3)}</span>`).join('');
    const celdas = dias.map(d => {
        const iso = _agIso(d);
        const its = mapa[iso] || [];
        const chips = its.slice(0, 2).map(it =>
            `<span class="ag-chip ag-${it.color}" title="${_agAttr(it.titulo)}">${_motEsc(it.titulo)}</span>`).join('');
        const mas = its.length > 2 ? `<span class="ag-mas">+${its.length - 2}</span>` : '';
        const etiqueta = `${d.getDate()} de ${_AG_MESES[d.getMonth()]}${its.length ? `, ${its.length} ${its.length === 1 ? 'elemento' : 'elementos'}` : ''}`;
        const clases = ['ag-dia'];
        if (d.getMonth() !== mes) clases.push('ag-fuera');
        if (iso === hoy) clases.push('ag-hoy');
        if (iso === _ag.sel) clases.push('ag-sel');
        return `<button type="button" class="${clases.join(' ')}" data-fecha="${iso}" aria-label="${etiqueta}"
                        onclick="seleccionarFecha('${iso}')">
                    <span class="ag-dia-num">${d.getDate()}</span>${chips}${mas}
                </button>`;
    }).join('');

    cont.innerHTML = `<div class="ag-dows">${cab}</div><div class="ag-celdas">${celdas}</div>` +
        (_ag.error ? '<p class="ag-error" role="alert">No se pudo conectar con el servidor. Revisá que esté en funcionamiento.</p>' : '');
}

function agMes(delta) {
    agCerrarPanel();
    _ag.mes = new Date(_ag.mes.getFullYear(), _ag.mes.getMonth() + delta, 1);
    _agRecargar();
}

function agHoy() {
    agCerrarPanel();
    const h = new Date();
    _ag.mes = new Date(h.getFullYear(), h.getMonth(), 1);
    _agRecargar();
}

// ══ SELECCIÓN DE FECHA: el casillero se destaca y el fondo se desenfoca ══
async function seleccionarFecha(iso) {
    if (_ag.sel === iso) { agCerrarPanel(); return; }
    const d = _agParse(iso);
    if (d.getMonth() !== _ag.mes.getMonth() || d.getFullYear() !== _ag.mes.getFullYear()) {
        _ag.mes = new Date(d.getFullYear(), d.getMonth(), 1);
        await _agRecargar();
    }
    _ag.sel = iso;
    _ag.itemId = null;
    _ag.paso = 'form';
    _ag.borrador = null;
    _ag.detalle = null;
    _agAplicarFoco();
    // Si la fecha ya tiene un solo elemento, se abre directo (editar / ver respuestas)
    const delDia = _ag.items.filter(i => i.fecha === iso);
    if (delDia.length === 1) agVerItem(delDia[0].id);
    else _agRenderLado();
}

function _agAplicarFoco() {
    document.querySelectorAll('.ag-dia.ag-sel').forEach(e => e.classList.remove('ag-sel'));
    if (_ag.sel) {
        const el = document.querySelector(`.ag-dia[data-fecha="${_ag.sel}"]`);
        if (el) el.classList.add('ag-sel');
    }
    const velo = document.getElementById('ag-velo');
    if (velo) velo.classList.toggle('ag-velo-on', !!_ag.sel);
}

function agCerrarPanel() {
    if (!_ag.sel && !_ag.borrador) { _agAplicarFoco(); return; }
    _ag.sel = null;
    _ag.itemId = null;
    _ag.paso = 'form';
    _ag.borrador = null;
    _ag.detalle = null;
    _agAplicarFoco();
    _agRenderLado();
}

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('prof-modal');
    if (modal && modal.style.display !== 'none') return;     // primero se cierra el modal
    if (_ag.sel) agCerrarPanel();
});

// El panel flota junto al casillero tocado: a la derecha si entra, si no a la izquierda
function _agPosicionarLado() {
    const lado = document.getElementById('ag-lado');
    if (!lado || !_ag.sel) return;
    if (window.innerWidth <= 900) {                  // en pantallas chicas es una hoja inferior (CSS)
        lado.style.left = lado.style.top = lado.style.width = '';
        return;
    }
    const celda = document.querySelector('.ag-dia.ag-sel');
    if (!celda) return;
    const r = celda.getBoundingClientRect();
    const ancho = Math.min(380, window.innerWidth - 24);
    const alto = lado.offsetHeight;
    const hueco = 22, margen = 12;
    let left = r.right + hueco;
    if (left + ancho > window.innerWidth - margen) left = r.left - hueco - ancho;
    left = Math.max(margen, Math.min(left, window.innerWidth - ancho - margen));
    let top = r.top + r.height / 2 - alto / 2;
    top = Math.max(margen, Math.min(top, window.innerHeight - alto - margen));
    lado.style.left = left + 'px';
    lado.style.top = top + 'px';
    lado.style.width = ancho + 'px';
}
window.addEventListener('resize', _agPosicionarLado);
window.addEventListener('scroll', _agPosicionarLado, { passive: true });

// ══ PANEL DE LA DERECHA ══
function _agFechaLarga(iso) {
    const d = _agParse(iso);
    return {
        dia: _agCap(`${_AG_DIAS[(d.getDay() + 6) % 7]} ${d.getDate()} de ${_AG_MESES[d.getMonth()]}`),
        anio: d.getFullYear()
    };
}

function _agItemAbierto() {
    return _ag.items.find(i => i.id === _ag.itemId) || null;
}

function _agBase() {
    if (_ag.borrador) return _ag.borrador;
    const it = _ag.tipo === 'privada' ? _agItemAbierto() : null;
    return it
        ? { titulo: it.titulo, descripcion: it.descripcion || '', color: it.color }
        : { titulo: '', descripcion: '', color: 'c3' };
}

function _agFormValores() {
    const t = document.getElementById('ag-f-titulo');
    const d = document.getElementById('ag-f-desc');
    const sel = document.querySelector('.ag-colores .ag-sw.on');
    return {
        titulo: t ? t.value.trim() : '',
        descripcion: d ? d.value.trim() : '',
        color: sel ? sel.dataset.color : 'c3'
    };
}

function _agRenderLado() {
    const lado = document.getElementById('ag-lado');
    if (!lado) return;
    if (!_ag.sel) {
        // Sin fecha tocada no se muestra nada: el calendario ocupa todo el ancho
        lado.classList.remove('ag-lado-activo');
        lado.innerHTML = '';
        lado.style.left = lado.style.top = lado.style.width = '';
        return;
    }
    lado.classList.add('ag-lado-activo');
    const f = _agFechaLarga(_ag.sel);
    const cabecera = `
        <div class="ag-lado-head">
            <div><span class="ag-lado-fecha">${f.dia}</span><span class="ag-lado-anio">${f.anio}</span></div>
            <button type="button" class="ag-cerrar" onclick="agCerrarPanel()" aria-label="Cerrar">✕</button>
        </div>`;
    let cuerpo = '';
    if (_ag.paso === 'destinatarios') cuerpo = _agHtmlDestinatarios();
    else if (_ag.paso === 'detalle')  cuerpo = _agHtmlDetalle();
    else                              cuerpo = _agHtmlForm();
    lado.innerHTML = cabecera + cuerpo;
    _agPosicionarLado();
    if (!_agObserva.on && typeof ResizeObserver !== 'undefined') {
        // si el panel crece (aparecen la descripción, los colores, la lista de docentes…) se reubica
        _agObserva.on = true;
        new ResizeObserver(() => _agPosicionarLado()).observe(lado);
    }
    if (_ag.paso === 'form') {
        const t = document.getElementById('ag-f-titulo');
        if (t && !t.value) setTimeout(() => t.focus(), 60);
    }
    if (_ag.paso === 'destinatarios') _agPintarDocs();
}

function _agHtmlExistentes() {
    const delDia = _ag.items.filter(i => i.fecha === _ag.sel);
    if (!delDia.length) return '';
    const enAvisos = _ag.tipo === 'avisos';
    return `
        <div class="ag-existentes">
            <span class="ag-label">En esta fecha</span>
            ${delDia.map(it => `
                <button type="button" class="ag-ex${it.id === _ag.itemId ? ' on' : ''}" onclick="agVerItem(${it.id})">
                    <i class="ag-dot ag-${it.color}"></i>
                    <span class="ag-ex-tit">${_motEsc(it.titulo)}</span>
                    ${enAvisos ? `<small class="ag-ex-meta">${it.van + it.no_van} de ${it.total} respondieron</small>` : ''}
                </button>`).join('')}
            ${(!enAvisos && _ag.itemId) ? '<button type="button" class="ag-link" onclick="agNuevoItem()">+ Agregar otra fecha</button>' : ''}
        </div>`;
}

function _agHtmlForm() {
    const base = _agBase();
    const enAvisos = _ag.tipo === 'avisos';
    const visible = base.titulo.trim() ? ' ag-visible' : '';
    const editando = !enAvisos && _ag.itemId;
    // "Mi agenda" es privada: solo se guarda. Enviar a docentes existe únicamente en "Avisos a docentes".
    const botones = enAvisos
        ? '<button type="button" class="btn-curso-mini activo" onclick="agIrADestinatarios()">Enviar a docentes</button>'
        : '<button type="button" class="btn-curso-mini activo" id="ag-btn-guardar" onclick="agGuardarFecha()">Guardar fecha</button>';
    return `
        ${_agHtmlExistentes()}
        <label class="ag-pregunta" for="ag-f-titulo">${enAvisos ? '¿Qué querés avisar a los docentes?' : '¿Qué querés recordar en esta fecha?'}</label>
        <input type="text" id="ag-f-titulo" class="prof-input" maxlength="150" autocomplete="off"
               placeholder="${enAvisos ? 'Ej.: Reunión de profesores' : 'Ej.: Entregar el informe'}"
               value="${_agAttr(base.titulo)}" oninput="agTituloInput()">
        <div class="ag-resto${visible}" id="ag-resto">
            <label class="ag-pregunta" for="ag-f-desc">Descripción <span class="ag-opc">(opcional)</span></label>
            <textarea id="ag-f-desc" class="prof-input ag-textarea" maxlength="1000" rows="4"
                      placeholder="Contá los detalles: hora, lugar, qué hay que llevar…">${_motEsc(base.descripcion)}</textarea>
            <div class="ag-botones ag-botones-uno">${botones}</div>
            <span class="ag-label">Elegí un color</span>
            <div class="ag-colores" role="group" aria-label="Color de la fecha">
                ${_AG_COLORES.map(c => `
                    <button type="button" class="ag-sw ag-${c.id}${c.id === base.color ? ' on' : ''}" data-color="${c.id}"
                            onclick="agElegirColor('${c.id}')" title="${c.nombre}" aria-label="${c.nombre}"></button>`).join('')}
            </div>
            ${editando ? '<button type="button" class="ag-link ag-link-peligro" onclick="agEliminarItem()">Eliminar esta fecha</button>' : ''}
        </div>
        <p class="ag-msg" id="ag-msg" role="alert"></p>`;
}

// Las preguntas van apareciendo a medida que se completa la anterior
function agTituloInput() {
    const t = document.getElementById('ag-f-titulo');
    const r = document.getElementById('ag-resto');
    if (!t || !r) return;
    r.classList.toggle('ag-visible', t.value.trim().length > 0);
    _agMsg('');
}

function agElegirColor(id) {
    document.querySelectorAll('.ag-colores .ag-sw').forEach(b => b.classList.toggle('on', b.dataset.color === id));
}

function agNuevoItem() {
    _ag.itemId = null;
    _ag.borrador = null;
    _agRenderLado();
}

async function agVerItem(id) {
    _ag.itemId = id;
    _ag.borrador = null;
    if (_ag.tipo === 'privada') {
        _ag.paso = 'form';
        _agRenderLado();
        return;
    }
    _ag.paso = 'detalle';
    _ag.detalle = null;
    _agRenderLado();
    try {
        const d = await _profLlamar(`${API}/dir/agenda/avisos/${id}`);
        if (_ag.itemId !== id || _ag.paso !== 'detalle') return;
        _ag.detalle = d;
    } catch (e) {
        if (_ag.itemId !== id) return;
        _ag.detalle = { error: e.message };
    }
    _agRenderLado();
}

// Si hay un filtro de color activo y lo recién guardado es de otro color, se muestran todas
// (si no, la fecha se guardaría pero quedaría oculta)
function _agMostrarColor(color) {
    if (_ag.filtro && _ag.filtro !== color) {
        _ag.filtro = null;
        _agRenderFiltros();
    }
}

// ── Guardar en el calendario propio ──
async function agGuardarFecha() {
    const v = _agFormValores();
    if (!v.titulo) { _agMsg('Escribí un título para la fecha.'); return; }
    const btn = document.getElementById('ag-btn-guardar');
    if (btn) btn.disabled = true;
    try {
        const cuerpo = JSON.stringify({ fecha: _ag.sel, titulo: v.titulo, descripcion: v.descripcion, color: v.color });
        const url = _ag.itemId ? `${API}/dir/agenda/fechas/${_ag.itemId}` : `${API}/dir/agenda/fechas`;
        await _profLlamar(url, { method: _ag.itemId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo });
        const eraNueva = !_ag.itemId;
        _agMostrarColor(v.color);
        agCerrarPanel();
        _agToast(eraNueva ? 'Fecha guardada en tu agenda' : 'Fecha actualizada');
        await _agRecargar();
    } catch (e) {
        _agMsg(e.message || 'No se pudo guardar la fecha.');
        if (btn) btn.disabled = false;
    }
}

function agEliminarItem() {
    const it = _agItemAbierto();
    if (!it) return;
    _abrirModalProf({
        titulo: 'Eliminar fecha',
        sub: it.titulo,
        cuerpo: '<p class="prof-modal-texto">¿Seguro que querés eliminar esta fecha de tu agenda?</p>',
        okTexto: 'Eliminar',
        peligro: true,
        onOk: async () => {
            await _profLlamar(`${API}/dir/agenda/fechas/${it.id}`, { method: 'DELETE' });
            agCerrarPanel();
            _agToast('Fecha eliminada');
            await _agRecargar();
        }
    });
}

// ── Enviar a docentes: primero se elige a quién ──
async function agIrADestinatarios() {
    const v = _agFormValores();
    if (!v.titulo) { _agMsg('Escribí un título para el aviso.'); return; }
    if (_ag.sel < _agHoy()) { _agMsg('Para avisar a los docentes elegí una fecha de hoy en adelante.'); return; }
    _ag.borrador = v;
    _ag.paso = 'destinatarios';
    _ag.destino = 'todos';
    _ag.docSel = new Set();
    _ag.docBusca = '';
    _agRenderLado();
    if (!_ag.docs) {
        try {
            const lista = await _profLlamar(`${API}/dir/profesores-lista`);
            _ag.docs = Array.isArray(lista) ? lista : [];
        } catch (e) {
            _ag.docs = [];
            _agMsg('No se pudo traer la lista de docentes.');
        }
        if (_ag.paso === 'destinatarios') _agRenderLado();
    }
}

function _agHtmlDestinatarios() {
    const b = _ag.borrador || { titulo: '', color: 'c3' };
    const total = _ag.docs ? _ag.docs.length : 0;
    return `
        <div class="ag-resumen">
            <i class="ag-dot ag-${b.color}"></i>
            <span class="ag-resumen-tit">${_motEsc(b.titulo)}</span>
        </div>
        <p class="ag-pregunta">¿A quién se lo enviamos?</p>
        <div class="ag-destinos" role="group" aria-label="Destinatarios">
            <button type="button" class="ag-destino${_ag.destino === 'todos' ? ' on' : ''}" onclick="agDestino('todos')">
                <strong>Todos los docentes</strong><small>${total ? total + ' en total' : 'Cargando…'}</small>
            </button>
            <button type="button" class="ag-destino${_ag.destino === 'elegir' ? ' on' : ''}" onclick="agDestino('elegir')">
                <strong>Elegir docentes</strong><small>Uno o varios</small>
            </button>
        </div>
        <div class="ag-docs" id="ag-docs" style="display:${_ag.destino === 'elegir' ? 'block' : 'none'};">
            <input type="text" id="ag-docs-buscar" class="prof-input" placeholder="Buscar docente…" autocomplete="off"
                   value="${_agAttr(_ag.docBusca)}" oninput="agBuscarDocs(this.value)">
            <div class="ag-docs-barra">
                <span id="ag-docs-cant"></span>
                <button type="button" class="ag-link" onclick="agTodosDocs()">Seleccionar todos</button>
            </div>
            <div class="ag-docs-lista" id="ag-docs-lista"></div>
        </div>
        <div class="ag-botones">
            <button type="button" class="btn-curso-mini" onclick="agVolverForm()">← Volver</button>
            <button type="button" class="btn-curso-mini activo" id="ag-btn-enviar" onclick="agEnviar()">Enviar</button>
        </div>
        <p class="ag-msg" id="ag-msg" role="alert"></p>`;
}

function agDestino(que) {
    _ag.destino = que;
    document.querySelectorAll('.ag-destino').forEach((b, i) => b.classList.toggle('on', (i === 0) === (que === 'todos')));
    const cont = document.getElementById('ag-docs');
    if (cont) cont.style.display = que === 'elegir' ? 'block' : 'none';
    _agMsg('');
}

function _agPintarDocs() {
    const lista = document.getElementById('ag-docs-lista');
    if (!lista) return;
    const q = _normBusqueda(_ag.docBusca);
    const docs = (_ag.docs || []).filter(d => !q || _normBusqueda(`${d.apellido} ${d.nombre}`).includes(q));
    lista.innerHTML = docs.length
        ? docs.map(d => `
            <label class="ag-doc">
                <input type="checkbox" value="${d.id_profesor}" ${_ag.docSel.has(d.id_profesor) ? 'checked' : ''}
                       onchange="agToggleDoc(${d.id_profesor}, this.checked)">
                <span>${_motEsc(d.apellido)}, ${_motEsc(d.nombre)}</span>
            </label>`).join('')
        : '<p class="ag-docs-vacio">No hay docentes que coincidan.</p>';
    _agContarDocs();
}

function _normBusqueda(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function _agContarDocs() {
    const c = document.getElementById('ag-docs-cant');
    if (c) c.textContent = `${_ag.docSel.size} ${_ag.docSel.size === 1 ? 'seleccionado' : 'seleccionados'}`;
}

function agBuscarDocs(txt) { _ag.docBusca = txt; _agPintarDocs(); }

function agToggleDoc(id, on) {
    if (on) _ag.docSel.add(id); else _ag.docSel.delete(id);
    _agContarDocs();
    _agMsg('');
}

function agTodosDocs() {
    const q = _normBusqueda(_ag.docBusca);
    (_ag.docs || []).filter(d => !q || _normBusqueda(`${d.apellido} ${d.nombre}`).includes(q))
        .forEach(d => _ag.docSel.add(d.id_profesor));
    _agPintarDocs();
}

function agVolverForm() {
    _ag.paso = 'form';
    _agRenderLado();
}

async function agEnviar() {
    if (_ag.enviando) return;
    const b = _ag.borrador;
    if (!b) return;
    const docentes = _ag.destino === 'todos' ? 'todos' : [..._ag.docSel];
    if (docentes !== 'todos' && !docentes.length) { _agMsg('Elegí al menos un docente.'); return; }
    _ag.enviando = true;
    const btn = document.getElementById('ag-btn-enviar');
    if (btn) btn.disabled = true;
    try {
        const r = await _profLlamar(`${API}/dir/agenda/avisos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha: _ag.sel, titulo: b.titulo, descripcion: b.descripcion, color: b.color, docentes })
        });
        const n = r.enviados || 0;
        _agMostrarColor(b.color);
        agCerrarPanel();
        _agToast(`Aviso enviado a ${n} ${n === 1 ? 'docente' : 'docentes'}`);
        await _agRecargar();
    } catch (e) {
        _agMsg(e.message || 'No se pudo enviar el aviso.');
        if (btn) btn.disabled = false;
    } finally {
        _ag.enviando = false;
    }
}

// ── Detalle de un aviso enviado: quién se anotó y quién no ──
function _agHtmlDetalle() {
    const it = _ag.items.find(i => i.id === _ag.itemId);
    const d = _ag.detalle;
    const volver = '<button type="button" class="ag-link ag-volver" onclick="agVolverLista()">← Volver a esta fecha</button>';
    if (!d) return `${volver}<p class="ag-docs-vacio">Cargando respuestas…</p>`;
    if (d.error) return `${volver}<p class="ag-msg" role="alert">${_motEsc(d.error)}</p>`;

    const grupo = (clave, titulo, clase) => {
        const gente = d.docentes.filter(x => x.asistencia === clave);
        return `
            <div class="ag-grupo">
                <div class="ag-grupo-tit"><span class="ag-estado ${clase}">${titulo}</span><b>${gente.length}</b></div>
                ${gente.length
                    ? `<ul class="ag-grupo-lista">${gente.map(x => `<li>${_motEsc(x.apellido)}, ${_motEsc(x.nombre)}</li>`).join('')}</ul>`
                    : '<p class="ag-grupo-vacio">Nadie por ahora.</p>'}
            </div>`;
    };
    return `
        ${volver}
        <div class="ag-det-cab">
            <i class="ag-dot ag-${d.color}"></i>
            <h4 class="ag-det-tit">${_motEsc(d.titulo)}</h4>
        </div>
        ${d.descripcion ? `<p class="ag-det-desc">${_motEsc(d.descripcion)}</p>` : ''}
        <p class="ag-det-para">${d.para_todos ? 'Enviado a todos los docentes' : `Enviado a ${d.docentes.length} ${d.docentes.length === 1 ? 'docente' : 'docentes'}`}</p>
        <div class="ag-grupos">
            ${grupo('si', 'Van', 'ag-est-si')}
            ${grupo('no', 'No van', 'ag-est-no')}
            ${grupo('pendiente', 'Sin responder', 'ag-est-pend')}
        </div>
        <button type="button" class="ag-link ag-link-peligro" onclick="agEliminarAviso(${d.id})">Eliminar aviso</button>`;
}

function agVolverLista() {
    _ag.paso = 'form';
    _ag.itemId = null;
    _ag.detalle = null;
    _agRenderLado();
}

function agEliminarAviso(id) {
    const it = _ag.items.find(i => i.id === id);
    _abrirModalProf({
        titulo: 'Eliminar aviso',
        sub: it ? it.titulo : '',
        cuerpo: '<p class="prof-modal-texto">¿Seguro que querés eliminar este aviso? Los docentes dejan de verlo y se pierden sus respuestas.</p>',
        okTexto: 'Eliminar',
        peligro: true,
        onOk: async () => {
            await _profLlamar(`${API}/dir/agenda/avisos/${id}`, { method: 'DELETE' });
            agCerrarPanel();
            _agToast('Aviso eliminado');
            await _agRecargar();
        }
    });
}

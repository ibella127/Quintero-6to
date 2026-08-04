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
const HORA_ENTRADA = '07:40';

let faltasData    = [];
let tardanzasData = [];

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
        // Cargar estadísticas generales automáticamente
        seleccionarCurso(0, document.querySelector('#panel-estadisticas .btn-curso'));
    } else {
        err.style.display = 'block';
        document.getElementById('password-input').value = '';
    }
}

function cerrarSesion() {
    document.getElementById('panel-screen').style.display  = 'none';
    document.getElementById('login-screen').style.display  = 'block';
    document.getElementById('password-input').value = '';
    faltasData = []; tardanzasData = [];
}

// ══════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════
function cambiarPestania(tab) {
    ['estadisticas','faltas','tardanzas','tendencias','tendencias-faltas'].forEach(t => {
        document.getElementById('panel-' + t).style.display = t === tab ? 'block' : 'none';
        const btn = document.getElementById('tab-' + t);
        if (btn) btn.classList.toggle('tab-activa', t === tab);
    });
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function topN(arr, n) {
    const freq = {};
    arr.forEach(m => { if (m) freq[m.trim().toLowerCase()] = (freq[m.trim().toLowerCase()]||0)+1; });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([m])=>m);
}

function renderMotivosBarras(contenedorId, motivosArr, tipo) {
    const cont = document.getElementById(contenedorId);
    const limpios = motivosArr.filter(Boolean);
    if (!limpios.length) {
        cont.innerHTML = '<p class="instruccion">Sin datos registrados</p>';
        return;
    }
    const freq = {};
    limpios.forEach(m => {
        const key = m.trim().toLowerCase();
        freq[key] = (freq[key] || 0) + 1;
    });
    const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,8);
    const max = sorted[0][1];

    let html = '<div class="motivos-lista">';
    sorted.forEach(([motivo, count], i) => {
        const pct = Math.round((count / max) * 100);
        const clsBarra = tipo === 'barra-verde' ? 'barra-verde' : (tipo === 'barra-amber' ? 'barra-amber' : '');
        html += `
        <div class="motivo-item">
            <div class="motivo-rank">${i+1}</div>
            <div class="motivo-barra-wrap">
                <div class="motivo-texto">${motivo}</div>
                <div class="motivo-barra-bg">
                    <div class="motivo-barra-fill ${clsBarra}" style="width:0%"
                         data-pct="${pct}"></div>
                </div>
            </div>
            <div class="motivo-count">${count}<span class="motivo-count-label">veces</span></div>
        </div>`;
    });
    html += '</div>';
    cont.innerHTML = html;
    // Animar barras
    requestAnimationFrame(() => {
        cont.querySelectorAll('.motivo-barra-fill').forEach(el => {
            el.style.width = el.dataset.pct + '%';
        });
    });
}

// ══════════════════════════════════════════════
//  RENDER MOTIVOS EN DOS SUBSECCIONES (mismo div)
// ══════════════════════════════════════════════
function buildBarrasHtml(motivosArr, tipo, startRank) {
    const limpios = motivosArr.filter(Boolean);
    if (!limpios.length) return '<p class="instruccion" style="font-size:0.85rem;margin:6px 0 0;">Sin datos registrados</p>';
    const freq = {};
    limpios.forEach(m => { const k = m.trim().toLowerCase(); freq[k] = (freq[k]||0)+1; });
    const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const max = sorted[0][1];
    const clsBarra = tipo === 'barra-verde' ? 'barra-verde' : (tipo === 'barra-amber' ? 'barra-amber' : '');
    let html = '';
    sorted.forEach(([motivo, count], i) => {
        const pct = Math.round((count / max) * 100);
        html += `
        <div class="motivo-item">
            <div class="motivo-rank">${startRank + i}</div>
            <div class="motivo-barra-wrap">
                <div class="motivo-texto">${motivo}</div>
                <div class="motivo-barra-bg">
                    <div class="motivo-barra-fill ${clsBarra}" style="width:0%" data-pct="${pct}"></div>
                </div>
            </div>
            <div class="motivo-count">${count}<span class="motivo-count-label">veces</span></div>
        </div>`;
    });
    return html;
}

/* Versión enriquecida para avisos de preceptoría — muestra columnas extra */
function buildAvisosEnriquecidosHtml(avisosArr) {
    if (!avisosArr.length) return '<p class="instruccion" style="font-size:0.85rem;margin:6px 0 0;">Sin datos registrados</p>';

    // Agrupar por motivo
    const grupos = {};
    avisosArr.forEach(av => {
        const key = (av.motivo || '').trim().toLowerCase() || '(sin motivo)';
        if (!grupos[key]) {
            grupos[key] = { motivo: key, total: 0, anotados: 0, fechas: new Set(), cursos: new Set(), totalCurso: 0 };
        }
        grupos[key].total++;
        if (av.anotado)     grupos[key].anotados++;
        if (av.fecha)       grupos[key].fechas.add(av.fecha);
        if (av.anio)        grupos[key].cursos.add(av.anio);
        if (av.total_curso) grupos[key].totalCurso = Math.max(grupos[key].totalCurso, av.total_curso);
    });

    const sorted = Object.values(grupos).sort((a, b) => b.total - a.total).slice(0, 8);
    const max = sorted[0].total;

    const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const formatFecha = f => {
        if (!f) return '—';
        const d = new Date(f + 'T00:00:00');
        if (isNaN(d)) return f;
        return `${d.getDate()} ${MESES_ES[d.getMonth()]}`;
    };

    let html = '<div class="avisos-prece-tabla">';
    html += `
    <div class="avisos-prece-header">
        <span class="ap-col-rank">ID</span>
        <span class="ap-col-motivo">Motivo</span>
        <span class="ap-col-fecha">Fecha</span>
        <span class="ap-col-curso">Curso</span>
        <span class="ap-col-alumnos-total">Alumnos</span>
        <span class="ap-col-alumnos">Lo anotaron</span>
    </div>`;

    sorted.forEach((g, i) => {
        const pct = Math.round((g.total / max) * 100);

        // Fecha más reciente del aviso (la que cargó el preceptor)
        const fechasArr = Array.from(g.fechas).sort().reverse();
        const ultimaFecha = fechasArr.length ? formatFecha(fechasArr[0]) : '—';

        const cursosChips = Array.from(g.cursos).sort().map(c =>
            `<span class="chip-curso-mini">${c}°</span>`).join('');

        html += `
        <div class="avisos-prece-fila">
            <span class="ap-col-rank motivo-rank">${i + 1}</span>
            <div class="ap-col-motivo">
                <div class="motivo-texto">${g.motivo}</div>
                <div class="motivo-barra-bg">
                    <div class="motivo-barra-fill" style="width:0%" data-pct="${pct}"></div>
                </div>
            </div>
            <span class="ap-col-fecha ap-meta">${ultimaFecha}</span>
            <span class="ap-col-curso ap-meta">${cursosChips || '—'}</span>
            <span class="ap-col-alumnos-total ap-meta-num">${g.totalCurso || '—'}</span>
            <span class="ap-col-alumnos ap-meta-num">${g.anotados}</span>
        </div>`;
    });

    html += '</div>';
    return html;
}

// avisosPreceptor: array de objetos { motivo, fecha, anio, alumno_gmail/gmail }
// motivosAlumnos:  array de strings (motivos planos)
function renderMotivosDual(contenedorId, motivosAlumnos, avisosPreceptorObjs, tipo) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;

    // Compatibilidad: si se pasan strings en lugar de objetos, los envolvemos
    const avisosObjs = (avisosPreceptorObjs || []).map(x =>
        typeof x === 'string' ? { motivo: x } : x
    );

    const hayAlumnos = motivosAlumnos.filter(Boolean).length > 0;
    const hayPrece   = avisosObjs.filter(x => x && x.motivo).length > 0;

    if (!hayAlumnos && !hayPrece) {
        cont.innerHTML = '<p class="instruccion">Sin datos registrados</p>';
        return;
    }

    let html = '<div class="motivos-lista">';

    if (hayAlumnos) {
        html += `<div class="motivos-subseccion-titulo">Motivos subidos por alumnos</div>`;
        html += buildBarrasHtml(motivosAlumnos, tipo, 1);
    }

    if (hayPrece) {
        html += `<div class="motivos-subseccion-titulo" style="${hayAlumnos ? 'margin-top:1.4rem;' : ''}">Avisos cargados por preceptoría</div>`;
        html += buildAvisosEnriquecidosHtml(avisosObjs.filter(x => x && x.motivo));
    }

    html += '</div>';
    cont.innerHTML = html;

    requestAnimationFrame(() => {
        cont.querySelectorAll('.motivo-barra-fill').forEach(el => {
            el.style.width = el.dataset.pct + '%';
        });
    });
}

// ══════════════════════════════════════════════
//  ESTADÍSTICAS GENERALES
// ══════════════════════════════════════════════
async function seleccionarCurso(anio, btnEl) {
    document.querySelectorAll('#panel-estadisticas .btn-curso').forEach(b => b.classList.remove('activo'));
    if (btnEl) btnEl.classList.add('activo');

    const label = anio === 0 ? 'Todos los cursos' : `${anio}° Año`;
    document.getElementById('motivos-curso-label').textContent = label;
    document.getElementById('faltas-curso-label').textContent  = label;

    document.getElementById('stat-total').textContent     = '…';
    document.getElementById('stat-presentes').textContent  = '…';
    document.getElementById('stat-ausentes').textContent   = '…';
    document.getElementById('stat-tardes').textContent     = '…';
    document.getElementById('motivos-frecuentes').innerHTML = '<p class="instruccion">Cargando...</p>';
    document.getElementById('faltas-frecuentes').innerHTML  = '<p class="instruccion">Cargando...</p>';

    try {
        const cursos = anio === 0 ? [1,2,3,4,5,6] : [anio];
        let totalAlumnos = 0, totalPresentes = 0, totalTardes = 0, totalAusentes = 0;
        let motivosAlumnos = [], motivosPreceptor = [];

        // ── Estadísticas de hoy desde el escáner QR (endpoint real)
        const statsPromises = cursos.map(c => fetch(`${API}/dir/asistencia-hoy/${c}`).then(r => r.ok ? r.json() : {}));
        const statsArr = await Promise.all(statsPromises);
        statsArr.forEach(s => {
            totalAlumnos  += s.total     || 0;
            totalPresentes += s.presentes || 0;
            totalTardes   += s.tardes    || 0;
            totalAusentes += s.ausentes  || 0;
        });

        // ── Motivos subidos por alumnos (tabla motivos_tardanza) → tardanzas
        // ── Avisos de preceptoría (tabla avisos_tardanza) → tardanzas con justificación del prece
        for (const c of cursos) {
            const resMotivos = await fetch(`${API}/prece/motivos?anio=${c}`);
            if (resMotivos.ok) {
                const mots = await resMotivos.json();
                mots.forEach(al => (al.motivos||[]).forEach(m => {
                    if (m.motivo) motivosAlumnos.push(m.motivo);
                }));
            }

            const resAvisos = await fetch(`${API}/prece/avisos?anio=${c}`);
            if (resAvisos.ok) {
                const avs = await resAvisos.json();
                if (Array.isArray(avs)) {
                    avs.forEach(av => {
                        if (av.motivo) motivosPreceptor.push({ ...av, anio: c });
                    });
                }
            }
        }

        document.getElementById('stat-total').textContent     = totalAlumnos;
        document.getElementById('stat-presentes').textContent = totalPresentes;
        document.getElementById('stat-ausentes').textContent  = totalAusentes;
        document.getElementById('stat-tardes').textContent    = totalTardes;

        // Tardanzas: dos subsecciones en el mismo div
        renderMotivosDual('motivos-frecuentes', motivosAlumnos, motivosPreceptor, '');
        // Ausencias: sin fuente de motivos aún
        document.getElementById('faltas-frecuentes').innerHTML =
            '<p class="instruccion" style="color:var(--ink-muted);font-size:0.9rem;">Los motivos de ausencia se registran cuando el alumno justifica su falta.</p>';

    } catch(e) {
        console.error('Error stats:', e);
        document.getElementById('stat-total').textContent     = '—';
        document.getElementById('stat-presentes').textContent = '—';
        document.getElementById('stat-ausentes').textContent  = '—';
        document.getElementById('stat-tardes').textContent    = '—';
        document.getElementById('motivos-frecuentes').innerHTML = '<p class="instruccion">Error al conectar con el servidor</p>';
        document.getElementById('faltas-frecuentes').innerHTML  = '<p class="instruccion">Error al conectar con el servidor</p>';
    }
}

// ══════════════════════════════════════════════
//  FALTAS POR ALUMNO
//  Usa: GET /alumnos/<anio>  y  GET /prece/motivos?anio=N
// ══════════════════════════════════════════════
async function verFaltasCurso(anio, btnEl) {
    document.querySelectorAll('#selector-faltas-curso .btn-curso-mini').forEach(b => b.classList.remove('activo'));
    if (btnEl) btnEl.classList.add('activo');

    const cont = document.getElementById('faltas-contenedor');
    cont.innerHTML = '<p class="instruccion">Cargando...</p>';
    faltasData = [];

    try {
        // ── Ausencias reales del escáner QR (días sin ingreso en días hábiles)
        const resFaltas = await fetch(`${API}/dir/faltas-alumno/${anio}`);
        const faltas = resFaltas.ok ? await resFaltas.json() : [];

        // ── Motivos subidos por los alumnos (para mostrar chips)
        const resMotivos = await fetch(`${API}/prece/motivos?anio=${anio}`);
        const motivosMapa = {};
        if (resMotivos.ok) {
            const mots = await resMotivos.json();
            mots.forEach(al => { motivosMapa[al.gmail] = al.motivos || []; });
        }

        faltasData = faltas.map(al => {
            const motivos = motivosMapa[al.gmail] || [];
            const top = topN(motivos.map(m => m.motivo), 3);
            return {
                nombre:     al.nombre,
                apellido:   al.apellido,
                gmail:      al.gmail,
                faltas:     al.ausencias,
                diasHabiles: al.dias_habiles,
                topMotivos: top
            };
        });

        filtrarAlumnos();
    } catch(e) {
        console.error(e);
        cont.innerHTML = '<p class="instruccion">Error al conectar con el servidor</p>';
    }
}

function filtrarAlumnos() {
    const buscar = (document.getElementById('buscar-alumno')?.value || '').toLowerCase();
    const orden  = document.getElementById('orden-faltas')?.value || 'mas';
    const cont   = document.getElementById('faltas-contenedor');

    if (!faltasData.length) { cont.innerHTML = '<p class="instruccion">Sin datos</p>'; return; }

    let datos = faltasData.filter(al =>
        (al.nombre  + ' ' + al.apellido).toLowerCase().includes(buscar) ||
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
        const conMot = al.faltas > 0
            ? `<span class="badge-num badge-ambar">${al.faltas}</span>`
            : `<span class="badge-num badge-verde">0</span>`;
        const tooltip = al.diasHabiles ? `title="Sobre ${al.diasHabiles} días hábiles"` : '';
        html += `
        <div class="dir-fila cols-faltas">
            <div class="dir-fila-nombre">${al.apellido}, ${al.nombre}</div>
            <div class="dir-fila-email">${al.gmail}</div>
            <div><span class="badge-num ${badge}" ${tooltip}>${al.faltas}</span></div>
            <div>${conMot}</div>
            <div class="motivo-chips">${chips || '<span style="font-size:0.78rem;color:var(--ink-muted)">—</span>'}</div>
        </div>`;
    });
    html += '</div>';
    cont.innerHTML = html;
}

// ══════════════════════════════════════════════
//  TARDANZAS
//  Usa: GET /alumnos/<anio>  y  GET /prece/avisos?anio=N
// ══════════════════════════════════════════════
async function verTardanzasCurso(anio, btnEl) {
    document.querySelectorAll('#selector-tardanzas-curso .btn-curso-mini').forEach(b => b.classList.remove('activo'));
    if (btnEl) btnEl.classList.add('activo');

    const cont = document.getElementById('tardanzas-contenedor');
    cont.innerHTML = '<p class="instruccion">Cargando...</p>';
    tardanzasData = [];

    try {
        // ── Tardanzas reales del escáner QR + motivos de avisos de preceptoría
        const resTard = await fetch(`${API}/dir/tardanzas-alumno/${anio}`);
        const tardArr = resTard.ok ? await resTard.json() : [];

        tardanzasData = tardArr.map(al => ({
            nombre:     al.nombre,
            apellido:   al.apellido,
            gmail:      al.gmail,
            tardanzas:  al.tardanzas,
            topMotivos: al.topMotivos || []
        }));

        filtrarTardanzas();
    } catch(e) {
        console.error(e);
        cont.innerHTML = '<p class="instruccion">Error al conectar con el servidor</p>';
    }
}

function filtrarTardanzas() {
    const buscar = (document.getElementById('buscar-alumno-tard')?.value || '').toLowerCase();
    const orden  = document.getElementById('orden-tardanzas')?.value || 'mas';
    const cont   = document.getElementById('tardanzas-contenedor');

    if (!tardanzasData.length) { cont.innerHTML = '<p class="instruccion">Sin datos</p>'; return; }

    let datos = tardanzasData.filter(al =>
        (al.nombre  + ' ' + al.apellido).toLowerCase().includes(buscar) ||
        (al.apellido + ' ' + al.nombre).toLowerCase().includes(buscar)
    );
    if (orden === 'mas')   datos.sort((a,b) => b.tardanzas - a.tardanzas);
    if (orden === 'menos') datos.sort((a,b) => a.tardanzas - b.tardanzas);
    if (orden === 'alfa')  datos.sort((a,b) => a.apellido.localeCompare(b.apellido));

    if (!datos.length) { cont.innerHTML = '<p class="instruccion">No se encontraron alumnos</p>'; return; }

    let html = `
    <div class="dir-tabla">
        <div class="dir-tabla-header cols-tardanzas">
            <span>Alumno</span><span>Correo</span>
            <span>Tardanzas</span><span>Con aviso</span><span>Motivos frecuentes</span>
        </div>`;

    datos.forEach(al => {
        const badge   = al.tardanzas === 0 ? 'badge-verde' : al.tardanzas <= 3 ? 'badge-ambar' : 'badge-rojo';
        const chips   = al.topMotivos.map(m => `<span class="chip-motivo" title="${m}">${m}</span>`).join('');
        const conAviso = al.tardanzas > 0
            ? `<span class="badge-num badge-ambar">${al.tardanzas}</span>`
            : `<span class="badge-num badge-verde">0</span>`;
        html += `
        <div class="dir-fila cols-tardanzas">
            <div class="dir-fila-nombre">${al.apellido}, ${al.nombre}</div>
            <div class="dir-fila-email">${al.gmail}</div>
            <div><span class="badge-num ${badge}">${al.tardanzas}</span></div>
            <div>${conAviso}</div>
            <div class="motivo-chips">${chips || '<span style="font-size:0.78rem;color:var(--ink-muted)">—</span>'}</div>
        </div>`;
    });
    html += '</div>';
    cont.innerHTML = html;
}

// ══════════════════════════════════════════════
//  TENDENCIAS MENSUALES
//  Usa: GET /prece/motivos?anio=N  y  GET /prece/avisos?anio=N
// ══════════════════════════════════════════════
async function verTendencias(anio, btnEl) {
    document.querySelectorAll('#selector-tend-curso .btn-curso-mini').forEach(b => b.classList.remove('activo'));
    if (btnEl) btnEl.classList.add('activo');

    const cont = document.getElementById('tendencias-contenedor');
    cont.innerHTML = '<p class="instruccion">Cargando...</p>';

    try {
        const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const labelMes = ym => {
            if (!ym) return '';
            const [y, m] = ym.split('-');
            return `${MESES_ES[parseInt(m)-1]} ${y}`;
        };

        const res = await fetch(`${API}/dir/tendencias/${anio}`);
        if (!res.ok) throw new Error('Error al obtener tendencias');
        const datos = await res.json();

        if (!datos.length) {
            cont.innerHTML = '<p class="instruccion">Sin datos registrados para este curso</p>';
            return;
        }

        let html = '';
        datos.forEach(d => {
            html += `
            <div class="tend-mes-bloque">
                <div class="tend-mes-titulo">${labelMes(d.mes)}</div>
                <div class="tend-stats-row">
                    <div class="tend-mini-card">
                        <div class="tend-mini-num" style="color:var(--ambar)">${d.tardanzas}</div>
                        <div class="tend-mini-label">Llegadas<br>tarde</div>
                    </div>
                    ${d.topMotivos.length ? `
                    <div class="tend-mini-card" style="align-items:flex-start;min-width:180px;">
                        <div class="tend-mini-label" style="margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Top motivos</div>
                        <div class="motivo-chips">${d.topMotivos.map(m => `<span class="chip-motivo" title="${m}">${m}</span>`).join('')}</div>
                    </div>` : ''}
                </div>
            </div>`;
        });

        cont.innerHTML = html;

    } catch(e) {
        console.error(e);
        cont.innerHTML = '<p class="instruccion">Error al conectar con el servidor</p>';
    }
}

// ══════════════════════════════════════════════
//  TENDENCIAS FALTAS
//  Usa: GET /dir/tendencias-faltas/<anio>
// ══════════════════════════════════════════════
async function verTendenciasFaltas(anio, btnEl) {
    document.querySelectorAll('#selector-tend-faltas-curso .btn-curso-mini').forEach(b => b.classList.remove('activo'));
    if (btnEl) btnEl.classList.add('activo');

    const cont = document.getElementById('tendencias-faltas-contenedor');
    cont.innerHTML = '<p class="instruccion">Cargando...</p>';

    try {
        const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const labelMes = ym => {
            if (!ym) return '';
            const [y, m] = ym.split('-');
            return `${MESES_ES[parseInt(m)-1]} ${y}`;
        };

        const res = await fetch(`${API}/dir/tendencias-faltas/${anio}`);
        if (!res.ok) throw new Error('Error al obtener tendencias de faltas');
        const datos = await res.json();

        if (!datos.length) {
            cont.innerHTML = '<p class="instruccion">Sin datos registrados para este curso</p>';
            return;
        }

        let html = '';
        datos.forEach(d => {
            html += `
            <div class="tend-mes-bloque">
                <div class="tend-mes-titulo">${labelMes(d.mes)}</div>
                <div class="tend-stats-row">
                    <div class="tend-mini-card">
                        <div class="tend-mini-num" style="color:var(--rojo)">${d.ausencias}</div>
                        <div class="tend-mini-label">Ausencias<br>del curso</div>
                    </div>
                    ${d.topMotivos.length ? `
                    <div class="tend-mini-card" style="align-items:flex-start;min-width:180px;">
                        <div class="tend-mini-label" style="margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Top motivos</div>
                        <div class="motivo-chips">${d.topMotivos.map(m => `<span class="chip-motivo" title="${m}">${m}</span>`).join('')}</div>
                    </div>` : ''}
                </div>
            </div>`;
        });

        cont.innerHTML = html;

    } catch(e) {
        console.error(e);
        cont.innerHTML = '<p class="instruccion">Error al conectar con el servidor</p>';
    }
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

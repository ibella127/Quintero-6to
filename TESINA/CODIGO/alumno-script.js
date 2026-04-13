// ══════════════════════════════════════════
//  KRONO — Alumno Script
// ══════════════════════════════════════════

// ── Datos de ejemplo (reemplazar con fetch() a tu BD) ──
// TODO: hacer GET /api/alumno?email=... y reemplazar este objeto
const DATOS_ALUMNO = {
    faltasJustificadas:   [1, 2, 0, 1, 2, 1, 0, 1, 0, 0],   // por mes
    faltasInjustificadas: [0, 1, 1, 0, 0, 1, 0, 0, 1, 0],   // por mes
    clasesSubidas: 6
};

const MESES = ['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ── Login ──
function verificarEmail() {
    const email = document.getElementById('email-input').value.trim().toLowerCase();
    const error = document.getElementById('login-error');

    if (email.endsWith('@escuelasproa.edu.ar')) {
        const usuario = email.split('@')[0];
        sessionStorage.setItem('alumno_email', email);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('panel-screen').style.display = 'block';
        document.getElementById('bienvenida-texto').textContent = `Hola, ${usuario} 👋`;
        error.style.display = 'none';
        iniciarEstadisticas();
    } else {
        error.style.display = 'block';
    }
}

function cerrarSesion() {
    sessionStorage.removeItem('alumno_email');
    document.getElementById('panel-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('email-input').value = '';
    if (window._chartFaltas)    { window._chartFaltas.destroy();    window._chartFaltas    = null; }
    if (window._chartBeneficio) { window._chartBeneficio.destroy(); window._chartBeneficio = null; }
}

document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('email-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') verificarEmail(); });

    const emailGuardado = sessionStorage.getItem('alumno_email');
    if (emailGuardado) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('panel-screen').style.display = 'block';
        document.getElementById('bienvenida-texto').textContent = `Hola, ${emailGuardado.split('@')[0]} 👋`;
        iniciarEstadisticas();
    }

    // Listeners de archivos
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

// ── Vista de curso (solo lectura) ──
function verCurso(anio) {
    const display = document.getElementById('display-datos');
    display.innerHTML = `
        <div class="curso-header">
            <h2 class="curso-titulo">${anio}° Año</h2>
            <span class="curso-badge solo-lectura">Solo lectura</span>
        </div>
        <p class="instruccion" style="font-size:1rem; margin-top:1rem;">
            Cargando datos desde la base de datos...
        </p>
        <div class="placeholder-tabla">
            <div class="placeholder-row header-row">
                <span>Alumno</span><span>Faltas</span><span>Tarde</span>
            </div>
            <div class="placeholder-row">
                <span>— datos de BD —</span><span>—</span><span>—</span>
            </div>
        </div>
        <p class="db-note">📡 Los datos reales se cargarán cuando el backend esté conectado.</p>
    `;
}

// ══════════════════════════════════════════
//  ESTADÍSTICAS
// ══════════════════════════════════════════

function iniciarEstadisticas() {
    const d = DATOS_ALUMNO;
    const totalJust   = d.faltasJustificadas.reduce((a,b) => a+b, 0);
    const totalInjust = d.faltasInjustificadas.reduce((a,b) => a+b, 0);
    const total       = totalJust + totalInjust;
    const fotos       = d.clasesSubidas;

    // Tarjetas resumen
    document.getElementById('stat-total').textContent  = total;
    document.getElementById('stat-injust').textContent = totalInjust;
    document.getElementById('stat-just').textContent   = totalJust;
    document.getElementById('stat-fotos').textContent  = fotos;

    // Calcular % beneficio: base 100, -10 por injust, +2 por foto, mín 0, máx 100
    const pct = Math.min(100, Math.max(0, 100 - totalInjust * 10 + fotos * 2));
    document.getElementById('pct-numero').textContent = pct + '%';

    // Barras de factores
    const maxInjust = 10; // máximo esperado para escalar la barra
    const maxFotos  = 20;
    document.getElementById('barra-injust').style.width = Math.min(100, (totalInjust / maxInjust) * 100) + '%';
    document.getElementById('barra-fotos').style.width  = Math.min(100, (fotos / maxFotos) * 100) + '%';
    document.getElementById('val-injust').textContent = '−' + totalInjust;
    document.getElementById('val-fotos').textContent  = '+' + fotos;

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

    // Pequeño delay para que el DOM esté listo antes de dibujar
    setTimeout(() => {
        dibujarGraficoFaltas(d, totalJust, totalInjust);
        dibujarGraficoBeneficio(pct);
    }, 80);
}

function dibujarGraficoFaltas(d, totalJust, totalInjust) {
    if (window._chartFaltas) window._chartFaltas.destroy();

    const ctx = document.getElementById('grafico-faltas');
    if (!ctx) return;

    window._chartFaltas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: MESES,
            datasets: [
                {
                    label: 'Justificadas',
                    data: d.faltasJustificadas,
                    backgroundColor: 'rgba(45,138,94,0.65)',
                    borderColor: 'rgba(45,138,94,0.9)',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: 'Injustificadas',
                    data: d.faltasInjustificadas,
                    backgroundColor: 'rgba(200,80,80,0.60)',
                    borderColor: 'rgba(200,80,80,0.85)',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} falta${ctx.parsed.y !== 1 ? 's' : ''}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'DM Sans', size: 12 }, color: '#4a5568' }
                },
                y: {
                    beginAtZero: true,
                    max: Math.max(4, Math.max(...d.faltasJustificadas, ...d.faltasInjustificadas) + 1),
                    ticks: {
                        stepSize: 1,
                        font: { family: 'DM Sans', size: 11 },
                        color: '#4a5568'
                    },
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

    // Color del arco según porcentaje
    let colorPct;
    if (pct >= 80)      colorPct = 'rgba(45,138,94,0.85)';
    else if (pct >= 50) colorPct = 'rgba(75,163,217,0.85)';
    else                colorPct = 'rgba(200,80,80,0.85)';

    window._chartBeneficio = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [pct, 100 - pct],
                backgroundColor: [colorPct, 'rgba(200,200,200,0.18)'],
                borderWidth: 0,
                borderRadius: [8, 0],
                hoverOffset: 0
            }]
        },
        options: {
            responsive: false,
            cutout: '72%',
            animation: { animateRotate: true, duration: 900 },
            plugins: {
                legend:  { display: false },
                tooltip: { enabled: false }
            }
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

    // Al enviar, sumar 1 a clases subidas y recalcular beneficio
    DATOS_ALUMNO.clasesSubidas++;
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

/* ── Ocultar header al hacer scroll ── */
(function () {
    const header   = document.querySelector(".sidebar");
    let ultimoScroll = 0;
    let ticking      = false;

    window.addEventListener("scroll", () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollActual = window.scrollY;

                if (scrollActual <= 10) {
                    // Arriba del todo: siempre visible
                    header.classList.remove("header-oculto");
                } else if (scrollActual > ultimoScroll + 6) {
                    // Bajando: esconder
                    header.classList.add("header-oculto");
                } else if (scrollActual < ultimoScroll - 6) {
                    // Subiendo: mostrar
                    header.classList.remove("header-oculto");
                }

                ultimoScroll = scrollActual;
                ticking      = false;
            });
            ticking = true;
        }
    });
})();

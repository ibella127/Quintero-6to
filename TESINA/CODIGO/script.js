
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

    const TOTAL_DOTS  = 18;       // cantidad de puntos en la cola
    const DOT_SIZE    = 7;        // px — diámetro base
    const EASE        = 0.35;     // suavidad del seguimiento (0 = instant, 1 = no se mueve)
    const COLORS      = [
        'rgba(75,163,217,0.85)',
        'rgba(26,111,168,0.75)',
        'rgba(168,212,245,0.70)',
        'rgba(75,163,217,0.55)',
    ];

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // Capturar posición del mouse
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // Crear los puntos
    const dots = Array.from({ length: TOTAL_DOTS }, (_, i) => {
        const el = document.createElement('div');
        const scale = 1 - i * (0.7 / TOTAL_DOTS);           // el último es más chico
        const size  = DOT_SIZE * scale;
        const color = COLORS[i % COLORS.length];

        Object.assign(el.style, {
            position:        'fixed',
            width:           size + 'px',
            height:          size + 'px',
            borderRadius:    '50%',
            background:      color,
            pointerEvents:   'none',
            zIndex:          '9999',
            transform:       'translate(-50%, -50%)',
            transition:      'opacity 0.3s',
            willChange:      'left, top',
            boxShadow:       `0 0 ${size * 1.2}px ${color}`,
        });

        document.body.appendChild(el);

        return {
            el,
            x: mouse.x,
            y: mouse.y,
        };
    });

    // Animación con rAF
    function animate() {
        // El primer punto sigue directo al cursor
        dots[0].x += (mouse.x - dots[0].x) * EASE * 2.2;
        dots[0].y += (mouse.y - dots[0].y) * EASE * 2.2;

        // Cada punto siguiente sigue al anterior
        for (let i = 1; i < TOTAL_DOTS; i++) {
            dots[i].x += (dots[i - 1].x - dots[i].x) * (EASE - i * 0.003);
            dots[i].y += (dots[i - 1].y - dots[i].y) * (EASE - i * 0.003);
        }

        dots.forEach(d => {
            d.el.style.left = d.x + 'px';
            d.el.style.top  = d.y + 'px';
        });

        requestAnimationFrame(animate);
    }

    animate();

    // Ocultar trail cuando el cursor sale de la ventana
    document.addEventListener('mouseleave', () =>
        dots.forEach(d => (d.el.style.opacity = '0'))
    );
    document.addEventListener('mouseenter', () =>
        dots.forEach(d => (d.el.style.opacity = '1'))
    );
})();


// ══════════════════════════════════════════════
//  BLUR PROGRESIVO al scrollear
// ══════════════════════════════════════════════
window.addEventListener('scroll', () => {
    const bgBlur = document.querySelector('.bg-blur');
    let scrollValue = window.scrollY;
    let blurIntensity = scrollValue / 150;
    if (blurIntensity > 8) blurIntensity = 8;
    bgBlur.style.filter = `blur(${blurIntensity}px)`;
});


// ══════════════════════════════════════════════
//  FORMULARIO — envío por el servidor Flask (mismo estilo que los OTP)
// ══════════════════════════════════════════════
// Dirección del servidor Flask (app.py). Es la misma que usan las otras páginas.
const API_URL = 'http://127.0.0.1:5000';

document.querySelector('.krono-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form     = this;
    const boton    = form.querySelector('.btn-enviar');
    const nombre   = document.getElementById('nombre').value.trim();
    const email    = document.getElementById('email').value.trim();
    const consulta = document.getElementById('consulta').value.trim();

    // Mensaje de estado (se crea una sola vez, debajo del botón)
    let estado = form.querySelector('.form-estado');
    if (!estado) {
        estado = document.createElement('p');
        estado.className = 'form-estado';
        estado.setAttribute('role', 'status');
        estado.setAttribute('aria-live', 'polite');
        estado.style.cssText = 'margin-top:12px;font-weight:600;text-align:center;';
        form.appendChild(estado);
    }

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Enviando...';
    clearTimeout(form._timerEstado);   // cancela un borrado pendiente de un envío anterior
    estado.textContent = '';

    try {
        const resp = await fetch(API_URL + '/enviar-consulta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, consulta })
        });
        const datos = await resp.json().catch(() => ({}));

        if (resp.ok) {
            estado.style.color = '#2e9e5b';
            estado.textContent = `¡Gracias ${nombre}! Tu consulta fue enviada, te responderemos pronto.`;
            form.reset();
            // El mensaje de éxito desaparece solo a los 2 segundos
            form._timerEstado = setTimeout(() => { estado.textContent = ''; }, 2000);
        } else {
            estado.style.color = '#d64545';
            estado.textContent = datos.error || 'No pudimos enviar tu consulta. Intentá de nuevo.';
        }
    } catch (err) {
        estado.style.color = '#d64545';
        estado.textContent = 'No pudimos conectar con el servidor. Revisá que esté encendido e intentá de nuevo.';
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
});


// ══════════════════════════════════════════════
//  LOG NAVEGACIÓN (nav icons)
// ══════════════════════════════════════════════
document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
        console.log('Navegando a sección externa...');
    });
});


// ══════════════════════════════════════════════
//  OCULTAR HEADER AL HACER SCROLL
// ══════════════════════════════════════════════
(function () {
    const header = document.querySelector('.sidebar');
    let ultimoScroll = 0;
    let ticking      = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollActual = window.scrollY;

                if (scrollActual <= 10) {
                    header.classList.remove('header-oculto');
                } else if (scrollActual > ultimoScroll + 6) {
                    header.classList.add('header-oculto');
                } else if (scrollActual < ultimoScroll - 6) {
                    header.classList.remove('header-oculto');
                }

                ultimoScroll = scrollActual;
                ticking      = false;
            });
            ticking = true;
        }
    });
})();


// ══════════════════════════════════════════════
//  MENÚ HAMBURGUESA — solo visible en pantallas chicas (ver style.css)
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

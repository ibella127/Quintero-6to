
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
//  FORMULARIO
// ══════════════════════════════════════════════
document.querySelector('.krono-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value;
    const email  = document.getElementById('email').value;
    alert(`¡Genial ${nombre}! Tu consulta desde ${email} fue enviada. ¡Suerte!`);
    this.reset();
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

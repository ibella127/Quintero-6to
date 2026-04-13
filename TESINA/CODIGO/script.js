// Efecto de difuminado (Blur) progresivo al bajar
window.addEventListener('scroll', () => {
    const bgBlur = document.querySelector('.bg-blur');
    let scrollValue = window.scrollY;
    
    // Difumina 1px cada 150px de scroll para que sea más lento y sutil
    let blurIntensity = scrollValue / 150; 
    
    // Límite máximo de desenfoque
    if (blurIntensity > 8) blurIntensity = 8;
    
    bgBlur.style.filter = `blur(${blurIntensity}px)`;
});

// Manejo del envío del formulario
document.querySelector('.krono-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    
    // Alerta linda de confirmación
    alert(`¡Genial ${nombre}! Tu consulta desde ${email} fue enviada. ¡Suerte!`);
    
    this.reset(); // Limpia los campos
});

// Log de navegación para los iconos (opcional)
document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
        console.log("Navegando a sección externa...");
    });
});
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

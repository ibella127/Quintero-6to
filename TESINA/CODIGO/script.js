// Opcional: Para asegurar que al hacer click se sienta el feedback
document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
        console.log("Cambiando de sección...");
    });
});
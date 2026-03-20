let tareas = [];

function actualizarContadores() {
    const ahora = new Date();
    let p = 0; let h = 0; let v = 0;

    tareas.forEach(tarea => {
        if (!tarea.completada && ahora > tarea.fechaLimite) {
            tarea.vencida = true;
        }
        if (tarea.completada) h++;
        else if (tarea.vencida) v++;
        else p++;
    });

    document.getElementById("numPendientes").innerText = p;
    document.getElementById("numHechas").innerText = h;
    document.getElementById("numVencidas").innerText = v;
}

function agregarTarea() {
    const inputT = document.getElementById("pendiente");
    const inputF = document.getElementById("fechaVence");

    if (!inputT.value || !inputF.value) return alert("Escribe la tarea y la fecha");

    const fechaSeleccionada = new Date(inputF.value + "T23:59:59");

    const nuevaTarea = {
        id: Date.now(),
        texto: inputT.value,
        fechaLimite: fechaSeleccionada,
        completada: false,
        vencida: false
    };

    tareas.push(nuevaTarea);
    dibujarTareas();
    inputT.value = "";
}

function dibujarTareas() {
    const lista = document.getElementById("listaPendientes");
    lista.innerHTML = "";

    tareas.forEach(tarea => {
        const li = document.createElement("li");
        if (tarea.vencida && !tarea.completada) li.classList.add("vencida-estilo");

        const check = document.createElement("input");
        check.type = "checkbox";
        check.checked = tarea.completada;
        check.onchange = () => {
            tarea.completada = check.checked;
            dibujarTareas();
        };

        const span = document.createElement("span");
        span.innerHTML = `<strong>${tarea.texto}</strong> <br> <small>Vence: ${tarea.fechaLimite.toLocaleDateString()}</small>`;
        
        if (tarea.completada) {
            span.classList.add("completada-estilo");
        } else if (tarea.vencida) {
            const badge = document.createElement("span");
            badge.className = "badge-vencido";
            badge.innerText = "Vencida";
            span.appendChild(badge);
        }

        li.appendChild(check);
        li.appendChild(span);
        lista.appendChild(li);
    });
    actualizarContadores();
}

// NUEVA FUNCIÓN: Ordenar A-Z
function ordenarAlfabeticamente() {
    tareas.sort((a, b) => a.texto.localeCompare(b.texto));
    dibujarTareas();
}

// NUEVA FUNCIÓN: Modo Oscuro
function alternarModo() {
    const html = document.documentElement;
    const btn = document.getElementById("btnModo");

    if (html.getAttribute("data-theme") === "dark") {
        html.removeAttribute("data-theme");
        btn.innerText = "🌙 Modo";
    } else {
        html.setAttribute("data-theme", "dark");
        btn.innerText = "☀️ Claro";
    }
}

setInterval(() => {
    actualizarContadores();
    dibujarTareas();
}, 60000); // Actualizado a 1 minuto para no refrescar tan seguido
// ====================================================================
// 1. DATA MODELOS Y UTILIDADES (Reemplaza clases C#)
// ====================================================================

// Cargar datos de localStorage o usar valores por defecto
let equipos = JSON.parse(localStorage.getItem('equipos')) || [];
let fixture = JSON.parse(localStorage.getItem('fixture')) || [];
let ptsConfig = JSON.parse(localStorage.getItem('ptsConfig')) || { V: 3, E: 1, D: 0 };

// ====================================================================
// 2. LÓGICA DE ALMACENAMIENTO Y UI
// ====================================================================

function guardarDatos() {
    localStorage.setItem('equipos', JSON.stringify(equipos));
    localStorage.setItem('fixture', JSON.stringify(fixture));
    localStorage.setItem('ptsConfig', JSON.stringify(ptsConfig));
}

function actualizarUI() {
    generarTablaRanking();
    generarTablaPartidos();
    generarFiltroJornadas();
    
    // Restaurar configuración de puntos en la UI
    document.getElementById('ptsVictoria').value = ptsConfig.V;
    document.getElementById('ptsEmpate').value = ptsConfig.E;
    document.getElementById('ptsDerrota').value = ptsConfig.D;
}

// ====================================================================
// 3. EVENTOS DEL PANEL IZQUIERDO (Equipos y Configuración)
// ====================================================================

document.getElementById('btnAgregarEquipo').addEventListener('click', () => {
    const nombre = document.getElementById('nombreEquipo').value.trim();
    const foto = document.getElementById('urlFoto').value.trim();

    if (!nombre) {
        alert("El nombre del equipo no puede estar vacío.");
        return;
    }
    if (equipos.some(e => e.nombre.toLowerCase() === nombre.toLowerCase())) {
        alert("El equipo ya existe.");
        return;
    }

    const nuevoEquipo = {
        id: Date.now(), // ID simple para equipos
        nombre,
        foto,
        // Estadísticas (se reinician en el cálculo)
        pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0
    };

    equipos.push(nuevoEquipo);
    document.getElementById('nombreEquipo').value = '';
    document.getElementById('urlFoto').value = '';
    guardarDatos();
    // No actualiza el ranking aquí, se actualiza después de generar el fixture o editar un partido
    generarTablaRanking(); 
});

document.getElementById('btnGenerarPartidos').addEventListener('click', () => {
    if (equipos.length < 2) {
        alert("Se necesitan al menos 2 equipos para generar el fixture.");
        return;
    }
    
    // 1. Cargar la configuración de puntos antes de generar/recalcular
    ptsConfig.V = parseInt(document.getElementById('ptsVictoria').value) || 3;
    ptsConfig.E = parseInt(document.getElementById('ptsEmpate').value) || 1;
    ptsConfig.D = parseInt(document.getElementById('ptsDerrota').value) || 0;

    // 2. Generar el fixture
    fixture = generarFixtureRoundRobin([...equipos]); 
    guardarDatos();
    actualizarUI();
});

document.getElementById('btnLimpiarDatos').addEventListener('click', () => {
    if (confirm("¿Estás seguro de que quieres LIMPIAR TODOS los equipos y partidos?")) {
        equipos = [];
        fixture = [];
        localStorage.clear();
        actualizarUI();
    }
});

// Actualizar ptsConfig inmediatamente al cambiar el input
document.querySelectorAll('.puntos-config input').forEach(input => {
    input.addEventListener('change', () => {
        ptsConfig.V = parseInt(document.getElementById('ptsVictoria').value) || 3;
        ptsConfig.E = parseInt(document.getElementById('ptsEmpate').value) || 1;
        ptsConfig.D = parseInt(document.getElementById('ptsDerrota').value) || 0;
        guardarDatos();
        // Recalcular el ranking inmediatamente
        generarTablaRanking(); 
    });
});


// ====================================================================
// 4. LÓGICA CENTRAL (Fixture y Ranking)
// ====================================================================

function generarFixtureRoundRobin(listaEquipos) {
    let lista = [...listaEquipos];
    let partidos = [];
    let jornada = 1;

    // Si es impar, añadir equipo fantasma (null)
    if (lista.length % 2 !== 0) {
        lista.push(null);
    }
    
    const numEquipos = lista.length;
    const numJornadas = numEquipos - 1;
    const partidosPorJornada = numEquipos / 2;

    for (let j = 0; j < numJornadas; j++) {
        for (let i = 0; i < partidosPorJornada; i++) {
            const local = lista[i];
            const visitante = lista[numEquipos - 1 - i];

            if (local && visitante) {
                partidos.push({
                    id: Date.now() + Math.random(),
                    jornada: j + 1,
                    localId: local.id,
                    visitanteId: visitante.id,
                    localNombre: local.nombre, // Simplificación para la UI
                    visitanteNombre: visitante.nombre,
                    golesLocal: null,
                    golesVisitante: null
                });
            }
        }

        // Rotación: Mantiene el primer equipo fijo y rota el resto
        if (numEquipos > 1) {
            const equipoQueRota = lista.pop();
            lista.splice(1, 0, equipoQueRota);
        }
        jornada++;
    }
    return partidos;
}

function generarTablaRanking() {
    // 1. Resetear estadísticas de los equipos
    equipos.forEach(e => {
        e.pj = e.pg = e.pe = e.pp = e.gf = e.gc = e.dg = e.pts = 0;
    });

    // 2. Procesar partidos
    fixture.filter(p => p.golesLocal !== null && p.golesVisitante !== null).forEach(p => {
        const local = equipos.find(e => e.id === p.localId);
        const visitante = equipos.find(e => e.id === p.visitanteId);

        if (!local || !visitante) return; // Error si el equipo no existe

        const gl = p.golesLocal;
        const gv = p.golesVisitante;

        // PJ, GF, GC
        local.pj++; visitante.pj++;
        local.gf += gl; local.gc += gv;
        visitante.gf += gv; visitante.gc += gl;

        // Puntos, PG, PE, PP
        if (gl > gv) { // Gana Local
            local.pg++; local.pts += ptsConfig.V;
            visitante.pp++; visitante.pts += ptsConfig.D;
        } else if (gv > gl) { // Gana Visitante
            visitante.pg++; visitante.pts += ptsConfig.V;
            local.pp++; local.pts += ptsConfig.D;
        } else { // Empate
            local.pe++; local.pts += ptsConfig.E;
            visitante.pe++; visitante.pts += ptsConfig.E;
        }
    });
    
    // 3. Calcular DG y Ordenar
    equipos.forEach(e => { e.dg = e.gf - e.gc; });

    const rankingOrdenado = equipos.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dg !== a.dg) return b.dg - a.dg;
        return b.gf - a.gf;
    });

    // 4. Renderizar la tabla
    const tbody = document.getElementById('tablaRanking').querySelector('tbody');
    tbody.innerHTML = '';
    
    rankingOrdenado.forEach((e, index) => {
        const row = tbody.insertRow();
        
        row.insertCell().textContent = index + 1; // Posición
        
        // Equipo con Logo
        const teamCell = row.insertCell();
        teamCell.classList.add('team-info');
        if (e.foto) {
             teamCell.innerHTML = `<img src="${e.foto}" alt="Logo" class="team-logo" onerror="this.style.display='none'"> <span>${e.nombre}</span>`;
        } else {
             teamCell.innerHTML = `<span>${e.nombre}</span>`;
        }

        row.insertCell().textContent = e.pj;
        row.insertCell().textContent = e.pg;
        row.insertCell().textContent = e.pe;
        row.insertCell().textContent = e.pp;
        row.insertCell().textContent = e.gf;
        row.insertCell().textContent = e.gc;
        row.insertCell().textContent = e.dg;
        row.insertCell().textContent = e.pts;
    });
    
    guardarDatos();
}


function generarTablaPartidos() {
    const tbody = document.getElementById('tablaPartidos').querySelector('tbody');
    tbody.innerHTML = '';
    
    const filtro = document.getElementById('filtroJornada').value;
    const partidosFiltrados = filtro === 'all' 
        ? fixture 
        : fixture.filter(p => p.jornada === parseInt(filtro));

    partidosFiltrados.forEach(p => {
        const row = tbody.insertRow();
        const resultado = p.golesLocal !== null 
            ? `${p.golesLocal} - ${p.golesVisitante}` 
            : 'Pendiente';

        row.insertCell().textContent = p.jornada;
        row.insertCell().textContent = p.localNombre;
        row.insertCell().textContent = p.visitanteNombre;
        row.insertCell().textContent = resultado;
        
        // Botón "Editar"
        const actionCell = row.insertCell();
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.className = 'btn-editar';
        btnEditar.onclick = () => abrirModalEdicion(p.id);
        actionCell.appendChild(btnEditar);
    });
}

function generarFiltroJornadas() {
    const select = document.getElementById('filtroJornada');
    select.innerHTML = '<option value="all">Todas las jornadas</option>';

    const jornadas = [...new Set(fixture.map(p => p.jornada))].sort((a, b) => a - b);
    jornadas.forEach(j => {
        const option = document.createElement('option');
        option.value = j;
        option.textContent = `Jornada ${j}`;
        select.appendChild(option);
    });
}

document.getElementById('filtroJornada').addEventListener('change', generarTablaPartidos);


// ====================================================================
// 5. LÓGICA DEL MODAL (ContentDialog - Reemplazo)
// ====================================================================

const modal = document.getElementById('modalDialog');
const closeButton = modal.querySelector('.close-button');
const btnGuardar = document.getElementById('btnGuardarResultado');
let partidoEnEdicionId = null; 

function abrirModalEdicion(partidoId) {
    const partido = fixture.find(p => p.id === partidoId);
    if (!partido) return;

    partidoEnEdicionId = partidoId;
    document.getElementById('dialogNombres').textContent = `${partido.localNombre} vs ${partido.visitanteNombre}`;
    document.getElementById('dialogGolesLocal').value = partido.golesLocal || '';
    document.getElementById('dialogGolesVisitante').value = partido.golesVisitante || '';
    
    modal.style.display = 'block';
}

closeButton.onclick = () => {
    modal.style.display = 'none';
};

btnGuardar.onclick = () => {
    const golesL = parseInt(document.getElementById('dialogGolesLocal').value);
    const golesV = parseInt(document.getElementById('dialogGolesVisitante').value);

    if (isNaN(golesL) || isNaN(golesV) || golesL < 0 || golesV < 0) {
        alert("Por favor, ingresa un resultado válido (números >= 0).");
        return;
    }

    // Actualizar el partido
    const partidoIndex = fixture.findIndex(p => p.id === partidoEnEdicionId);
    if (partidoIndex !== -1) {
        fixture[partidoIndex].golesLocal = golesL;
        fixture[partidoIndex].golesVisitante = golesV;
        
        guardarDatos();
        generarTablaRanking(); // Recalcular todo
        generarTablaPartidos(); // Refrescar la tabla de partidos
        modal.style.display = 'none';
    }
};

// Cerrar modal al hacer clic fuera
window.onclick = (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// ====================================================================
// 6. INICIALIZACIÓN
// ====================================================================

// Llamar a la función de actualización al cargar la página
window.onload = actualizarUI;
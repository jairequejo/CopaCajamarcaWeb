document.addEventListener('DOMContentLoaded', () => {

    // ====================================================================
    // 1. MODELO DE DATOS Y VARIABLES GLOBALES
    // ====================================================================

    let baseDeDatosCopa = JSON.parse(localStorage.getItem('baseDeDatosCopa')) || [];
    let torneoActual = null;
    let categoriaActual = null;
    let idTorneoUrl = null;

    // --- Elementos del DOM ---
    const selectCategoria = document.getElementById('selectCategoria');
    const nombreTorneoActual = document.getElementById('nombreTorneoActual');
    const tablaRankingBody = document.getElementById('tablaRanking').querySelector('tbody');
    const tablaPartidosBody = document.getElementById('tablaPartidos').querySelector('tbody');
    const filtroJornada = document.getElementById('filtroJornada');

    // ====================================================================
    // 2. INICIALIZACIÓN Y CARGA DE DATOS
    // ====================================================================

    function inicializar() {
        // Leer el ID del torneo desde la URL
        const params = new URLSearchParams(window.location.search);
        idTorneoUrl = params.get('id');

        if (!idTorneoUrl) {
            alert("No se especificó un torneo. Volviendo al inicio.");
            window.location.href = 'index.html';
            return;
        }

        // Encontrar el torneo en nuestra BD
        torneoActual = baseDeDatosCopa.find(t => t.id === idTorneoUrl);

        if (!torneoActual) {
            alert("Torneo no encontrado. Volviendo al inicio.");
            window.location.href = 'index.html';
            return;
        }

        // Rellenar datos del torneo
        nombreTorneoActual.textContent = torneoActual.nombre;
        
        // Rellenar el dropdown de categorías
        selectCategoria.innerHTML = '<option value="">Seleccione una Categoría</option>';
        torneoActual.categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.nombre;
            option.textContent = `Categoría ${cat.nombre}`;
            selectCategoria.appendChild(option);
        });
        
        // Limpiar UI
        limpiarUI();
    }

    // --- Evento principal: Cambiar de Categoría ---
    selectCategoria.addEventListener('change', () => {
        const nombreCat = selectCategoria.value;
        if (nombreCat) {
            categoriaActual = torneoActual.categorias.find(c => c.nombre === nombreCat);
            // Mostrar la categoría seleccionada en el input de agregar equipo
            document.getElementById('categoriaEquipo').value = nombreCat;
            actualizarUI();
        } else {
            categoriaActual = null;
            limpiarUI();
        }
    });

    // ====================================================================
    // 3. LÓGICA DE ALMACENAMIENTO Y UI
    // ====================================================================

    function guardarDatos() {
        // Encontrar el índice de nuestro torneo actual
        const index = baseDeDatosCopa.findIndex(t => t.id === torneoActual.id);
        if (index !== -1) {
            // Reemplazar el objeto antiguo con el nuevo
            baseDeDatosCopa[index] = torneoActual;
        }
        // Guardar TODA la base de datos
        localStorage.setItem('baseDeDatosCopa', JSON.stringify(baseDeDatosCopa));
    }

    // Actualiza todo basándose en "categoriaActual"
    function actualizarUI() {
        if (!categoriaActual) {
            limpiarUI();
            return;
        }
        generarTablaRanking();
        generarTablaPartidos();
        generarFiltroJornadas();
    }

    function limpiarUI() {
        tablaRankingBody.innerHTML = '';
        tablaPartidosBody.innerHTML = '';
        filtroJornada.innerHTML = '<option value="all">Todas las jornadas</option>';
        document.getElementById('categoriaEquipo').value = '';
    }

    // ====================================================================
    // 4. EVENTOS PANEL IZQUIERDO (Equipos y Categorías)
    // ====================================================================

    document.getElementById('btnAgregarEquipo').addEventListener('click', () => {
        if (!torneoActual) return; // No hay torneo cargado

        const nombre = document.getElementById('nombreEquipo').value.trim();
        const foto = document.getElementById('urlFoto').value.trim();
        const catNombre = document.getElementById('categoriaEquipo').value.trim();

        if (!nombre || !catNombre) {
            alert("El Nombre y la Categoría (Año) son obligatorios.");
            return;
        }

        // 1. Buscar si la categoría ya existe en ESTE torneo
        let categoria = torneoActual.categorias.find(c => c.nombre === catNombre);

        // 2. Si no existe, la creamos
        if (!categoria) {
            categoria = {
                nombre: catNombre,
                equipos: [],
                fixture: []
            };
            torneoActual.categorias.push(categoria);
            
            // Añadirla al dropdown <select>
            const option = document.createElement('option');
            option.value = categoria.nombre;
            option.textContent = `Categoría ${categoria.nombre}`;
            selectCategoria.appendChild(option);
            
            alert(`Nueva categoría ${catNombre} creada.`);
        }

        // 3. Verificar que el equipo no exista EN ESA CATEGORÍA
        if (categoria.equipos.some(e => e.nombre.toLowerCase() === nombre.toLowerCase())) {
            alert("El equipo ya existe en esta categoría.");
            return;
        }

        // 4. Crear y agregar el equipo a la categoría
        const nuevoEquipo = {
            id: `eq_${Date.now()}`,
            nombre,
            foto,
            pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0
        };
        categoria.equipos.push(nuevoEquipo);

        // 5. Guardar TODA la base de datos
        guardarDatos();

        // 6. Si la categoría recién agregada es la que está seleccionada, refrescar la UI
        if (categoriaActual && categoriaActual.nombre === catNombre) {
            actualizarUI();
        } else {
            // Seleccionar automáticamente la categoría
            selectCategoria.value = catNombre;
            categoriaActual = categoria;
            actualizarUI();
        }
        
        document.getElementById('nombreEquipo').value = '';
        document.getElementById('urlFoto').value = '';
    });

    document.getElementById('btnGenerarPartidos').addEventListener('click', () => {
        if (!categoriaActual) {
            alert("Primero debe seleccionar una categoría.");
            return;
        }
        if (categoriaActual.equipos.length < 2) {
            alert("Se necesitan al menos 2 equipos en esta categoría para generar el fixture.");
            return;
        }
        
        // Genera el fixture SOLO para esa categoría
        categoriaActual.fixture = generarFixtureRoundRobin([...categoriaActual.equipos]); 
        
        guardarDatos();
        actualizarUI();
    });

    document.getElementById('btnLimpiarDatos').addEventListener('click', () => {
        if (!categoriaActual) {
            alert("Primero debe seleccionar una categoría.");
            return;
        }
        
        if (confirm(`¿Estás seguro de que quieres LIMPIAR TODOS los equipos y partidos de la CATEGORÍA ${categoriaActual.nombre}?`)) {
            categoriaActual.equipos = [];
            categoriaActual.fixture = [];
            guardarDatos();
            actualizarUI();
        }
    });


    // ====================================================================
    // 5. LÓGICA CENTRAL (Fixture y Ranking)
    // ====================================================================

    function generarFixtureRoundRobin(listaEquipos) {
        let lista = [...listaEquipos];
        let partidos = [];
        let jornada = 1;

        if (lista.length % 2 !== 0) {
            lista.push(null); // Equipo fantasma
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
                        id: `p_${Date.now()}_${Math.random()}`,
                        jornada: j + 1,
                        localId: local.id,
                        visitanteId: visitante.id,
                        localNombre: local.nombre,
                        visitanteNombre: visitante.nombre,
                        golesLocal: null,
                        golesVisitante: null
                    });
                }
            }

            if (numEquipos > 1) {
                const equipoQueRota = lista.pop();
                lista.splice(1, 0, equipoQueRota);
            }
            jornada++;
        }
        return partidos;
    }

    function generarTablaRanking() {
        if (!categoriaActual) return;
        
        const equipos = categoriaActual.equipos;
        const fixture = categoriaActual.fixture;
        const ptsConfig = torneoActual.ptsConfig; // ¡Usa la config del torneo!

        // 1. Resetear estadísticas
        equipos.forEach(e => {
            e.pj = e.pg = e.pe = e.pp = e.gf = e.gc = e.dg = e.pts = 0;
        });

        // 2. Procesar partidos
        fixture.filter(p => p.golesLocal !== null && p.golesVisitante !== null).forEach(p => {
            const local = equipos.find(e => e.id === p.localId);
            const visitante = equipos.find(e => e.id === p.visitanteId);

            if (!local || !visitante) return;

            const gl = p.golesLocal;
            const gv = p.golesVisitante;

            local.pj++; visitante.pj++;
            local.gf += gl; local.gc += gv;
            visitante.gf += gv; visitante.gc += gl;

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
        tablaRankingBody.innerHTML = '';
        
        rankingOrdenado.forEach((e, index) => {
            const row = tablaRankingBody.insertRow();
            
            row.insertCell().textContent = index + 1;
            
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
    }

    function generarTablaPartidos() {
        if (!categoriaActual) return;

        tablaPartidosBody.innerHTML = '';
        
        const filtro = filtroJornada.value;
        const partidosFiltrados = filtro === 'all' 
            ? categoriaActual.fixture 
            : categoriaActual.fixture.filter(p => p.jornada === parseInt(filtro));

        partidosFiltrados.forEach(p => {
            const row = tablaPartidosBody.insertRow();
            const resultado = p.golesLocal !== null 
                ? `${p.golesLocal} - ${p.golesVisitante}` 
                : 'Pendiente';

            row.insertCell().textContent = p.jornada;
            row.insertCell().textContent = p.localNombre;
            row.insertCell().textContent = p.visitanteNombre;
            row.insertCell().textContent = resultado;
            
            const actionCell = row.insertCell();
            const btnEditar = document.createElement('button');
            btnEditar.textContent = 'Editar';
            btnEditar.className = 'btn-editar';
            btnEditar.onclick = () => abrirModalEdicion(p.id);
            actionCell.appendChild(btnEditar);
        });
    }

    function generarFiltroJornadas() {
        if (!categoriaActual) return;

        filtroJornada.innerHTML = '<option value="all">Todas las jornadas</option>';
        const jornadas = [...new Set(categoriaActual.fixture.map(p => p.jornada))].sort((a, b) => a - b);
        
        jornadas.forEach(j => {
            const option = document.createElement('option');
            option.value = j;
            option.textContent = `Jornada ${j}`;
            filtroJornada.appendChild(option);
        });
    }

    filtroJornada.addEventListener('change', generarTablaPartidos);

    // ====================================================================
    // 6. LÓGICA DEL MODAL DE RESULTADOS
    // ====================================================================

    const modal = document.getElementById('modalDialog');
    const closeButton = modal.querySelector('.close-button');
    const btnGuardar = document.getElementById('btnGuardarResultado');
    let partidoEnEdicionId = null; 

    function abrirModalEdicion(partidoId) {
        if (!categoriaActual) return;
        
        const partido = categoriaActual.fixture.find(p => p.id === partidoId);
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
        if (!categoriaActual) return;
        
        const golesL = parseInt(document.getElementById('dialogGolesLocal').value);
        const golesV = parseInt(document.getElementById('dialogGolesVisitante').value);

        if (isNaN(golesL) || isNaN(golesV) || golesL < 0 || golesV < 0) {
            alert("Por favor, ingresa un resultado válido (números >= 0).");
            return;
        }

        const partidoIndex = categoriaActual.fixture.findIndex(p => p.id === partidoEnEdicionId);
        if (partidoIndex !== -1) {
            categoriaActual.fixture[partidoIndex].golesLocal = golesL;
            categoriaActual.fixture[partidoIndex].golesVisitante = golesV;
            
            guardarDatos();
            actualizarUI(); // Recalcula ranking y refresca partidos
            modal.style.display = 'none';
        }
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // ====================================================================
    // 7. INICIALIZACIÓN
    // ====================================================================

    inicializar();
});
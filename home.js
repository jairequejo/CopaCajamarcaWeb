document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos del DOM ---
    const listaTorneos = document.getElementById('listaTorneos');
    const btnNuevoTorneo = document.getElementById('btnNuevoTorneo');
    
    // --- Elementos del Modal ---
    const modal = document.getElementById('modalTorneo');
    const modalTitulo = document.getElementById('modalTitulo');
    const closeButton = modal.querySelector('.close-button');
    const btnGuardarTorneo = document.getElementById('btnGuardarTorneo');
    const torneoIdEditar = document.getElementById('torneoIdEditar');
    
    // --- Inputs del Modal ---
    const torneoNombre = document.getElementById('torneoNombre');
    const torneoFechaInicio = document.getElementById('torneoFechaInicio');
    const torneoFechaFin = document.getElementById('torneoFechaFin');
    const torneoPtsV = document.getElementById('torneoPtsV');
    const torneoPtsE = document.getElementById('torneoPtsE');
    const torneoPtsD = document.getElementById('torneoPtsD');

    // --- Base de Datos ---
    let db = JSON.parse(localStorage.getItem('baseDeDatosCopa')) || [];

    function guardarDB() {
        localStorage.setItem('baseDeDatosCopa', JSON.stringify(db));
    }

    // --- Renderizar Torneos en la página ---
    function renderizarTorneos() {
        listaTorneos.innerHTML = ''; // Limpiar lista
        
        if (db.length === 0) {
            listaTorneos.innerHTML = '<p>No hay torneos creados. ¡Agrega uno!</p>';
            return;
        }

        db.forEach(torneo => {
            const torneoEl = document.createElement('div');
            torneoEl.className = 'btn-torneo';
            
            torneoEl.innerHTML = `
                <span class="torneo-nombre">${torneo.nombre}</span>
                <div class="torneo-acciones">
                    <button class="btn-accion btn-ver" title="Ver Torneo">👁️</button>
                    <button class="btn-accion btn-editar" title="Editar Datos">Editar</button>
                </div>
            `;

            // Acción de "Ver" (Ojo)
            torneoEl.querySelector('.btn-ver').addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que se dispare el editar
                window.location.href = `gestor.html?id=${torneo.id}`;
            });
            
            // Acción de "Editar"
            torneoEl.querySelector('.btn-editar').addEventListener('click', (e) => {
                e.stopPropagation();
                abrirModal(torneo.id);
            });
            
            // Clic en cualquier parte del botón también lleva a "Ver"
             torneoEl.addEventListener('click', () => {
                 window.location.href = `gestor.html?id=${torneo.id}`;
             });

            listaTorneos.appendChild(torneoEl);
        });
    }

    // --- Lógica del Modal ---
    function abrirModal(id = null) {
        if (id) {
            // Editando
            const torneo = db.find(t => t.id === id);
            if (!torneo) return;
            
            modalTitulo.textContent = 'Editar Datos del Torneo';
            torneoIdEditar.value = id;
            torneoNombre.value = torneo.nombre;
            torneoFechaInicio.value = torneo.fechaInicio || '';
            torneoFechaFin.value = torneo.fechaFin || '';
            torneoPtsV.value = torneo.ptsConfig.V;
            torneoPtsE.value = torneo.ptsConfig.E;
            torneoPtsD.value = torneo.ptsConfig.D;

        } else {
            // Creando
            modalTitulo.textContent = 'Crear Nuevo Torneo';
            torneoIdEditar.value = ''; // Limpiar ID
            torneoNombre.value = '';
            torneoFechaInicio.value = '';
            torneoFechaFin.value = '';
            torneoPtsV.value = 3;
            torneoPtsE.value = 1;
            torneoPtsD.value = 0;
        }
        modal.style.display = 'block';
    }

    function cerrarModal() {
        modal.style.display = 'none';
    }

    function guardarTorneo() {
        const id = torneoIdEditar.value;
        const nombre = torneoNombre.value.trim();
        
        if (!nombre) {
            alert("El nombre del torneo es obligatorio.");
            return;
        }

        const datosTorneo = {
            nombre: nombre,
            fechaInicio: torneoFechaInicio.value,
            fechaFin: torneoFechaFin.value,
            tipo: 'Todos contra todos', // Fijo por ahora
            partidos: 'Solo ida', // Fijo por ahora
            ptsConfig: {
                V: parseInt(torneoPtsV.value) || 3,
                E: parseInt(torneoPtsE.value) || 1,
                D: parseInt(torneoPtsD.value) || 0
            }
        };

        if (id) {
            // Actualizar existente
            const index = db.findIndex(t => t.id === id);
            if (index !== -1) {
                // Mantenemos las categorías que ya tenía
                db[index] = { ...db[index], ...datosTorneo };
            }
        } else {
            // Crear nuevo
            const nuevoTorneo = {
                id: `torneo_${Date.now()}`,
                ...datosTorneo,
                categorias: [] // Un torneo nuevo empieza sin categorías
            };
            db.push(nuevoTorneo);
        }

        guardarDB();
        renderizarTorneos();
        cerrarModal();
    }

    // --- Event Listeners ---
    btnNuevoTorneo.addEventListener('click', () => abrirModal());
    closeButton.addEventListener('click', cerrarModal);
    btnGuardarTorneo.addEventListener('click', guardarTorneo);

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            cerrarModal();
        }
    });

    // --- Inicialización ---
    renderizarTorneos();
});
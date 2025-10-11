// --- OBJETOS DEL DOM ---
const formInicial = document.getElementById("formInicial");
const btnIniciar = document.getElementById("iniciarSimulacion");
const numProcesosInput = document.getElementById("numProcesos");
const simulacionContenedor = document.getElementById("simulacionContenedor");
const reporteFinalContenedor = document.getElementById("reporteFinalContenedor");

// Elementos de la simulación
const procesosNuevosSpan = document.getElementById("procesosNuevosSpan");
const colaListosBody = document.getElementById("colaListosBody");
const procesoEnEjecucionInfo = document.getElementById("procesoEnEjecucionInfo");
const colaBloqueadosBody = document.getElementById("colaBloqueadosBody");
const procesosTerminadosBody = document.getElementById("procesosTerminadosBody");
const relojGlobalH3 = document.getElementById("relojGlobal");
const estadoSimulacionSpan = document.getElementById("estadoSimulacion");

// Elementos del reporte final
const reporteFinalBody = document.getElementById("reporteFinalBody");

// Elementos del Modal BCP
const bcpModal = document.getElementById('bcpModal');
const bcpTableBody = document.getElementById('bcpTableBody');
const cerrarVentanaBCP = document.getElementById('closeBcpModal');

// --- VARIABLES GLOBALES ---
let nuevos = [];
let listos = [];
let bloqueados = [];
let terminados = [];
let procesoEnEjecucion = null;

let relojGlobal = 0;
let simuladorIntervalo = null;
let estaPausado = false;
let siguienteId = 1;

const MAX_PROCESOS_EN_MEMORIA = 4;
const TIEMPO_BLOQUEADO = 8;

// --- GENERACIÓN DE PROCESOS ---
const numeroAleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const crearProcesoUnico = () => {
    const operadores = ['+', '-', '*', '/', '%'];
    const operacion = operadores[numeroAleatorio(0, 4)];
    const numA = numeroAleatorio(1, 100);
    // Evitar división por cero
    const numB = (operacion === '/' || operacion === '%') ? numeroAleatorio(1, 100) : numeroAleatorio(0, 100);

    const nuevoProceso = {
        id: siguienteId,
        operacionStr: `${numA} ${operacion} ${numB}`,
        tme: numeroAleatorio(6, 16),
        resultado: null,
        estadoFinal: null, // Se define al terminar (Normal o Error)
        tiempoLlegada: -1,
        tiempoFinalizacion: -1,
        tiempoRetorno: -1,
        tiempoRespuesta: -1,
        tiempoEspera: 0,
        tiempoServicio: 0,
        // --- Variables auxiliares ---
        tiempoEnBloqueado: 0,
        fueEjecutado: false // Para calcular el tiempo de respuesta
    };
    siguienteId++;
    return nuevoProceso;
};

// LÓGICA PRINCIPAL DE LA SIMULACIÓN 
btnIniciar.addEventListener("click", () => {
    const cantidad = parseInt(numProcesosInput.value);
    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor, ingresa un número válido y mayor a 0.");
        return;
    }
    
    // Resetear estado
    nuevos = [];
    for (let i = 0; i < cantidad; i++) {
        nuevos.push(crearProcesoUnico());
    }
    listos = [];
    bloqueados = [];
    terminados = [];
    procesoEnEjecucion = null;
    relojGlobal = 0;
    estaPausado = false;

    // Cambiar de vista
    formInicial.style.display = 'none';
    simulacionContenedor.classList.remove('disableCont');
    simulacionContenedor.classList.add('enableCont');
    reporteFinalContenedor.classList.add('disableCont');

    // Iniciar motor de la simulación
    if (!simuladorIntervalo) {
        simuladorIntervalo = setInterval(mainEjecucion, 1000);
    }
    actualizarUI();
});

const mainEjecucion = () => {
    if (estaPausado) return;

    // Manejar procesos bloqueados
    manejarBloqueados();
    
    // Admitir nuevos procesos si hay memoria
    admitirNuevos();

    // Manejar el proceso en ejecución
    if (procesoEnEjecucion) {
        procesoEnEjecucion.tiempoServicio++;
        // Si el proceso completa su TME, termina normalmente
        if (procesoEnEjecucion.tiempoServicio >= procesoEnEjecucion.tme) {
            terminarProceso(false); // No es error
        }
    }

    // Si el CPU está libre, despachar el siguiente de la cola de listos
    if (!procesoEnEjecucion && listos.length > 0) {
        procesoEnEjecucion = listos.shift();
        
        // Calcular tiempo de respuesta la primera vez que se ejecuta
        if (!procesoEnEjecucion.fueEjecutado) {
            procesoEnEjecucion.tiempoRespuesta = relojGlobal - procesoEnEjecucion.tiempoLlegada;
            procesoEnEjecucion.fueEjecutado = true;
        }
    }
    
    // Verificar si la simulación ha terminado
    if (nuevos.length === 0 && listos.length === 0 && bloqueados.length === 0 && !procesoEnEjecucion) {
        finalizarSimulacion();
    }
    
    // Actualizar la interfaz y el reloj
    actualizarUI();
    relojGlobal++;
};

const manejarBloqueados = () => {
    for (let i = bloqueados.length - 1; i >= 0; i--) {
        const proc = bloqueados[i];
        proc.tiempoEnBloqueado++;
        if (proc.tiempoEnBloqueado >= TIEMPO_BLOQUEADO) {
            proc.tiempoEnBloqueado = 0; // Resetear contador
            listos.push(proc);          // Mover a la cola de listos
            bloqueados.splice(i, 1);    // Remover de bloqueados
        }
    }
};

const admitirNuevos = () => {
    const enMemoria = listos.length + bloqueados.length + (procesoEnEjecucion ? 1 : 0);
    if (enMemoria < MAX_PROCESOS_EN_MEMORIA && nuevos.length > 0) {
        const procesoAAdmitir = nuevos.shift();
        procesoAAdmitir.tiempoLlegada = relojGlobal;
        listos.push(procesoAAdmitir);
    }
};

const terminarProceso = (esError) => {
    if (!procesoEnEjecucion) return;

    procesoEnEjecucion.estadoFinal = esError ? "Error" : "Normal";
    procesoEnEjecucion.resultado = esError ? "ERROR" : eval(procesoEnEjecucion.operacionStr);

    procesoEnEjecucion.tiempoFinalizacion = relojGlobal;
    procesoEnEjecucion.tiempoRetorno = procesoEnEjecucion.tiempoFinalizacion - procesoEnEjecucion.tiempoLlegada;
    // El tiempo de espera es el tiempo de retorno menos el tiempo que estuvo en CPU
    procesoEnEjecucion.tiempoEspera = procesoEnEjecucion.tiempoRetorno - procesoEnEjecucion.tiempoServicio;
    
    terminados.push(procesoEnEjecucion);
    procesoEnEjecucion = null; // Dejar el CPU libre
};

const finalizarSimulacion = () => {
    clearInterval(simuladorIntervalo);
    simuladorIntervalo = null;
    estadoSimulacionSpan.textContent = "¡Simulación finalizada!";
    estadoSimulacionSpan.style.color = "var(--color-exito)";
    
    setTimeout(() => {
        simulacionContenedor.classList.remove('enableCont');
        simulacionContenedor.classList.add('disableCont');
        reporteFinalContenedor.classList.remove('disableCont');
        reporteFinalContenedor.classList.add('enableCont');
        verTablaFinalDatos();
    }, 1000); // Pausa final para ver los resultados
};

// --- ACTUALIZACIÓN DE LA INTERFAZ (UI) ---
const actualizarUI = () => {
    procesosNuevosSpan.textContent = nuevos.length;
    relojGlobalH3.textContent = `Contador Global: ${relojGlobal}s`;

    // Cola de Listos
    colaListosBody.innerHTML = '';
    listos.forEach(proc => {
        const tiempoRestante = proc.tme - proc.tiempoServicio;
        colaListosBody.innerHTML += `<tr><td>${proc.id}</td><td>${proc.tme}</td><td>${tiempoRestante}</td></tr>`;
    });

    // Proceso en Ejecución
    if (procesoEnEjecucion) {
        const tiempoRestante = procesoEnEjecucion.tme - procesoEnEjecucion.tiempoServicio;
        procesoEnEjecucionInfo.innerHTML = `
            <div class="procesos-info-linea"><strong>ID:</strong> <span>${procesoEnEjecucion.id}</span></div>
            <div class="procesos-info-linea"><strong>Operación:</strong> <span>${procesoEnEjecucion.operacionStr}</span></div>
            <div class="procesos-tiempos">
                <div class="procesos-tiempo">T. Máx. Estimado: ${procesoEnEjecucion.tme}s</div>
                <div class="procesos-tiempo">T. de Servicio: ${procesoEnEjecucion.tiempoServicio}s</div>
                <div class="procesos-tiempo">T. Restante: ${tiempoRestante}s</div>
            </div>`;
    } else {
        procesoEnEjecucionInfo.innerHTML = '<p>CPU libre...</p>';
    }
    
    // Cola de Bloqueados
    colaBloqueadosBody.innerHTML = '';
    bloqueados.forEach(proc => {
        colaBloqueadosBody.innerHTML += `<tr><td>${proc.id}</td><td>${proc.tiempoEnBloqueado}s / ${TIEMPO_BLOQUEADO}s</td></tr>`;
    });

    // Procesos Terminados
    procesosTerminadosBody.innerHTML = '';
    terminados.forEach(proc => {
        const resultado = (typeof proc.resultado === 'number') ? proc.resultado.toFixed(2) : proc.resultado;
        procesosTerminadosBody.innerHTML += `<tr><td>${proc.id}</td><td>${proc.operacionStr}</td><td>${resultado}</td></tr>`;
    });
};

const verTablaFinalDatos = () => {
    reporteFinalBody.innerHTML = '';
    terminados.sort((a,b) => a.id - b.id).forEach(proc => {
        const resultado = (typeof proc.resultado === 'number') ? proc.resultado.toFixed(2) : proc.resultado;
        reporteFinalBody.innerHTML += `
            <tr>
                <td>${proc.id}</td>
                <td>${proc.estadoFinal}</td>
                <td>${proc.operacionStr}</td>
                <td>${resultado}</td>
                <td>${proc.tiempoLlegada}</td>
                <td>${proc.tiempoFinalizacion}</td>
                <td>${proc.tiempoRetorno}</td>
                <td>${proc.tiempoRespuesta}</td>
                <td>${proc.tiempoEspera}</td>
                <td>${proc.tiempoServicio}</td>
                <td>${proc.tme}</td>
            </tr>
        `;
    });
};

const verVentanaBCP = () => {
    // Limpiar el contenido previo de la tabla.
    bcpTableBody.innerHTML = '';

    // Crear un arreglo para juntar todos los procesos.
    const todosLosProcesos = [];
    
    // Agregar los procesos de cada lista al arreglo general, añadiendo su estado.
    for (const p of nuevos) {
        todosLosProcesos.push({ ...p, estado: 'Nuevo' });
    }
    for (const p of listos) {
        todosLosProcesos.push({ ...p, estado: 'Listo' });
    }
    if (procesoEnEjecucion) {
        todosLosProcesos.push({ ...procesoEnEjecucion, estado: 'Ejecución' });
    }
    for (const p of bloqueados) {
        todosLosProcesos.push({ ...p, estado: 'Bloqueado' });
    }
    for (const p of terminados) {
        todosLosProcesos.push({ ...p, estado: 'Terminado' });
    }

    // Ordenar el arreglo final por ID para que la tabla siempre se muestre en orden.
    todosLosProcesos.sort((a, b) => a.id - b.id);
    
    // Recorrer el arreglo ya ordenado y generar cada fila de la tabla.
    todosLosProcesos.forEach(proc => {
        let estadoDetalle = proc.estado;
        if (proc.estado === 'Terminado') {
            estadoDetalle += ` (${proc.estadoFinal})`;
        } else if (proc.estado === 'Bloqueado') {
            const restanteBloqueado = TIEMPO_BLOQUEADO - proc.tiempoEnBloqueado;
            estadoDetalle += ` (Restante: ${restanteBloqueado}s)`;
        }
        
        let tiempoRetorno, tiempoEspera;
        const na = 'N/A';

        switch (proc.estado) {
            case 'Terminado':
                tiempoRetorno = proc.tiempoRetorno;
                tiempoEspera = proc.tiempoEspera;
                break;
            case 'Nuevo':
                tiempoRetorno = na;
                tiempoEspera = 0;
                break;
            default: // Para: 'Listo', 'Ejecución', 'Bloqueado'.
                tiempoRetorno = relojGlobal - proc.tiempoLlegada;
                tiempoEspera = tiempoRetorno - proc.tiempoServicio;
                break;
        }
        
        const tiempoRestanteCPU = (proc.estado !== 'Terminado') ? (proc.tme - proc.tiempoServicio) : '–';
        const resultado = (typeof proc.resultado === 'number') ? proc.resultado.toFixed(2) : proc.resultado;

        bcpTableBody.innerHTML += `
            <tr>
                <td>${proc.id}</td>
                <td>${estadoDetalle}</td>
                <td>${proc.operacionStr ?? na}</td>
                <td>${resultado ?? na}</td>
                <td>${proc.tiempoLlegada !== -1 ? proc.tiempoLlegada : na}</td>
                <td>${proc.tiempoFinalizacion !== -1 ? proc.tiempoFinalizacion : na}</td>
                <td>${tiempoRetorno}</td>
                <td>${proc.tiempoRespuesta !== -1 ? proc.tiempoRespuesta : na}</td>
                <td>${Math.max(0, tiempoEspera)}</td>
                <td>${proc.tiempoServicio}</td>
                <td>${tiempoRestanteCPU}</td>
            </tr>
        `;
    });

    bcpModal.classList.remove('disableCont');
};


// --- MANEJO DE TECLADO ---
document.addEventListener('keydown', (e) => {
    if (simuladorIntervalo === null && e.key.toUpperCase() !== 'C') return;
    const tecla = e.key.toUpperCase();

    switch (tecla) {
        case 'E': // Interrupción por E/S
            if (procesoEnEjecucion && !estaPausado) {
                bloqueados.push(procesoEnEjecucion);
                procesoEnEjecucion = null;
            }
            break;
        case 'W': // Terminar por Error
            if (procesoEnEjecucion && !estaPausado) {
                terminarProceso(true);
            }
            break;
        case 'P': // Pausa
            if (!estaPausado) {
                estaPausado = true;
                estadoSimulacionSpan.textContent = "SIMULACIÓN PAUSADA";
                estadoSimulacionSpan.style.color = "orange";
            }
            break;
        case 'C': // Continuar
            if (estaPausado) {
                estaPausado = false;
                estadoSimulacionSpan.textContent = "";
                bcpModal.classList.add('disableCont'); // Ocultar modal si está abierto
            }
            break;
        case 'N': // Nuevo Proceso
             if (!estaPausado) {
                nuevos.push(crearProcesoUnico());
                actualizarUI();
            }
            break;
        case 'B': // Mostrar Tabla BCP
            if (!estaPausado) {
                estaPausado = true;
                estadoSimulacionSpan.textContent = "SIMULACIÓN PAUSADA";
                estadoSimulacionSpan.style.color = "orange";
                verVentanaBCP();
            }
            break;
    }
    // Actualizar la UI inmediatamente después de una acción de teclado
    if(!estaPausado) actualizarUI();
});

// Event listener para el botón de cerrar del modal
cerrarVentanaBCP.addEventListener('click', () => {
    bcpModal.classList.add('disableCont');
    if (simuladorIntervalo !== null) { // Solo reanuda si la simulación no ha terminado
        estaPausado = false;
        estadoSimulacionSpan.textContent = "";
    }
});
// OBJETOS DEL DOM
const formInicial = document.getElementById("formInicial");
const btnIniciar = document.getElementById("iniciarSimulacion");
const numProcesosInput = document.getElementById("numProcesos");
const simulacionContenedor = document.getElementById("simulacionContenedor");
const reporteFinalContenedor = document.getElementById("reporteFinalContenedor");

// Elementos de la simulación en tiempo real
const procesosNuevosSpan = document.getElementById("procesosNuevosSpan");
const colaListosBody = document.getElementById("colaListosBody");
const procesoEnEjecucionInfo = document.getElementById("procesoEnEjecucionInfo");
const colaBloqueadosBody = document.getElementById("colaBloqueadosBody");
const procesosTerminadosBody = document.getElementById("procesosTerminadosBody");
const relojGlobalH3 = document.getElementById("relojGlobal");
const estadoSimulacionSpan = document.getElementById("estadoSimulacion");

// Elementos del reporte final
const reporteFinalBody = document.getElementById("reporteFinalBody");

// --- VARIABLES GLOBALES ---
let nuevos = [];
let listos = [];
let bloqueados = [];
let terminados = [];
let procesoEnEjecucion = null;

let relojGlobal = 0;
let simuladorIntervalo = null;
let estaPausado = false;
const MAX_PROCESOS_EN_MEMORIA = 4;
const TIEMPO_BLOQUEADO = 8;

// GENERACIÓN DE PROCESOS
const numeroAleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generarProcesos = (cantidad) => {
    const procesos = [];
    const operadores = ['+', '-', '*', '/', '%'];

    for (let i = 1; i <= cantidad; i++) {
        const operacion = operadores[numeroAleatorio(0, 4)];
        let numA = numeroAleatorio(1, 100);
        let numB = (operacion === '/' || operacion === '%') ? numeroAleatorio(1, 100) : numeroAleatorio(0, 100);

        procesos.push({
            id: i,
            operacionStr: `${numA} ${operacion} ${numB}`,
            tme: numeroAleatorio(6, 20),
            resultado: null,
            estadoFinal: 'Error', // Por si termina con 'W'
            // Tiempos
            tiempoTranscurrido: 0,
            tiempoLlegada: -1,
            tiempoFinalizacion: -1,
            tiempoRetorno: -1,
            tiempoRespuesta: -1,
            tiempoEspera: 0,
            tiempoServicio: 0,
            // Auxiliares
            tiempoEnBloqueado: 0,
            fueEjecutado: false
        });
    }
    return procesos;
};

// LÓGICA PRINCIPAL DE LA SIMULACIÓN
btnIniciar.addEventListener("click", () => {
    const cantidad = parseInt(numProcesosInput.value);
    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor, ingresa un número válido y mayor a 0.");
        return;
    }
    
    // Resetear estado
    nuevos = generarProcesos(cantidad);
    listos = [];
    bloqueados = [];
    terminados = [];
    procesoEnEjecucion = null;
    relojGlobal = 0;
    estaPausado = false;

    // Cambiar de vista
    formInicial.style.display = 'none';
    reporteFinalContenedor.classList.add('disableCont');
    simulacionContenedor.classList.remove('disableCont');
    simulacionContenedor.classList.add('enableCont');

    // Carga inicial de procesos en memoria
    while (listos.length + bloqueados.length < MAX_PROCESOS_EN_MEMORIA && nuevos.length > 0) {
        const procesoAAdmitir = nuevos.shift();
        procesoAAdmitir.tiempoLlegada = 0;
        listos.push(procesoAAdmitir);
    }

    // Colocar el primer proceso en ejecución INMEDIATAMENTE
    if (!procesoEnEjecucion && listos.length > 0) {
        procesoEnEjecucion = listos.shift(); 
        procesoEnEjecucion.fueEjecutado = true;
        procesoEnEjecucion.tiempoRespuesta = relojGlobal - procesoEnEjecucion.tiempoLlegada;
    }

    iniciarMotorSimulacion();
});

const iniciarMotorSimulacion = () => {
    if (!simuladorIntervalo) {
        simuladorIntervalo = setInterval(tick, 1000);
    }
    actualizarUI();
};

const tick = () => {
    if (estaPausado) return;
    relojGlobal++;

    manejarBloqueados();
    
    // 2. Después, admitimos a los nuevos.
    admitirNuevos();

    // 3. Manejar el proceso actualmente en ejecución
    if (procesoEnEjecucion) {
        procesoEnEjecucion.tiempoTranscurrido++;
        procesoEnEjecucion.tiempoServicio++;
        if (procesoEnEjecucion.tiempoTranscurrido >= procesoEnEjecucion.tme) {
            terminarProceso(false); // Esto deja `procesoEnEjecucion` en null
        }
    }

    // 4. Si el CPU está libre (ya sea porque terminó uno o estaba vacío), despachar el siguiente
    if (!procesoEnEjecucion && listos.length > 0) {
        procesoEnEjecucion = listos.shift();
        
        if (!procesoEnEjecucion.fueEjecutado) {
            procesoEnEjecucion.tiempoRespuesta = relojGlobal - procesoEnEjecucion.tiempoLlegada;
            procesoEnEjecucion.fueEjecutado = true;
        }
    }
    
    if (nuevos.length === 0 && listos.length === 0 && bloqueados.length === 0 && !procesoEnEjecucion) {
        finalizarSimulacion();
    }
    
    actualizarUI();
};

const manejarBloqueados = () => {
    for (let i = bloqueados.length - 1; i >= 0; i--) {
        const proc = bloqueados[i];
        proc.tiempoEnBloqueado++;
        if (proc.tiempoEnBloqueado >= TIEMPO_BLOQUEADO) {
            proc.tiempoEnBloqueado = 0;
            listos.push(proc);
            bloqueados.splice(i, 1);
        }
    }
};

const admitirNuevos = () => {
    while (listos.length + bloqueados.length + (procesoEnEjecucion ? 1 : 0) < MAX_PROCESOS_EN_MEMORIA && nuevos.length > 0) {
        const procesoAAdmitir = nuevos.shift();
        procesoAAdmitir.tiempoLlegada = relojGlobal;
        listos.push(procesoAAdmitir);
    }
};

const terminarProceso = (esError) => {
    if (!procesoEnEjecucion) return;

    if (esError) {
        procesoEnEjecucion.resultado = "ERROR";
        procesoEnEjecucion.estadoFinal = "Error";
    } else {
        procesoEnEjecucion.resultado = eval(procesoEnEjecucion.operacionStr);
        procesoEnEjecucion.estadoFinal = "Normal";
    }

    procesoEnEjecucion.tiempoFinalizacion = relojGlobal;
    procesoEnEjecucion.tiempoRetorno = procesoEnEjecucion.tiempoFinalizacion - procesoEnEjecucion.tiempoLlegada;
    procesoEnEjecucion.tiempoEspera = procesoEnEjecucion.tiempoRetorno - procesoEnEjecucion.tiempoServicio;
    
    terminados.push(procesoEnEjecucion);
    procesoEnEjecucion = null; // Dejar el CPU libre
};


const finalizarSimulacion = () => {
    clearInterval(simuladorIntervalo);
    simuladorIntervalo = null;
    estadoSimulacionSpan.textContent = "¡Simulación finalizada!";
    estadoSimulacionSpan.style.color = "lightgreen";
    
    simulacionContenedor.classList.remove('enableCont');
    simulacionContenedor.classList.add('disableCont');
    reporteFinalContenedor.classList.remove('disableCont');
    reporteFinalContenedor.classList.add('enableCont');

    mostrarReporteFinal();
};

// Actualizar DOM (sin cambios)
const actualizarUI = () => {
    procesosNuevosSpan.textContent = nuevos.length;
    relojGlobalH3.textContent = `Contador Global: ${relojGlobal}s`;

    colaListosBody.innerHTML = '';
    listos.forEach(proc => {
        colaListosBody.innerHTML += `<tr><td>${proc.id}</td><td>${proc.tme}</td><td>${proc.tiempoTranscurrido}</td></tr>`;
    });

    if (procesoEnEjecucion) {
        const tiempoRestante = procesoEnEjecucion.tme - procesoEnEjecucion.tiempoTranscurrido;
        procesoEnEjecucionInfo.innerHTML = `
            <div class="procesos-info-linea"><strong>ID:</strong> <span>${procesoEnEjecucion.id}</span></div>
            <div class="procesos-info-linea"><strong>Ope:</strong> <span>${procesoEnEjecucion.operacionStr}</span></div>
            <div class="procesos-tiempos">
                <div class="procesos-tiempo">T. Máx. Estimado: ${procesoEnEjecucion.tme}s</div>
                <div class="procesos-tiempo">T. Transcurrido: ${procesoEnEjecucion.tiempoTranscurrido}s</div>
                <div class="procesos-tiempo">T. Restante: ${tiempoRestante}s</div>
            </div>`;
    } else {
        procesoEnEjecucionInfo.innerHTML = '<p>Proceso Nulo...</p>';
    }
    
    colaBloqueadosBody.innerHTML = '';
    bloqueados.forEach(proc => {
        colaBloqueadosBody.innerHTML += `<tr><td>${proc.id}</td><td>${proc.tiempoEnBloqueado} / ${TIEMPO_BLOQUEADO}s</td></tr>`;
    });

    procesosTerminadosBody.innerHTML = '';
    terminados.forEach(proc => {
        const resultadoFormateado = (typeof proc.resultado === 'number') ? proc.resultado.toFixed(2) : proc.resultado;
        procesosTerminadosBody.innerHTML += `<tr><td>${proc.id}</td><td>${proc.operacionStr}</td><td>${resultadoFormateado}</td></tr>`;
    });
};

const mostrarReporteFinal = () => {
    reporteFinalBody.innerHTML = '';
    terminados.forEach(proc => {
        const resultadoFormateado = (typeof proc.resultado === 'number') ? proc.resultado.toFixed(2) : proc.resultado;
        reporteFinalBody.innerHTML += `
            <tr>
                <td>${proc.id}</td>
                <td>${proc.estadoFinal}</td>
                <td>${proc.operacionStr}</td>
                <td>${resultadoFormateado}</td>

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


// --- MANEJO DE TECLADO ---
document.addEventListener('keydown', (e) => {
    if (simuladorIntervalo === null) return;
    const tecla = e.key.toUpperCase();

    switch (tecla) {
        case 'E': // Interrupción por E/S
            if (procesoEnEjecucion && !estaPausado) {
                procesoEnEjecucion.tiempoEnBloqueado = 0;
                bloqueados.push(procesoEnEjecucion);
                procesoEnEjecucion = null;
                // La lógica principal en tick() se encargará de despachar el siguiente
                actualizarUI();
            }
            break;
        case 'W': // Error
            if (procesoEnEjecucion && !estaPausado) {
                terminarProceso(true);
                actualizarUI();
            }
            break;
        case 'P': // Pausa
            estaPausado = true;
            estadoSimulacionSpan.textContent = "SIMULACIÓN PAUSADA";
            estadoSimulacionSpan.style.color = "orange";
            break;
        case 'C': // Continuar
            if (estaPausado) {
                 estaPausado = false;
                 estadoSimulacionSpan.textContent = "";
            }
            break;
    }
});
// --- OBJETOS DEL DOM ---
const formInicial = document.getElementById("formInicial");
const btnIniciar = document.getElementById("iniciarSimulacion");
const numProcesosInput = document.getElementById("numProcesos");
const quantumInput = document.getElementById("quantumInput");
const simulacionContenedor = document.getElementById("simulacionContenedor");
const reporteFinalContenedor = document.getElementById("reporteFinalContenedor");

// Elementos Info
const procesosNuevosSpan = document.getElementById("procesosNuevosSpan");
const quantumValorSpan = document.getElementById("quantumValorSpan");
const proximoProcesoInfo = document.getElementById("proximoProcesoInfo");
const colaListosBody = document.getElementById("colaListosBody");
const procesoEnEjecucionInfo = document.getElementById("procesoEnEjecucionInfo");
const colaBloqueadosBody = document.getElementById("colaBloqueadosBody");
const procesosTerminadosBody = document.getElementById("procesosTerminadosBody");
const relojGlobalH3 = document.getElementById("relojGlobal");
const estadoSimulacionSpan = document.getElementById("estadoSimulacion");
const memoriaGrid = document.getElementById("memoriaGrid");

// Elementos reporte y modales
const reporteFinalBody = document.getElementById("reporteFinalBody");
const bcpModal = document.getElementById('bcpModal');
const bcpTableBody = document.getElementById('bcpTableBody');
const cerrarVentanaBCP = document.getElementById('closeBcpModal');

// Modal Tabla Paginas
const tablaPaginasModal = document.getElementById('tablaPaginasModal');
const tablaPaginasBody = document.getElementById('tablaPaginasBody');
const listaMarcosLibres = document.getElementById('listaMarcosLibres');
const cerrarTablaPaginasModal = document.getElementById('closeTablaPaginasModal');


// --- CONSTANTES DE ACTIVIDAD 14 ---
const TOTAL_MEMORIA = 240;
const TAM_MARCO = 5;
const TOTAL_MARCOS = TOTAL_MEMORIA / TAM_MARCO; // 48 Marcos
const MARCOS_SO = 4; // Marcos 0, 1, 2, 3
const TIEMPO_BLOQUEADO = 8;

// --- VARIABLES GLOBALES ---
let nuevos = [];
let listos = [];
let bloqueados = [];
let terminados = [];
let procesoEnEjecucion = null;

let relojGlobal = 0;
let quantum = 0;
let simuladorIntervalo = null;
let estaPausado = false;
let siguienteId = 1;

// Estructuras de Memoria
// memoria[i] = { idProceso: int|'SO'|null, estado: 'Libre'|'Listo'|..., slotsOcupados: int }
let memoria = []; 
let tablaPaginas = {}; // { idProceso: [marco1, marco2, ...] }
let marcosLibres = []; // Lista de indices de marcos disponibles

// --- GENERACIÓN DE PROCESOS ---
const numeroAleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const crearProcesoUnico = () => {
    const operadores = ['+', '-', '*', '/', '%'];
    const operacion = operadores[numeroAleatorio(0, 4)];
    const numA = numeroAleatorio(1, 100);
    const numB = (operacion === '/' || operacion === '%') ? numeroAleatorio(1, 100) : numeroAleatorio(0, 100);
    
    // Requerimiento 3: Tamaño aleatorio entre 6 y 30
    const tamanio = numeroAleatorio(6, 30); 
    // Requerimiento 7: Dividir en páginas
    const paginasNecesarias = Math.ceil(tamanio / TAM_MARCO);

    const nuevoProceso = {
        id: siguienteId++,
        operacionStr: `${numA} ${operacion} ${numB}`,
        tme: numeroAleatorio(6, 16), // Tiempo aleatorio
        tamanio: tamanio,
        paginasReq: paginasNecesarias,
        resultado: null,
        estadoFinal: null,
        tiempoLlegada: -1,
        tiempoFinalizacion: -1,
        tiempoRetorno: -1,
        tiempoRespuesta: -1,
        tiempoEspera: 0,
        tiempoServicio: 0,
        // Auxiliares
        tiempoEnBloqueado: 0,
        tiempoEnQuantum: 0,
        fueEjecutado: false
    };
    return nuevoProceso;
};

// --- INICIALIZACIÓN ---
const inicializarMemoria = () => {
    memoria = [];
    marcosLibres = [];
    tablaPaginas = {};

    for(let i=0; i < TOTAL_MARCOS; i++) {
        // Requerimiento 6 y 20.a: SO ocupa marcos 0-3
        if(i < MARCOS_SO) {
            memoria.push({ idProceso: 'SO', estado: 'SO', slotsOcupados: 5 });
        } else {
            memoria.push({ idProceso: null, estado: 'Libre', slotsOcupados: 0 });
            marcosLibres.push(i);
        }
    }
    renderMemoriaInicial();
};

const renderMemoriaInicial = () => {
    memoriaGrid.innerHTML = '';
    for(let i=0; i < TOTAL_MARCOS; i++) {
        const marcoDiv = document.createElement('div');
        marcoDiv.className = 'marco';
        marcoDiv.id = `marco-${i}`;
        
        const header = document.createElement('div');
        header.className = 'marco-header';
        header.innerText = i; // Requerimiento 20.a: Señalar numero de marco

        const contenido = document.createElement('div');
        contenido.className = 'marco-contenido';
        
        // 5 slots por marco para visualización de fragmentación
        for(let s=0; s<5; s++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            contenido.appendChild(slot);
        }

        marcoDiv.appendChild(header);
        marcoDiv.appendChild(contenido);
        memoriaGrid.appendChild(marcoDiv);
    }
    actualizarVisualMemoria();
};

// --- LÓGICA PRINCIPAL ---
btnIniciar.addEventListener("click", () => {
    const cantidad = parseInt(numProcesosInput.value);
    const quantumValor = parseInt(quantumInput.value);

    if (isNaN(cantidad) || cantidad <= 0 || isNaN(quantumValor) || quantumValor <= 0) {
        alert("Datos inválidos"); return;
    }

    quantum = quantumValor;
    nuevos = [];
    siguienteId = 1;
    for (let i = 0; i < cantidad; i++) nuevos.push(crearProcesoUnico());
    
    listos = []; bloqueados = []; terminados = []; procesoEnEjecucion = null;
    relojGlobal = 0; estaPausado = false;

    inicializarMemoria();

    // UI Changes
    formInicial.classList.add('disableCont');
    simulacionContenedor.classList.remove('disableCont');
    simulacionContenedor.classList.add('enableCont');
    reporteFinalContenedor.classList.add('disableCont');

    if (!simuladorIntervalo) simuladorIntervalo = setInterval(mainEjecucion, 1000); // Tick 1s
    actualizarUI();
});

const mainEjecucion = () => {
    if (estaPausado) return;

    // 1. Bloqueados
    manejarBloqueados();

    // 2. Admisión (Planificador Largo Plazo)
    // Requerimiento 9: Solo entra si hay marcos libres
    if (nuevos.length > 0) {
        const proc = nuevos[0]; // Revisar el primero
        if (proc.paginasReq <= marcosLibres.length) {
            nuevos.shift();
            proc.tiempoLlegada = relojGlobal;
            proc.estado = 'Listo'; // Aunque variable interna, el estado real esta en memoria
            asignarMemoria(proc);
            listos.push(proc);
        }
    }

    // 3. Ejecución
    if (procesoEnEjecucion) {
        procesoEnEjecucion.tiempoServicio++;
        procesoEnEjecucion.tiempoEnQuantum++;

        if (procesoEnEjecucion.tiempoServicio >= procesoEnEjecucion.tme) {
            terminarProceso(false);
        } else if (procesoEnEjecucion.tiempoEnQuantum >= quantum) {
            procesoEnEjecucion.tiempoEnQuantum = 0;
            // Cambio de estado visual en memoria
            actualizarEstadoMemoria(procesoEnEjecucion.id, 'Listo');
            listos.push(procesoEnEjecucion);
            procesoEnEjecucion = null;
        }
    }

    // 4. Despacho (Planificador Corto Plazo)
    if (!procesoEnEjecucion && listos.length > 0) {
        procesoEnEjecucion = listos.shift();
        procesoEnEjecucion.tiempoEnQuantum = 0;
        
        if (!procesoEnEjecucion.fueEjecutado) {
            procesoEnEjecucion.tiempoRespuesta = relojGlobal - procesoEnEjecucion.tiempoLlegada;
            procesoEnEjecucion.fueEjecutado = true;
        }
        // Cambio de estado visual en memoria
        actualizarEstadoMemoria(procesoEnEjecucion.id, 'Ejecucion');
    }

    // 5. Finalizar
    if (nuevos.length === 0 && listos.length === 0 && bloqueados.length === 0 && !procesoEnEjecucion) {
        finalizarSimulacion();
    } else {
        relojGlobal++;
    }
    
    actualizarUI();
};

// --- GESTIÓN DE MEMORIA ---
const asignarMemoria = (proc) => {
    tablaPaginas[proc.id] = [];
    let tamRestante = proc.tamanio;

    for(let i=0; i < proc.paginasReq; i++) {
        const marcoIdx = marcosLibres.shift(); // Obtener primer marco libre
        tablaPaginas[proc.id].push(marcoIdx);
        
        memoria[marcoIdx].idProceso = proc.id;
        memoria[marcoIdx].estado = 'Listo';
        
        // Fragmentación interna (Requerimiento 20.a)
        if(tamRestante >= TAM_MARCO) {
            memoria[marcoIdx].slotsOcupados = TAM_MARCO;
            tamRestante -= TAM_MARCO;
        } else {
            memoria[marcoIdx].slotsOcupados = tamRestante;
            tamRestante = 0;
        }
    }
    // Ordenar marcos libres para limpieza visual (opcional)
    marcosLibres.sort((a,b) => a-b);
};

const liberarMemoria = (proc) => {
    if(!tablaPaginas[proc.id]) return;
    
    const marcos = tablaPaginas[proc.id];
    marcos.forEach(mIdx => {
        memoria[mIdx].idProceso = null;
        memoria[mIdx].estado = 'Libre';
        memoria[mIdx].slotsOcupados = 0;
        marcosLibres.push(mIdx);
    });
    delete tablaPaginas[proc.id];
    marcosLibres.sort((a,b) => a-b);
};

const actualizarEstadoMemoria = (idProc, nuevoEstado) => {
    if(!tablaPaginas[idProc]) return;
    tablaPaginas[idProc].forEach(mIdx => {
        memoria[mIdx].estado = nuevoEstado;
    });
};

const actualizarVisualMemoria = () => {
    for(let i=0; i < TOTAL_MARCOS; i++) {
        const m = memoria[i];
        const marcoEl = document.getElementById(`marco-${i}`);
        const slots = marcoEl.querySelectorAll('.slot');

        // Limpiar clases previas
        slots.forEach(s => {
            s.className = 'slot'; 
            s.title = '';
        });

        if(m.estado !== 'Libre') {
            let clase = '';
            switch(m.estado) {
                case 'SO': clase = 'so'; break; // Negro
                case 'Listo': clase = 'listo'; break; // Azul
                case 'Ejecucion': clase = 'ejecucion'; break; // Rojo
                case 'Bloqueado': clase = 'bloqueado'; break; // Morado
            }

            // Llenar slots ocupados (Fragmentación interna visual)
            for(let k=0; k < m.slotsOcupados; k++) {
                slots[k].classList.add(clase);
            }
            marcoEl.title = m.idProceso === 'SO' ? "S.O." : `Proceso ID: ${m.idProceso}`;
        }
    }
};

// --- FUNCIONES DE AYUDA ---
const manejarBloqueados = () => {
    for (let i = bloqueados.length - 1; i >= 0; i--) {
        const proc = bloqueados[i];
        proc.tiempoEnBloqueado++;
        if (proc.tiempoEnBloqueado >= TIEMPO_BLOQUEADO) {
            proc.tiempoEnBloqueado = 0;
            proc.tiempoEnQuantum = 0; 
            actualizarEstadoMemoria(proc.id, 'Listo');
            listos.push(proc);
            bloqueados.splice(i, 1);
        }
    }
};

const terminarProceso = (esError) => {
    if (!procesoEnEjecucion) return;

    procesoEnEjecucion.estadoFinal = esError ? "Error" : "Normal";
    try {
        procesoEnEjecucion.resultado = esError ? "ERROR" : eval(procesoEnEjecucion.operacionStr).toFixed(2);
    } catch { procesoEnEjecucion.resultado = "ERROR"; }

    procesoEnEjecucion.tiempoFinalizacion = relojGlobal;
    procesoEnEjecucion.tiempoRetorno = procesoEnEjecucion.tiempoFinalizacion - procesoEnEjecucion.tiempoLlegada;
    procesoEnEjecucion.tiempoEspera = procesoEnEjecucion.tiempoRetorno - procesoEnEjecucion.tiempoServicio;

    terminados.push(procesoEnEjecucion);
    liberarMemoria(procesoEnEjecucion);
    procesoEnEjecucion = null;
};

const finalizarSimulacion = () => {
    clearInterval(simuladorIntervalo);
    simuladorIntervalo = null;
    estadoSimulacionSpan.textContent = "¡Simulación finalizada!";
    estadoSimulacionSpan.style.color = "#2ECC71";
    
    setTimeout(() => {
        let sim = document.getElementById('simulacionContenedor');
        
        sim.classList.remove('enableCont');
        sim.classList.add('disableCont');  
        
        reporteFinalContenedor.classList.remove('disableCont');
        reporteFinalContenedor.classList.add('enableCont'); 
        
        verTablaFinalDatos();
    }, 100);
};

// --- ACTUALIZACIÓN UI ---
const actualizarUI = () => {
    procesosNuevosSpan.textContent = nuevos.length;
    quantumValorSpan.textContent = quantum;
    relojGlobalH3.textContent = `Contador Global: ${relojGlobal}s`;

    // Requerimiento 20.b.i: Info del siguiente proceso a entrar
    if(nuevos.length > 0) {
        proximoProcesoInfo.innerHTML = `Siguiente ID: <strong>${nuevos[0].id}</strong> | Tam: <strong>${nuevos[0].tamanio}</strong> | Pags: <strong>${nuevos[0].paginasReq}</strong>`;
    } else {
        proximoProcesoInfo.textContent = "Cola Nuevos Vacía";
    }

    // Listos
    colaListosBody.innerHTML = '';
    listos.forEach(proc => {
        colaListosBody.innerHTML += `<tr><td>${proc.id}</td><td>${proc.tme}</td><td>${proc.tme - proc.tiempoServicio}</td></tr>`;
    });

    // Ejecución
    if (procesoEnEjecucion) {
        const restante = procesoEnEjecucion.tme - procesoEnEjecucion.tiempoServicio;
        procesoEnEjecucionInfo.innerHTML = `
            <p><strong>ID:</strong> ${procesoEnEjecucion.id}</p>
            <p><strong>Op:</strong> ${procesoEnEjecucion.operacionStr}</p>
            <p><strong>TME:</strong> ${procesoEnEjecucion.tme}</p>
            <p><strong>Trans:</strong> ${procesoEnEjecucion.tiempoServicio}</p>
            <p><strong>Rest:</strong> ${restante}</p>
            <p><strong>Q:</strong> ${procesoEnEjecucion.tiempoEnQuantum}/${quantum}</p>
            <p><strong>Tam:</strong> ${procesoEnEjecucion.tamanio}</p>
        `;
    } else {
        procesoEnEjecucionInfo.innerHTML = '<p>Proceso Nulo...</p>';
    }

    // Bloqueados
    colaBloqueadosBody.innerHTML = '';
    bloqueados.forEach(proc => {
        const restante = TIEMPO_BLOQUEADO - proc.tiempoEnBloqueado;
        colaBloqueadosBody.innerHTML += `<tr><td>${proc.id}</td><td>${restante}</td></tr>`;
    });

    // Terminados
    procesosTerminadosBody.innerHTML = '';
    terminados.forEach(proc => {
        procesosTerminadosBody.innerHTML += `<tr><td>${proc.id}</td><td>${proc.operacionStr}</td><td>${proc.resultado}</td></tr>`;
    });

    actualizarVisualMemoria();
};

// --- MODALES ---
const verTablaFinalDatos = () => {
    
    reporteFinalBody.innerHTML = '';
    terminados.sort((a, b) => a.id - b.id).forEach(proc => {
        reporteFinalBody.innerHTML += `<tr>
            <td>${proc.id}</td><td>${proc.estadoFinal}</td><td>${proc.operacionStr}</td>
            <td>${proc.resultado}</td><td>${proc.tiempoLlegada}</td><td>${proc.tiempoFinalizacion}</td>
            <td>${proc.tiempoRetorno}</td><td>${proc.tiempoRespuesta}</td><td>${proc.tiempoEspera}</td>
            <td>${proc.tiempoServicio}</td>
        </tr>`;
    });

    simulacionContenedor.style.display = "none";
};

const verVentanaBCP = () => {
    bcpTableBody.innerHTML = '';
    // Recopilar todos los procesos en memoria o terminados
    const todos = [...listos, ...bloqueados, ...terminados];
    if (procesoEnEjecucion) todos.push(procesoEnEjecucion);
    // Agregamos nuevos también aunque no estén en memoria, para ver su estado
    nuevos.forEach(p => todos.push(p));

    todos.sort((a, b) => a.id - b.id);

    todos.forEach(proc => {
        let est = "Nuevo";
        if(proc === procesoEnEjecucion) est = "Ejecucion";
        else if(listos.includes(proc)) est = "Listo";
        else if(bloqueados.includes(proc)) est = "Bloqueado";
        else if(terminados.includes(proc)) est = "Terminado";

        // Cálculo dinámico para tiempos parciales
        let espera = proc.tiempoEspera;
        let servicio = proc.tiempoServicio;
        let tRetorno = (est === 'Terminado') ? proc.tiempoRetorno : (relojGlobal - proc.tiempoLlegada);
        
        if(est !== 'Terminado' && est !== 'Nuevo') {
             espera = (relojGlobal - proc.tiempoLlegada) - servicio;
        }
        if(est === 'Nuevo') { espera = 0; }

        if (est === 'Terminado') {
            tRetorno = tRetorno;
        } else {
            tRetorno = '-';
        }

        // <td>${tRetorno >=0 ? tRetorno : '-'}</td><td>${proc.tiempoRespuesta >=0 ? proc.tiempoRespuesta : '-'}</td>
        
        bcpTableBody.innerHTML += `<tr>
            <td>${proc.id}</td><td>${est}</td><td>${proc.operacionStr}</td>
            <td>${proc.resultado || '-'}</td><td>${proc.tiempoLlegada >=0 ? proc.tiempoLlegada : '-'}</td>
            <td>${proc.tiempoFinalizacion >=0 ? proc.tiempoFinalizacion : '-'}</td>
            <td>${tRetorno}</td><td>${proc.tiempoRespuesta >=0 ? proc.tiempoRespuesta : '-'}</td>
            <td>${espera}</td><td>${servicio}</td><td>${proc.tme - servicio}</td>
        </tr>`;
    });
    bcpModal.classList.remove('disableCont');
};

// Requerimiento 11: Tabla de Páginas
const verTablaPaginas = () => {
    tablaPaginasBody.innerHTML = '';
    
    // Procesos activos (Listos, Bloqueados, Ejecucion)
    const activos = [...listos, ...bloqueados];
    if(procesoEnEjecucion) activos.push(procesoEnEjecucion);
    
    // Agregar SO
    tablaPaginasBody.innerHTML += `<tr>
        <td>S.O.</td><td>20 (4 frames)</td><td>0, 1, 2, 3</td>
    </tr>`;

    activos.sort((a,b)=>a.id - b.id).forEach(proc => {
        const frames = tablaPaginas[proc.id] ? tablaPaginas[proc.id].join(', ') : '-';
        tablaPaginasBody.innerHTML += `<tr>
            <td>${proc.id}</td><td>${proc.tamanio}</td><td>${frames}</td>
        </tr>`;
    });

    // Requerimiento 11: Relación de marcos libres
    listaMarcosLibres.textContent = marcosLibres.sort((a,b)=>a-b).join(', ') || "Ninguno";

    tablaPaginasModal.classList.remove('disableCont');
};

// --- EVENTOS TECLADO ---
document.addEventListener('keydown', (e) => {
    if (!simuladorIntervalo && e.key.toUpperCase() !== 'C') return;
    const key = e.key.toUpperCase();

    switch (key) {
        case 'E': // Interrupción
            if (procesoEnEjecucion && !estaPausado) {
                procesoEnEjecucion.tiempoEnQuantum = 0;
                actualizarEstadoMemoria(procesoEnEjecucion.id, 'Bloqueado');
                bloqueados.push(procesoEnEjecucion);
                procesoEnEjecucion = null;
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
                bcpModal.classList.add('disableCont');
                tablaPaginasModal.classList.add('disableCont');
            }
            break;
        case 'N': // Nuevo
            if (!estaPausado) {
                nuevos.push(crearProcesoUnico());
                actualizarUI();
            }
            break;
        case 'B': // BCP
            if (!estaPausado) {
                estaPausado = true;
                estadoSimulacionSpan.textContent = "PAUSADO (BCP)";
                verVentanaBCP();
            }
            break;
        case 'T': // Tabla Paginas (Requerimiento 15)
            if (!estaPausado) {
                estaPausado = true;
                estadoSimulacionSpan.textContent = "PAUSADO (Tabla Páginas)";
                verTablaPaginas();
            }
            break;
    }
});

cerrarVentanaBCP.addEventListener('click', () => {
    bcpModal.classList.add('disableCont');
    estaPausado = false;
    estadoSimulacionSpan.textContent = "";
});

cerrarTablaPaginasModal.addEventListener('click', () => {
    tablaPaginasModal.classList.add('disableCont');
    estaPausado = false;
    estadoSimulacionSpan.textContent = "";
});
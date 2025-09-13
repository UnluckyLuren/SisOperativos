// Objetos del DOM

const contenedorInicial = document.getElementById("lotes");
const btnIniciar = document.getElementById("iniciarSimulacion");
const numProcesosInput = document.getElementById("numProcesos");
const simulacionContenedor = document.getElementById("simulacionContenedor");

// Elementos de simulación
const lotesPendientesSpan = document.getElementById("lotesPendientesSpan");
const procesosEsperaBody = document.getElementById("procesosEsperaBody");
const procesoEnEjecucionInfo = document.getElementById("procesoEnEjecucionInfo");
const procesosTerminadosBody = document.getElementById("procesosTerminadosBody");
const relojGlobalH3 = document.getElementById("relojGlobal");
const estadoSimulacionSpan = document.getElementById("estadoSimulacion");


// Variables Globales

let lotes = [];
let loteActualIndice = -1;
let procesoEnEjecucion = null;
let procesosTerminados = [];
let relojGlobal = 0;
let simuladorIntervalo = null;
let estaPausado = false;


// Generación de Procesos

const numeroAleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generarProcesos = (cantidad) => {
    const procesos = [];
    const operadores = ['+', '-', '*', '/', '%', '^'];
    for (let i = 1; i <= cantidad; i++) {
        const operacion = operadores[numeroAleatorio(0, 5)];
        let numA = numeroAleatorio(1, 100);
        let numB;
        do {
            numB = numeroAleatorio(0, 100);
        } while ((operacion === '/' || operacion === '%') && numB === 0);

        procesos.push({
            id: i,
            operacionStr: `${numA} ${operacion} ${numB}`,
            operacion: operacion,
            numA: numA,
            numB: numB,
            tme: numeroAleatorio(6, 10),
            tiempoTranscurrido: 0,
            numeroLote: 0,
        });
    }
    return procesos;
}

const crearLotes = (procesos) => {
    const lotesArr = [];
    let loteNum = 1;
    for (let i = 0; i < procesos.length; i += 4) {
        const lote = procesos.slice(i, i + 4);
        lote.forEach(proc => proc.numeroLote = loteNum);
        lotesArr.push(lote);
        loteNum++;
    }
    return lotesArr;
}

// Proceso principal

btnIniciar.addEventListener("click", () => {
    const cantidad = parseInt(numProcesosInput.value);
    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor, ingresa un número válido y mayor a 0.");
        return;
    }
    
    const procesosListos = generarProcesos(cantidad);
    lotes = crearLotes(procesosListos);
    loteActualIndice = 0;

    contenedorInicial.style.display = 'none';
    simulacionContenedor.classList.remove('disableCont');

    iniciarMotorSimulacion();
});

const iniciarMotorSimulacion = () => {
    if (lotes.length > 0) {
        simuladorIntervalo = setInterval(tick, 1000);
        actualizarUI();
    }
}

const tick = () => {
    if (estaPausado) return;
    relojGlobal++;

    if (!procesoEnEjecucion && lotes[loteActualIndice]?.length > 0) {
        procesoEnEjecucion = lotes[loteActualIndice].shift();
    }

    if (procesoEnEjecucion) {
        procesoEnEjecucion.tiempoTranscurrido++;
        if (procesoEnEjecucion.tiempoTranscurrido >= procesoEnEjecucion.tme) {
            terminarProceso(false);
        }
    } else {
        if (lotes[loteActualIndice] && lotes[loteActualIndice].length === 0) {
             if (loteActualIndice < lotes.length - 1) {
                loteActualIndice++;
            } else {
                finalizarSimulacion();
            }
        }
    }
    actualizarUI();
}

const terminarProceso = (esError) => {
   if (!procesoEnEjecucion) return;

    let resultado; // Variable para el resultado final formateado (string)
    if (esError) {
        resultado = "ERROR";
    } else {
        const { numA, numB, operacion } = procesoEnEjecucion;
        let resultadoNumerico; // Variable para el cálculo numérico

        // 1. Se calcula el resultado numérico
        switch (operacion) {
            case '+': resultadoNumerico = numA + numB; break;
            case '-': resultadoNumerico = numA - numB; break;
            case '*': resultadoNumerico = numA * numB; break;
            case '/': resultadoNumerico = numA / numB; break;
            case '%': resultadoNumerico = numA % numB; break;
            case '^': resultadoNumerico = Math.pow(numA, numB); break;
            default: resultadoNumerico = 'Error'; // Marcar como error si la operación no es válida
        }

        // 2. Se formatea el resultado según las reglas

        if (resultadoNumerico === 'Error') {
            resultado = "ERROR";
        } else if (Math.abs(resultadoNumerico) > 10000) {
            // Si es mayor a 10000, usamos notación científica
            resultado = resultadoNumerico.toExponential(2);
        } else if (operacion === '/' || operacion === '%') {
            // Si es división o residuo (y no es mayor a 10000), redondeamos a 2 decimales
            resultado = resultadoNumerico.toFixed(2);
        } else {
            // En los demás casos (+, -, *), mostramos el número tal cual
            resultado = resultadoNumerico;
        }
    }

    procesosTerminados.push({
        id: procesoEnEjecucion.id,
        operacionStr: procesoEnEjecucion.operacionStr,
        resultado: resultado,
        numeroLote: procesoEnEjecucion.numeroLote,
    });
    procesoEnEjecucion = null;
}

const finalizarSimulacion = () => {
    if (simuladorIntervalo) {
        clearInterval(simuladorIntervalo);
        simuladorIntervalo = null;
        estadoSimulacionSpan.textContent = "Procesos Terminados";
        estadoSimulacionSpan.style.color = "lightgreen";
        actualizarUI();
    }
}

// Actualizar el DOM

const actualizarUI = () => {
    // 1. Info General: Lotes pendientes y reloj global
    const lotesTotales = lotes.length;
    const lotesRestantes = procesoEnEjecucion === null && (!lotes[loteActualIndice] || lotes[loteActualIndice].length === 0)
        ? Math.max(0, lotesTotales - 1 - loteActualIndice)
        : Math.max(0, lotesTotales - loteActualIndice - 1);
    lotesPendientesSpan.textContent = lotesRestantes;
    relojGlobalH3.textContent = `Contador Global: ${relojGlobal}s`;

    // 2. Columna de Procesos en Espera (Lote Actual)
    procesosEsperaBody.innerHTML = '';
    if (lotes[loteActualIndice]) {
        lotes[loteActualIndice].forEach(proc => {
            const row = document.createElement('tr');
            row.colSpan = 3;

            row.innerHTML = `
                <td>${proc.id}</td>
                <td>${proc.tme}</td>
                <td>${proc.tiempoTranscurrido}</td>
            `;
            procesosEsperaBody.appendChild(row);
        });
    }

    // 3. Columna de Proceso en Ejecución
    if (procesoEnEjecucion) {
        const tiempoRestante = procesoEnEjecucion.tme - procesoEnEjecucion.tiempoTranscurrido;
        procesoEnEjecucionInfo.innerHTML = `
            <div class="procesos-info-linea"><strong>ID:</strong> <span>${procesoEnEjecucion.id}</span></div>
            <div class="procesos-info-linea"><strong>Ope:</strong> <span>${procesoEnEjecucion.operacionStr}</span></div>
            <div class="procesos-tiempos">
                <div class="procesos-tiempo">TME: ${procesoEnEjecucion.tme}s</div>
                <div class="procesos-tiempo">TT: ${procesoEnEjecucion.tiempoTranscurrido}s</div>
                <div class="procesos-tiempo">TR: ${tiempoRestante}s</div>
            </div>
        `;

    } else {
        procesoEnEjecucionInfo.innerHTML = '<p>Procesador libre...</p>';
    }

    // 4. Columna de Procesos Terminados
    procesosTerminadosBody.innerHTML = '';
    procesosTerminados.forEach(proc => {
        const row = document.createElement('tr');
        let resUt = 0;

        if (proc.resultado === 'ERROR') {
            resUt = 'ERROR';
        } else {
            resUt = parseFloat(proc.resultado).toFixed(2);
        }

        row.innerHTML = `
            <td>${proc.id}</td>
            <td>${proc.operacionStr}</td>
            <td>${resUt}</td>
            <td>${proc.numeroLote}</td>
        `;
        procesosTerminadosBody.appendChild(row);
    });
}

// Eventos

document.addEventListener('keydown', (e) => {
    if (simuladorIntervalo === null) return;
    const tecla = e.key.toUpperCase();

    switch (tecla) {
        case 'E':
            if (procesoEnEjecucion) {
                lotes[loteActualIndice].push(procesoEnEjecucion);
                procesoEnEjecucion = null;
            }
            break;
        case 'W':
            if (procesoEnEjecucion) {
                terminarProceso(true);
            }
            break;
        case 'P':
            estaPausado = true;
            estadoSimulacionSpan.textContent = "PAUSADO";
            estadoSimulacionSpan.style.color = "orange";
            break;
        case 'C':
            if (estaPausado) {
                 estaPausado = false;
                 estadoSimulacionSpan.textContent = "";
            }
            break;
    }
    
    if (['E', 'W'].includes(tecla)) {
        actualizarUI();
    }
});
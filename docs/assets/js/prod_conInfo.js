// Variables y constantes globales
const cantEstante = 18;
const minimoTransaccion = 3;
const maximoTransaccion = 6;
const nadota = '';
const numLib = 28; // Cantidad de libros en imagenes

const librosDir = [];

for (let i = 1; i < (numLib+1); i++) {
    librosDir.push(`img/Libros/${i}.jpeg`);
}

// índice para saber qué libro del catálogo sigue.
let siguienteLibroIndex = 0;

// OBJETOS DEL DOM
const estanteDisplay = document.getElementById('estante-display');
const productorEstadoSpan = document.getElementById('productor-estado');
const productorIndiceSpan = document.getElementById('productor-indice');
const consumidorEstadoSpan = document.getElementById('consumidor-estado');
const consumidorIndiceSpan = document.getElementById('consumidor-indice');
const mensajeFinalDiv = document.getElementById('mensaje-final');

// Variables para detectar el estado de la simulacion
let estante = new Array(cantEstante).fill(nadota);
let librosEnEstante = 0;
let productorIndex = 0;
let consumidorIndex = 0;
let mutex = false; // false = libre, true = ocupado
let timers = [];

// FUNCIONES
const numeroAleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const actualizarUI = () => {
    estante.forEach((contenido, index) => {
        const espacio = document.getElementById(`espacio-${index}`);
        espacio.innerHTML = `<span class="espacio-numero">${index + 1}</span>`;
        if (contenido !== nadota) {
            const img = document.createElement('img');
            img.src = contenido;
            img.alt = 'Libro';
            espacio.appendChild(img);
            espacio.classList.add('ocupado');
        } else {
            espacio.classList.remove('ocupado');
        }
    });
    productorIndiceSpan.textContent = productorIndex + 1;
    consumidorIndiceSpan.textContent = consumidorIndex + 1;
};

function despertarProductor() {
    productorEstadoSpan.textContent = 'Buscando espacio...';
    if (!mutex && librosEnEstante < cantEstante) {
        mutex = true;
        producir();
    } else {
        const razon = mutex ? 'el cliente está escogiendo' : 'lleno';
        productorEstadoSpan.textContent = `Estante ${razon}. Esperando...`;
        const timerId = setTimeout(despertarProductor, numeroAleatorio(1500, 2500));
        timers.push(timerId);
    }
}

function producir() {
    const cantidadAProducir = numeroAleatorio(minimoTransaccion, maximoTransaccion);
    const espacioDisponible = cantEstante - librosEnEstante;
    const cantidadReal = Math.min(cantidadAProducir, espacioDisponible);

    productorEstadoSpan.textContent = `Colocando ${cantidadReal} libro(s)...`;

    let producidos = 0;
    const intervaloProduccion = setInterval(() => {
        if (producidos >= cantidadReal) {
            clearInterval(intervaloProduccion);
            mutex = false;
            programarProximoDespertar('productor');
            return;
        }
        
        // Colocamos el siguiente libro del catálogo en el estante.
        estante[productorIndex] = librosDir[siguienteLibroIndex];
        
        //    Actualizamos el índice para que el próximo libro sea el siguiente en la lista.
        //    Usamos el módulo (%) para que vuelva al inicio después del libro 26.
        siguienteLibroIndex = (siguienteLibroIndex + 1) % librosDir.length;

        librosEnEstante++;
        productorIndex = (productorIndex + 1) % cantEstante;
        producidos++;
        actualizarUI();
    }, 400);
}

function despertarConsumidor() {
    consumidorEstadoSpan.textContent = 'Buscando libros...';
    if (!mutex && librosEnEstante > 0) {
        mutex = true;
        consumir();
    } else {
        const razon = mutex ? 'el bibliotecario está trabajando' : 'vacío';
        consumidorEstadoSpan.textContent = `Estante ${razon}. Esperando...`;
        const timerId = setTimeout(despertarConsumidor, numeroAleatorio(1500, 2500));
        timers.push(timerId);
    }
}

function consumir() {
    const cantidadAConsumir = numeroAleatorio(minimoTransaccion, maximoTransaccion);
    const cantidadReal = Math.min(cantidadAConsumir, librosEnEstante);

    consumidorEstadoSpan.textContent = `Retirando ${cantidadReal} libro(s)...`;

    let consumidos = 0;
    const intervaloConsumo = setInterval(() => {
        if (consumidos >= cantidadReal) {
            clearInterval(intervaloConsumo);
            mutex = false;
            programarProximoDespertar('consumidor');
            return;
        }
        estante[consumidorIndex] = nadota;
        librosEnEstante--;
        consumidorIndex = (consumidorIndex + 1) % cantEstante;
        consumidos++;
        actualizarUI();
    }, 400);
}

function programarProximoDespertar(actor) {
    const tiempoDormido = numeroAleatorio(2500, 5000);
    if (actor === 'productor') {
        productorEstadoSpan.textContent = `Tomando un descanso (${tiempoDormido / 1000}s)...`;
        const timerId = setTimeout(despertarProductor, tiempoDormido);
        timers.push(timerId);
    } else {
        consumidorEstadoSpan.textContent = `Salió de la tienda (${tiempoDormido / 1000}s)...`;
        const timerId = setTimeout(despertarConsumidor, tiempoDormido);
        timers.push(timerId);
    }
}

function finalizarSimulacion() {
    timers.forEach(timerId => clearTimeout(timerId));
    timers = [];
    for (let i = 0; i < 99999; i++) clearInterval(i);

    document.removeEventListener('keydown', handleKeyPress);
    productorEstadoSpan.textContent = 'TIENDA CERRADA';
    consumidorEstadoSpan.textContent = 'TIENDA CERRADA';
    mensajeFinalDiv.classList.remove('disable');
    mensajeFinalDiv.classList.add('enable');
}

function handleKeyPress(e) {
    if (e.key === 'Escape') {
        finalizarSimulacion();
    }
}

function iniciar() {
    for (let i = 0; i < cantEstante; i++) {
        const espacio = document.createElement('div');
        espacio.id = `espacio-${i}`;
        espacio.className = 'espacio-libro';
        const numeroEspacio = document.createElement('span');
        numeroEspacio.className = 'espacio-numero';
        numeroEspacio.textContent = i + 1;
        espacio.appendChild(numeroEspacio);
        estanteDisplay.appendChild(espacio);
    }
    document.addEventListener('keydown', handleKeyPress);
    programarProximoDespertar('productor');
    programarProximoDespertar('consumidor');
    actualizarUI();
}

window.onload = iniciar;
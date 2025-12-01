// --- OBJETOS DOM EXISTENTES ---
const contLi = document.querySelector('.misLi');
const contVisorPdf = document.getElementById('contVisorPdf');
const portada = document.getElementById('portada');
const btnCargarPdf = document.getElementById('btnCargarPdf'); // Nuevo botón

// Descripciones

const descTareas = [
    `En esta primera actividad, senté las bases teóricas de la materia. Comencé creando un archivo por lotes (.bat) para entender cómo el sistema interpreta comandos secuenciales, utilizando instrucciones como echo, md y ping.
    Posteriormente, realicé una investigación sobre: La definición de SO, su Evolución y los tipos de sistemas.`,
    
    `Aquí exploré cómo se estructuran internamente los sistemas operativos. Investigué los principales modelos: Monolítico, Microkernel, por Capas,
    además, investigué 8 sistemas operativos específicos (como Haiku, ReactOS y TempleOS). Elegí profundizar en Plan 9 de Bell Labs, el cual me pareció interesante por su protocolo 9P y su filosofía de tratar todo (incluso la red) como un sistema de archivos.`,

    `Esta tarea fue crucial para entender cómo la CPU administra múltiples tareas. Ciclo de Vida del Proceso, BCP (Bloque de Control de Proceso), Algoritmos de Planificación, Métricas`,

    `Profundicé en la ejecución concurrente, enfocándome en: Hilos POSIX (Pthreads), Estados Complejos, 
    Round Robin y Quantum: Detallé cómo este algoritmo usa como tiempo el quantum para asegurar que todos los procesos tengan turno en la CPU, siendo ideal para sistemas de tiempo compartido.`,

    `En este trabajo colaborativo, abordamos el problema de la Sección Crítica y la sincronización. Analizamos las condiciones de carrera (race conditions) que ocurren cuando procesos compiten por recursos compartidos sin control.
    Analizamos tambien el Algoritmo de Dekker y el Algoritmo de Peterson como una posible solución.`,

    `Investigué cómo el SO maneja la RAM, un recurso finito. Técnicas de Asignación, Paginación y Segmentación, Memoria Virtual, Buffers`,

    `Me enfoqué en el almacenamiento y recuperación de datos. Operaciones de Archivos: Listé acciones básicas como Crear, Leer, Escribir, Renombrar y sus implicaciones, también Estructuras de Datos (Indices y Hashing), 
    y por último Manejo de Colisiones: listas enlazadas y el direccionamiento abierto.`,

    `Para mi última actividad, abordé la seguridad informática. Criptografía vs. Esteganografía, Seguridad en SO y Redes y el Factor Humano: Realicé un resumen del episodio "Cállate y Baila" de Black Mirror`
];

const descRep = [
    `Para mi primera práctica de programación, desarrollé un simulador que emula el funcionamiento de los sistemas antiguos por lotes.`,
    `En esta actividad, se mejoró la simulación para visualizar mejor los estados básicos de un proceso.`,
    `En este programa hice un avance importante implementando el algoritmo First Come, First Served bajo un modelo de 5 estados (Nuevo, Listo, Ejecución, Bloqueado, Terminado).`,
    `Refiné el programa anterior para tener un control total sobre la simulación y visualizar el Bloque de Control de Proceso.`,
    `Transformé mi planificador FCFS en uno apropiativo (pre-emptive) implementando Round-Robin.`,
    `Para entender la sincronización en productor consumidor, desarrollé una simulación gráfica con temática de librería.`,
    `Integré la gestión de memoria real a mi simulador Round-Robin resultando en la paginación: Mapa de Memoria, Fragmentación Interna y Validación de Admisión.`,
    `Mi entrega final añadió la capacidad de suspender procesos, simulando el disco duro: Suspensión, Recuperación y ajustes visuales.`
];

const enlaceshtml = ['lotes','multiprogramacion','fcfs','fcfs_2','rr','prod_con','pag','pagSus'];

// --- CONFIGURACIÓN GLOBAL PDF ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Variables de estado (inicializadas en null o valores por defecto)
let pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 1.5,
    miCanva = null, // Se asignará al cargar
    miCtx = null;   // Se asignará al cargar


// --- FUNCIONES DEL PDF ---

/* Obtiene la información de la página y la renderiza */
function renderPage(num) {
    pageRendering = true;

    // Obtener página
    pdfDoc.getPage(num).then(function (page) {

        // OBTENER DIMENSIONES DEL CONTENEDOR
        const container = document.getElementById('canvas-container');
        const containerWidth = container.clientWidth;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / unscaledViewport.width;

        // CREAR EL VIEWPORT FINAL CON LA NUEVA ESCALA
        const viewport = page.getViewport({ scale: scale });

        // Ajustar dimensiones internas del canvas
        miCanva.height = viewport.height;
        miCanva.width = viewport.width;

        // Renderizar
        const renderContext = {
            canvasContext: miCtx,
            viewport: viewport
        };

        const renderTask = page.render(renderContext);

        renderTask.promise.then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    // Actualizar contadores UI
    const pageNumSpan = document.getElementById('page_num');
    if (pageNumSpan) pageNumSpan.textContent = num;
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
}


// --- EVENTO PRINCIPAL DE CARGA ---

const cargarPdf = (url, desc, bol, id) => {

    // Evitar recargar si ya está cargado
    // if (pdfDoc !== null && document.getElementById('miPDfVisor')) {
    //     console.log("El PDF ya está cargado.");
    //     return;
    // }

    // Crear estructura DOM 
    let templateVisor = `
        <div id="controls" style="margin-bottom: 10px;">
            <button id="prev" onClick='onPrevPage()'>Anterior</button>
            <button id="next" onClick='onNextPage()'>Siguiente</button>
            <span>Página: <span id="page_num"></span> / <span id="page_count"></span></span>
        </div>
        <div id="canvas-container">
            <canvas id="miPDfVisor" style="border: 1px solid black;"></canvas>
        </div>
        <h2 class="miDesc">${desc}</h2>
    `;

    if (bol) {
        templateVisor += `
            <div class="enl">
                <a href="./${enlaceshtml[id]}.html"><h2>Ejecutable</h2></a>
                <a href="https://github.com/UnluckyLuren/SisOperativos" target="_blank"><h2>Código</h2></a>  
            </div>
        `;
    }

    // Limpiamos el contenido previo
    portada.style.display = 'none';
    contVisorPdf.innerHTML = templateVisor;

    // Asignar variables del DOM recién creadas
    miCanva = document.getElementById('miPDfVisor');
    miCtx = miCanva.getContext('2d');

    pdfjsLib.getDocument(url).promise.then(function (pdfDoc_) {
        pdfDoc = pdfDoc_;
        document.getElementById('page_count').textContent = pdfDoc.numPages;

        // Renderizar la página 1
        renderPage(pageNum);
        console.log('PDF Cargado correctamente');

    }).catch(function (error) {
        console.error('Error al cargar el PDF:', error);
        contVisorPdf.innerHTML = `<p style="color:red">Error cargando el PDF.</p>`;
    });
};

contLi.addEventListener('click', e => {
    let tag = e.target.tagName;
    let cont = e.target.textContent;
    let suId = e.target.id;

    // Pagina actual
    let rutaCompleta = window.location.pathname;
    let nombreArchivo = rutaCompleta.split('/').pop();

    if (tag === 'LI') {
        if (cont != 'Inicio') {

            if (nombreArchivo === 'reportes.html') {
                let url = `./reportesPDF/${suId}.pdf`;                
                cargarPdf(url, descRep[suId-1], true, suId-1);
            } else {
                let url = `./misTareasPDF/${suId}.pdf`;
                cargarPdf(url, descTareas[suId-1], false, 0);
            }

            portada.style.display = 'none';
            pageNum = 1;
        } else {
            portada.style.display = 'block';
            contVisorPdf.innerHTML = '';
            // Reseteamos variables
            pdfDoc = null;
            pageNum = 1;
        }
    }
});
// Objetos DOM

const numeroLotes = document.getElementById("lotes");
const contProcesosPedidos = document.getElementById("contProcesosPedidos");
const formularioProcesos = document.getElementById("procesosForm");
const btnIniciar = document.getElementById("iniciarRecopilacion");
const numProcesos = document.getElementById("numProcesos");
const btnEnviarForm = document.getElementById("btnEnviarForm");
const formOriginal = document.getElementById("formOriginal");
const procesoSpan = document.getElementById("procesoActual");
const tablaRes = document.getElementById("tablaRes");

// Objetos tabla resultados

const liNombres = document.getElementById("liNombres");
const lotPen = document.getElementById("lotPen");
const datEjecucion = document.querySelectorAll(".datEjecucion");
const tiempoProc = document.querySelectorAll(".procesos-tiempo");
const resultadosFinalesTr = document.getElementById("resCont");

// Datos del formulario
// Objeto literal a lograr: {Nombre, 1erNum, 2doNum, operacion, tiempoEstimado, id}

const misDatos = document.querySelectorAll(".datosP"); // Nombre, 1erNumero, 2doNumero, Id, TME
const misChecks = document.querySelectorAll(".misChecks"); // Para encontrar la operación asignada

// arreglo Objetos

let arrObjetos = [];

// Funciones

const encontrarOperacion = () => {
    let opr = "";

    misChecks.forEach(e => {
        if (e.checked === true) {
            opr = e.value;
        }
    });

    return opr;
}

function numeroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const verfId = () => {

    let boolean = true;

    if (arrObjetos.length > 0) {
        arrObjetos.forEach(e => {
            if (misDatos[3].value === e.id) {
                alert('El ID ya existe, ingresa otro');
                boolean = false;
            }
        });
    }

    return boolean;
}

const crearObjInfo = () => {
    
    let miId = verfId();

    if (miId) {

        return {
            nombre: misDatos[0].value,
            numA: misDatos[1].value,
            numB: misDatos[2].value,
            opr: encontrarOperacion(),
            tiempo: misDatos[4].value,
            id: misDatos[3].value
        }

    } else { return false; }
};

const guardarObj = () => {
    // Obtenemos el objeto literal
    let objLit = crearObjInfo();

    if (objLit === false) {
        return false;
    }

    arrObjetos.push(objLit);

    // Actualizamos la información del proceso actual en el span

    const numProcesosInt = parseInt(numProcesos.value);

    if (arrObjetos.length < numProcesosInt) {
        procesoSpan.textContent = `${arrObjetos.length} de ${numProcesosInt}`;
    } else {

        // Mostramos la información en la tabla y la ejecutamos
        contProcesosPedidos.style.display = "none";
        formularioProcesos.style.display = "none";
        tablaRes.classList.toggle("disableCont");

        ejecutarLotes();
    }
}

function crearLotesSeparados(arreglo, elementosPorLote = 4) {
    const lotes = {};
    let numeroLote = 1;

    for (let i = 0; i < arreglo.length; i += elementosPorLote) {
        const nombreLote = `lote${numeroLote}`;
        lotes[nombreLote] = arreglo.slice(i, i + elementosPorLote);
        numeroLote++;
    }

    return lotes;
}

async function imprimirCiclicamente(objetos, intervalosMs, loteActNum, cantLot) {

    for (let i = 0; i < objetos.length; i++) {
        const objeto = objetos[i];
        const intervalo = intervalosMs[i] || intervalosMs[0];

        // Mostrar el objeto actual
        datEjecucion[0].textContent = objeto.nombre;
        datEjecucion[1].textContent = `${objeto.numA} ${objeto.opr} ${objeto.numB}`;
        datEjecucion[2].textContent = objeto.id;
        
        // Acomodo de tiempos
        tiempoProc[0].textContent = "TME: "+objeto.tiempo;
        
        // Iniciar cronómetros
        let tiempoTranscurrido = 0;
        let tiempoRestante = intervalo;
        const incremento = 100; // Actualizar cada 100ms
        
        // Mostrar tiempos iniciales
        tiempoProc[1].textContent = "TT: 0.0"; // Tiempo transcurrido
        tiempoProc[2].textContent = "TR"+(intervalo / 1000).toFixed(1); // Tiempo restante
        
        
        // Cambio del objeto a resultados y eliminado de la primera tabla

        let liRe = document.getElementById(`${objeto.nombre}+${objeto.id}`);
        liNombres.removeChild(liRe);

        // Crear intervalo para los cronómetros
        const intervaloId = setInterval(() => {
            tiempoTranscurrido += incremento;
            tiempoRestante = Math.max(0, intervalo - tiempoTranscurrido);
            
            // Actualizar 
            tiempoProc[1].textContent = "TT: "+(tiempoTranscurrido / 1000).toFixed(1);
            tiempoProc[2].textContent = "TR: "+(tiempoRestante / 1000).toFixed(1);
            
            // Cambiar color cuando este por terminar 
            if (tiempoRestante < 2000) {
                tiempoProc[2].style.color = "red";
            } else {
                tiempoProc[2].style.color = "black";
            }
            
        }, incremento);
        
        // Esperar el intervalo
        await new Promise(resolve => setTimeout(resolve, intervalo));
        
        // Detener los cronómetros
        clearInterval(intervaloId);
        
        // valores finales del cronometro
        tiempoProc[1].textContent = "TT: "+(intervalo / 1000).toFixed(1);
        tiempoProc[2].textContent = "TR: 0.0";
        tiempoProc[2].style.color = "black";
        
        // pausa entre objetos
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Reiniciar contadores para el próximo objeto
        tiempoProc[1].textContent = "TT: 0.0";
        tiempoProc[2].textContent = "TR: 0.0";


        // Creacion de tr para resultados

        let tr = document.createElement("tr");

        for (let i = 0; i < 4; i++) {
            let td = document.createElement("td");
            td.classList.add("resTablaFin");
            tr.appendChild(td);
        }
       
        let resTablaFin = document.querySelectorAll(".resTablaFin");

        resTablaFin[0].textContent = objeto.id;
        resTablaFin[1].textContent = `${objeto.numA} ${objeto.opr} ${objeto.numB}`;
        resTablaFin[2].textContent = calcularRes(objeto.opr,objeto.numA,objeto.numB);
        resTablaFin[3].textContent = cantLot;

        resTablaFin.forEach(e => {
            e.classList.remove("resTablaFin");
        });

        resultadosFinalesTr.appendChild(tr);
        lotPen.textContent = loteActNum;
    }
    
    // Proceso completado
    tiempoProc[2].textContent = "Completado";
}

const cronometroGlobal = async () => {
    const conGlobal = document.getElementById("conGlobal");
    
    // Calcular el intervalo 
    let intervaloTotal = 0;
    arrObjetos.forEach(e => {
        intervaloTotal += e.tiempo * 1000; 
    });

    // Iniciar cronómetro
    let tiempoTranscurrido = 0;
    const incremento = 100; // Actualizar cada 100ms

    // Crear intervalo para el cronómetro
    const intervaloId = setInterval(() => {
        tiempoTranscurrido += incremento;
        
        // Actualizar 
        conGlobal.textContent = "Contador: " + (tiempoTranscurrido / 1000).toFixed(1);
        
    }, incremento);
    
    // Esperar
    await new Promise(resolve => setTimeout(resolve, intervaloTotal));

    // Detener el cronómetro
    clearInterval(intervaloId);
    
    // valor final exacto
    conGlobal.textContent = "Contador: " + (intervaloTotal / 1000).toFixed(1);
}

const calcularRes = (opr,a,b) => {

    let A = parseInt(a);
    let B = parseInt(b);

    if (opr === '+') {
        return (A+B).toFixed(2);
    } else if (opr === '-') {
        return (A-B).toFixed(2);
    } else if (opr === 'x') {
        return (A*B).toFixed(2);
    } else if (opr === '/') {
        return (A/B).toFixed(2);
    } else if (opr === '^') {
        return (Math.pow(A, B)).toFixed(2);
    } else if (opr === '%') {
        return (A%B).toFixed(2);
    } 

}

const ejecutarLotes = () => {
    // Traer lotes
    const lotes = crearLotesSeparados(arrObjetos);
    const cantidadLotes = Object.keys(lotes).length;
    lotPen.textContent = cantidadLotes;

    // Función para procesar un lote
    const procesarLote = (nombreLote, lote, loteAct, cantLot) => {
        let tiempos = [];

        // Limpiar tabla de nombres antes de agregar nuevos
        liNombres.innerHTML = '';

        // Inicializamos la tabla de nombres para este lote
        lote.forEach(e => {
            let liInf = document.createElement("li");
            liInf.textContent = e.nombre;
            liInf.id = `${e.nombre}+${e.id}`;
            liNombres.appendChild(liInf);
            lotPen.textContent = loteAct;

            tiempos.push(e.tiempo * 1000);
        });
        
        // Ejecutar el lote actual
        return imprimirCiclicamente(lote, tiempos, loteAct, cantLot);
    };

    // Procesar todos los lotes secuencialmente
    const procesarTodosLotes = async () => {
        for (let i = 1; i <= cantidadLotes; i++) {
            const nombreLote = `lote${i}`;
            if (lotes[nombreLote] && lotes[nombreLote].length > 0) {
                await procesarLote(nombreLote, lotes[nombreLote], cantidadLotes-i,i);
                
                // Esperar entre lotes si es necesario
                if (i < cantidadLotes) {
                    await new Promise(resolve => setTimeout(resolve, 700));
                }
            }
        }
        
    };

    // Iniciar el procesamiento
    cronometroGlobal();
    procesarTodosLotes();
};

const verfCero = () => {
    // Asegurarse de que los elementos existen
    if (misDatos.length < 4) {
        alert("Faltan campos en el formulario");
        return false;
    }
    
    let num = parseFloat(misDatos[2].value); // Convertir a número
    let miOp = encontrarOperacion();
    
    // Verificar si el segundo número es 0 y la operación es problemática
    if ((miOp === '/' || miOp === '%') && num === 0) {
        alert(miOp === '/' ? 
            "No puedes dividir entre 0" : 
            "En residuo el 2do número no puede ser 0");
        return false;
    }
    
    return true;
}

const verfTme = () => {
    let num = parseFloat(miTME.value); // Convertir a número
   
     // Validar que sea mayor a 0
    if (num <= 0) {
        alert("El TME debe ser mayor a 0");
        return false;
    } 
    
    return true;
}

// Eventos

const miIdProc = document.getElementById("miIdProc");
const mi2doNum = document.getElementById("mi2doNum");
const miCheckDividir = document.getElementById("match_4");
const miCheckResiduo = document.getElementById("match_5");
const miTME = document.getElementById("miTME");

miIdProc.addEventListener("blur", () => {
    verfId();
});

mi2doNum.addEventListener("blur", () => {
    verfCero();
});

miCheckDividir.addEventListener("click", () => {
    verfCero();
});

miCheckResiduo.addEventListener("click", () => {
    verfCero();
});

formOriginal.addEventListener("submit", e => {
    e.preventDefault();
});

btnIniciar.addEventListener("click", () => {

    if (numProcesos.value > 0) {

        numeroLotes.classList.toggle("disableCont");
        contProcesosPedidos.classList.toggle("disableCont");
        formularioProcesos.classList.toggle("disableCont");

        setInterval(() => {
            numeroLotes.style.display = "none";
            procesoSpan.textContent = `${arrObjetos.length + 1} de ${numProcesos.value}`;
            document.body.style.overflowY = "visible";
            document.body.style.overflowX = "visible";
        }, 200);

    } else {
        alert("Ingresa un numero mayor a 0");
    }

});

btnEnviarForm.addEventListener("click", () => {

    if (misDatos[0].value.length < 1) {
        alert("Ingresa un nombre...");
    } else if (verfCero()) {
        let op =  verfTme();
        if (op) {
            guardarObj();   
        }
    }

});


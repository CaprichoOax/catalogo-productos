/* =========================================================================
   PARTE 1: CONFIGURACIÓN, ESTADO DE LA APLICACIÓN Y CONSUMO DE API (SHEETDB)
   ========================================================================= */

// 1. Configuración de la API
// IMPORTANTE: Aquí vas a pegar la URL que te dé SheetDB cuando conectes tu Excel.
const SHEETDB_URL = 'https://sheetdb.io/api/v1/nmr4tdvxiylms'; 

// 2. Variables de Estado (La memoria de nuestra página)
let catalogoProductos = []; // Guardará todos los productos que descargue de Sheets
let carrito = {}; // Guardará lo que el cliente vaya agregando. Ej: { 'PROD-001': { nombre: 'Tasajo', cantidad: 2, precio: 470 } }

// 3. Inicialización: ¿Qué pasa cuando la página termina de cargar?
document.addEventListener('DOMContentLoaded', () => {
    // Al abrir la página, mandamos a llamar a los productos inmediatamente
    cargarProductosDesdeSheets();
});

// 4. Función para descargar los productos usando SheetDB
async function cargarProductosDesdeSheets() {
    const contenedor = document.getElementById('contenedor-productos');
    
    // Mientras carga, le mostramos un mensaje amigable
    contenedor.innerHTML = '<p style="text-align:center; color:white; font-size: 1.2rem;">Cargando menú delicioso desde Oaxaca... ⏳</p>';

    try {
        // Hacemos la llamada a SheetDB
        const respuesta = await fetch(SHEETDB_URL);
        
        if (!respuesta.ok) {
            throw new Error('Error al conectar con la base de datos de Google Sheets');
        }
        
        // Convertimos la respuesta a formato JSON (lista de productos)
        const datos = await respuesta.json();
        catalogoProductos = datos;
        
        // Una vez que tenemos los datos, los dibujamos en pantalla
        renderizarMenu(catalogoProductos);

    } catch (error) {
        console.error('Error de conexión:', error);
        // Si el internet falla o SheetDB tiene un error, mostramos un respaldo
        contenedor.innerHTML = '<p style="text-align:center; color:#F4D03F; font-size: 1.2rem;">Hubo un problema al cargar el menú. Por favor, recarga la página o contáctanos directo al WhatsApp.</p>';
    }
}

// 5. Función para dibujar los productos dinámicamente en el HTML
function renderizarMenu(productos) {
    const contenedor = document.getElementById('contenedor-productos');
    contenedor.innerHTML = ''; // Limpiamos el mensaje de "Cargando..."

    // Agrupamos los productos por su "Categoría" (Carnes, Quesos, Pan, etc.)
    const productosPorCategoria = {};
    
    productos.forEach(prod => {
        // Ignoramos productos que no tengan nombre o que tengan Stock en 0
        if(!prod.Nombre || prod.Stock_Disponible == "0") return; 

        if (!productosPorCategoria[prod.Categoría]) {
            productosPorCategoria[prod.Categoría] = [];
        }
        productosPorCategoria[prod.Categoría].push(prod);
    });

    // Empezamos a crear los bloques visuales por cada categoría
    for (const categoria in productosPorCategoria) {
        
        // 5.1 Crear contenedor de la categoría
        const bloqueCategoria = document.createElement('div');
        bloqueCategoria.className = 'categoria-bloque';
        
        // 5.2 Crear el título de la categoría
        const tituloCategoria = document.createElement('h3');
        tituloCategoria.className = 'categoria-titulo';
        tituloCategoria.textContent = categoria;
        bloqueCategoria.appendChild(tituloCategoria);

        // 5.3 Crear las tarjetas de cada producto dentro de esa categoría
        productosPorCategoria[categoria].forEach(prod => {
            
            // Asegurarnos de que el precio se vea con dos decimales (ej. 280.00)
            const precioFormateado = parseFloat(prod.Precio_Venta).toFixed(2);
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'producto-item';
            itemDiv.setAttribute('data-id', prod.ID_Producto);
            
            // Inyectamos el HTML del producto junto con sus botones de sumar/restar
            // Nota: La función 'modificarCarrito' la construiremos en la Parte 2
            itemDiv.innerHTML = `
                <div class="producto-info">
                    <h4 class="producto-nombre">${prod.Nombre}</h4>
                    <p class="producto-precio">$${precioFormateado}</p>
                </div>
                <div class="producto-controles">
                    <button class="btn-restar" onclick="modificarCarrito('${prod.ID_Producto}', '${prod.Nombre}', ${prod.Precio_Venta}, -1)">-</button>
                    <span class="cantidad-actual" id="cant-${prod.ID_Producto}">0</span>
                    <button class="btn-sumar" onclick="modificarCarrito('${prod.ID_Producto}', '${prod.Nombre}', ${prod.Precio_Venta}, 1)">+</button>
                </div>
            `;
            bloqueCategoria.appendChild(itemDiv);
        });

        // 5.4 Añadir todo el bloque al contenedor principal del HTML
        contenedor.appendChild(bloqueCategoria);
    }
}

/* --- FIN DE LA PARTE 1 --- */
/* =========================================================================
   PARTE 2: LÓGICA DEL CARRITO DE COMPRAS Y MATEMÁTICAS EN TIEMPO REAL
   ========================================================================= */

// 1. Función principal que se activa al dar clic en los botones [+] o [-]
function modificarCarrito(idProducto, nombre, precio, cambio) {
    // Si el producto no existe en el carrito, lo inicializamos en cero
    if (!carrito[idProducto]) {
        carrito[idProducto] = {
            nombre: nombre,
            precio: parseFloat(precio),
            cantidad: 0
        };
    }

    // Sumamos o restamos la cantidad solicitada (+1 o -1)
    carrito[idProducto].cantidad += cambio;

    // Validación de seguridad: No podemos tener cantidades negativas
    if (carrito[idProducto].cantidad <= 0) {
        carrito[idProducto].cantidad = 0;
        // Lo borramos del registro del carrito para mantener la memoria limpia
        delete carrito[idProducto]; 
    }

    // Actualizamos visualmente el numerito que está entre los botones [+] y [-] de ese producto
    const spanCantidad = document.getElementById(`cant-${idProducto}`);
    if (spanCantidad) {
        // Si el producto existe en el carrito mostramos su cantidad, si lo borramos mostramos 0
        spanCantidad.textContent = carrito[idProducto] ? carrito[idProducto].cantidad : 0;
    }

    // Después de cada movimiento, llamamos al contador para recalcular el dinero
    actualizarTotales();
}

// 2. Función para recalcular todo el dinero y los contadores visuales
function actualizarTotales() {
    let granTotal = 0;
    let totalArticulos = 0;

    // Recorremos matemáticamente todo lo que hay en el objeto "carrito"
    for (const id in carrito) {
        const item = carrito[id];
        granTotal += (item.precio * item.cantidad);
        totalArticulos += item.cantidad;
    }

    // Actualizamos el pequeño contador que está arriba en el Header (junto al botón "Mi Pedido")
    const contadorHeader = document.getElementById('contador-carrito');
    if (contadorHeader) {
        contadorHeader.textContent = totalArticulos;
    }

    // Actualizamos el número grande de la barra flotante de abajo (con formato de 2 decimales)
    const textoTotalFlotante = document.getElementById('monto-total');
    if (textoTotalFlotante) {
        textoTotalFlotante.textContent = `$${granTotal.toFixed(2)}`;
    }

    // Toque de Experiencia de Usuario (UX):
    // Si el carrito está vacío, atenuamos el botón de pagar para que no le den clic por error
    const btnFinalizar = document.getElementById('btn-finalizar-pedido');
    if (btnFinalizar) {
        if (granTotal > 0) {
            btnFinalizar.style.opacity = '1';
            btnFinalizar.style.pointerEvents = 'auto'; // Activamos el botón
        } else {
            btnFinalizar.style.opacity = '0.5';
            btnFinalizar.style.pointerEvents = 'none'; // Desactivamos el botón
        }
    }
}

// Para asegurar que el botón empiece desactivado al cargar la página por primera vez
document.addEventListener('DOMContentLoaded', () => {
    actualizarTotales();
});

/* --- FIN DE LA PARTE 2 --- */
/* =========================================================================
   PARTE 3.1: CONTROL DE LA VENTANA MODAL (DATOS DE ENTREGA)
   ========================================================================= */

// 1. Referencias a los elementos de la ventana en el HTML
const modalCheckout = document.getElementById('modal-checkout');
const btnAbrirModal = document.getElementById('btn-finalizar-pedido');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

// 2. Función para abrir la ventana donde se piden los datos
if (btnAbrirModal) {
    btnAbrirModal.addEventListener('click', () => {
        // Verificamos matemáticamente que el carrito no esté vacío
        if (Object.keys(carrito).length > 0) {
            // Mostramos el formulario
            modalCheckout.classList.remove('modal-oculto');
            modalCheckout.classList.add('modal-activo');
        } else {
            alert('Tu pedido está vacío. ¡Agrega unos ricos productos oaxaqueños primero!');
        }
    });
}

// 3. Función para cerrar la ventana (al darle clic a la X roja)
if (btnCerrarModal) {
    btnCerrarModal.addEventListener('click', () => {
        modalCheckout.classList.remove('modal-activo');
        modalCheckout.classList.add('modal-oculto');
    });
}

// 4. Cerrar la ventana por comodidad si el usuario da clic afuera del cuadro blanco
window.addEventListener('click', (evento) => {
    if (evento.target === modalCheckout) {
        modalCheckout.classList.remove('modal-activo');
        modalCheckout.classList.add('modal-oculto');
    }
});

/* --- FIN DE LA PARTE 3.1 --- */
/* =========================================================================
   PARTE 3.2 A: RECOPILACIÓN DE DATOS DEL FORMULARIO Y RESUMEN DEL PEDIDO
   ========================================================================= */

const formularioPedido = document.getElementById('formulario-pedido');

if (formularioPedido) {
    formularioPedido.addEventListener('submit', (evento) => {
        // Evitamos que la página se recargue al dar clic en enviar
        evento.preventDefault();

        // 1. Cambiamos el texto del botón para que el cliente sepa que estamos procesando
        const btnWhatsapp = document.getElementById('btn-enviar-whatsapp');
        const textoOriginalBoton = btnWhatsapp.innerHTML;
        btnWhatsapp.innerHTML = 'Procesando pedido... ⏳';
        btnWhatsapp.disabled = true; // Desactivamos el botón temporalmente para evitar dobles clics

        // 2. Recopilamos los datos que escribió el cliente en las casillas
        const nombreCliente = document.getElementById('nombre-cliente').value.trim();
        const telefonoCliente = document.getElementById('telefono-cliente').value.trim();
        const direccionCliente = document.getElementById('direccion-cliente').value.trim();

        // 3. Armamos el resumen del carrito para que se lea bonito en el Excel y en WhatsApp
        let detalleProductosTexto = '';
        let totalCobrado = 0;

        for (const id in carrito) {
            const item = carrito[id];
            // Formato: "2x Tasajo ($470.00 c/u)"
            detalleProductosTexto += `${item.cantidad}x ${item.nombre} ($${item.precio.toFixed(2)} c/u)\n`;
            totalCobrado += (item.precio * item.cantidad);
        }

        // Generamos un ID de pedido único basado en la fecha y hora para tu control
        const idPedido = 'PED-' + Date.now().toString().slice(-6);

        // 4. Mandamos todos estos datos a la función final que conectará con SheetDB y WhatsApp
        enviarPedidoFinal(idPedido, nombreCliente, telefonoCliente, direccionCliente, detalleProductosTexto, totalCobrado, btnWhatsapp, textoOriginalBoton);
    });
}

/* --- FIN DE LA PARTE 3.2 A --- */
/* =========================================================================
   PARTE 3.2 B.1: ENVÍO DE DATOS A GOOGLE SHEETS (SHEETDB)
   ========================================================================= */

async function enviarPedidoFinal(idPedido, nombreCliente, telefonoCliente, direccionCliente, detalleProductosTexto, totalCobrado, btnWhatsapp, textoOriginalBoton) {
    
    // 1. Obtenemos la fecha actual para el registro
    const fechaHoy = new Date().toLocaleDateString('es-MX');

    // 2. Empaquetamos los datos exactamente como nombramos las columnas en tu Excel
    // Nota: SheetDB pide que los datos vayan dentro de un arreglo llamado "data"
    const paqueteDatos = {
        data: [{
            "ID_Pedido": idPedido,
            "Fecha_Entrega": fechaHoy, // Después podremos hacer que elijan los días de ruta
            "Cliente": nombreCliente,
            "WhatsApp": telefonoCliente,
            "Dirección_Entrega": direccionCliente,
            "Detalle_Productos": detalleProductosTexto,
            "Total_Cobrado": totalCobrado,
            "Estatus_Entrega": "Pendiente"
        }]
    };

    try {
        // 3. Enviamos la petición POST a SheetDB
        // Agregamos '?sheet=Registro_Pedidos' para asegurar que escriba en la pestaña correcta
        const respuesta = await fetch(SHEETDB_URL + '?sheet=Registro_Pedidos', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paqueteDatos)
        });

        if (!respuesta.ok) {
            throw new Error('Falló la conexión al guardar en Excel.');
        }

        // 4. Si SheetDB nos confirma que ya guardó todo con éxito, 
        // pasamos el control a la función de WhatsApp (que crearemos en la Parte 3.2 B.2)
        abrirWhatsApp(idPedido, nombreCliente, direccionCliente, detalleProductosTexto, totalCobrado, btnWhatsapp, textoOriginalBoton);

    } catch (error) {
        console.error('Error de base de datos:', error);
        alert('Hubo un pequeño problema al conectar con el servidor. Por favor, intenta de nuevo.');
        
        // Si hay error, regresamos el botón a la normalidad para que puedan volver a intentar
        btnWhatsapp.innerHTML = textoOriginalBoton;
        btnWhatsapp.disabled = false;
    }
}

/* --- FIN DE LA PARTE 3.2 B.1 --- */
/* =========================================================================
   PARTE 3.2 B.2: FORMATO DE WHATSAPP, ENVÍO Y LIMPIEZA DEL CARRITO
   ========================================================================= */

function abrirWhatsApp(idPedido, nombreCliente, direccionCliente, detalleProductosTexto, totalCobrado, btnWhatsapp, textoOriginalBoton) {
    
    // 1. El número de teléfono oficial de Capricho Oaxaqueño (con código de país 52 para México)
    const numeroWhatsApp = "524426692241";

    // 2. Armamos el mensaje con emojis y una estructura muy clara para que sea fácil de leer en tu celular
    let mensaje = `👋 ¡Hola, Capricho Oaxaqueño!\n\n`;
    mensaje += `Quiero confirmar mi pedido por favor:\n`;
    mensaje += `*ID de Pedido:* ${idPedido}\n\n`;
    
    mensaje += `*🛍️ Mi Lista de Productos:*\n`;
    mensaje += `${detalleProductosTexto}\n`;
    
    mensaje += `*💰 Total a pagar:* $${totalCobrado.toFixed(2)}\n\n`;
    
    mensaje += `*📍 Mis Datos de Entrega:*\n`;
    mensaje += `Nombre: ${nombreCliente}\n`;
    mensaje += `Dirección: ${direccionCliente}\n\n`;
    
    mensaje += `¡Muchas gracias! Quedo en espera de su confirmación.`;

    // 3. Convertimos el texto para que los espacios y saltos de línea funcionen en la URL de internet
    const textoCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${textoCodificado}`;

    // 4. Abrimos WhatsApp de forma automática en una nueva pestaña (o en la app móvil)
    window.open(urlWhatsApp, '_blank');

    // 5. ¡Misión cumplida! Ahora limpiamos el cotizador para dejarlo como nuevo
    
    // Vaciamos la memoria del carrito
    carrito = {}; 
    
    // Actualizamos la barra flotante y el contador superior a ceros
    actualizarTotales();
    
    // Regresamos a "0" los numeritos de cada tarjeta de producto en la pantalla
    const cantidadesEnPantalla = document.querySelectorAll('.cantidad-actual');
    cantidadesEnPantalla.forEach(span => {
        span.textContent = '0';
    });

    // Limpiamos las casillas donde el cliente escribió su nombre y dirección
    document.getElementById('formulario-pedido').reset();

    // Ocultamos la ventana modal
    const modalCheckout = document.getElementById('modal-checkout');
    modalCheckout.classList.remove('modal-activo');
    modalCheckout.classList.add('modal-oculto');

    // Restauramos el botón verde a la normalidad por si quieren hacer otro pedido
    btnWhatsapp.innerHTML = textoOriginalBoton;
    btnWhatsapp.disabled = false;
    
    // Lanzamos un mensajito de éxito discreto en la pantalla
    alert('¡Tu pedido se está enviando por WhatsApp! 🎉 Gracias por tu preferencia.');
}

/* --- FIN DEL ARCHIVO SCRIPT.JS --- */

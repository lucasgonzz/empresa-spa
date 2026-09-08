/**
 * Guiones de la sección S2 — VENDER.
 *
 * Siete tours: armar una venta (2.1), facturarla (2.2), cobrarla con descuento o recargo por
 * método de pago (2.3), venderle a cuenta corriente (2.4), la cuenta corriente del cliente (2.5),
 * presupuestos (2.8) y el agente de WhatsApp (2.10).
 *
 * El formato de cada paso lo define `src/tours/motor.js`:
 *
 * - `ancla` — el valor del `data-tour`. Es la forma preferida y casi la única que se usa acá: los
 *   veintiocho anclajes de esta sección están puestos en el código. La excepción es el buscador de
 *   artículos de Vender, que se ancla por su `id` de siempre (ver `BUSCADOR_ARTICULOS`).
 * - `texto` — lo que lee el lead. Corto, imperativo y en la misma voz que el video del clip.
 * - `avanza` — `'siguiente'` (el botón del popover), `'clic'` (clic real sobre lo resaltado),
 *   `'aparece'` (cuando aparece el elemento del paso que sigue) o `'desaparece'` (cuando se va el
 *   del paso actual, que es lo que pasa al elegir adentro de un modal que se cierra solo).
 *   medidos contra el código, no elegidos de arriba; están en `.mision/mapa-S2-vender.md`.
 * - `antes` — nombre de un gancho de `src/tours/ganchos.js`.
 * - `ruta` — a dónde tiene que estar parado el tour para ese paso.
 *
 * 🔴 **La regla que más caro sale en esta sección: todo paso que apunte a algo de la etapa 1 de
 * Vender lleva su gancho `abrir_etapa_1_*`.** La etapa se colapsa sola en cuanto la venta tiene
 * ítems, cliente o está en edición (`vender/components/stage-1/Index.vue:127-144`), y ahí adentro
 * viven el cliente, el método de pago, el punto de venta de ARCA, la lista de precios y los dos
 * interruptores. Sin el gancho el elemento existe pero mide 0×0 y el lead ve un recuadro vacío.
 *
 * 🔴 **Tres anclas de Vender no dicen lo que su nombre sugiere, y ningún texto de acá promete lo
 * que prometen los nombres:**
 * - `vender.boton_cobrar` NO cobra: es el `+` verde que abre el reparto en varios métodos de pago.
 * - `vender.modal_cobro` es ese modal de reparto ("Múltiples metodos de pago"), no un cobro con
 *   facturación: ni la factura ni el descuento por método viven adentro.
 * - `vender.boton_confirmar_venta` es el botón "Listo" de ese modal: cierra el reparto, no genera
 *   la venta. La venta la cierra `vender.boton_guardar_venta`.
 *
 * ⚠️ Desde el 31/8/2026 las dos últimas **no las usa ningún paso**: el 2.3 dejó de meter al lead
 * adentro del reparto (ver el comentario de ese clip). Quedan documentadas igual, porque son la
 * trampa en la que cae cualquiera que agregue un paso mirando solo el nombre del ancla.
 *
 * ⚠️ No hay ramas por configuración en ningún guion, a propósito: el motor **saltea solo** los
 * pasos cuyo elemento no aparece (`motor.js`, `enganchar_paso`). Un tour escrito completo funciona
 * igual con la extensión apagada, sin un `if` en el medio.
 */

/* Vender arranca siempre en la sub-vista `remito` (`router/routes.js:35-40`). */
const RUTA_VENDER = { name: 'vender', params: { view: 'remito' } }

/* La cuenta corriente NO es una vista: es el modal `current-acounts`, y se llega desde el listado
 * de clientes (`router/routes.js:229-237`). */
const RUTA_CLIENTES = { name: 'client', params: { view: 'clientes' } }

/* El listado de presupuestos cuelga de Vender en el menú, pero es su propia ruta. */
const RUTA_PRESUPUESTOS = { name: 'budget' }

/* La bandeja de WhatsApp. La conversación NO se dibuja acá: vive en el sidebar (ver clip 2.10). */
const RUTA_WHATSAPP = { name: 'whatsapp' }

/**
 * La primera fila de la tabla de presupuestos.
 *
 * `Tr.vue` le pone a cada fila `data-testid="<modelo>-row-<id>"` y `buscar_visible()` del motor se
 * queda con la primera que se pueda señalar. Reemplaza al anclaje de la TABLA ENTERA, que dibujaba
 * un recuadro del tamaño de la pantalla cuando el paso decía "abrí uno" — el defecto que Lucas
 * reportó el 31/8/2026 sobre el clip 1.4 y que estaba repetido en varios tours.
 */
const PRIMERA_FILA_PRESUPUESTO = '[data-testid^="budget-row-"]'

/**
 * El input del buscador de artículos por nombre de Vender.
 *
 * 🔴 No se usa el ancla `vender.buscador_articulos` para el paso que dice "tocá acá", y el motivo es
 * de tamaño: esa ancla está puesta sobre `<header-form>`
 * (`components/vender/components/stage-2/Index.vue:25`), o sea sobre la **fila entera** —código de
 * barras, nombre, combos, promociones, servicios y cantidad—. Un recuadro de ese ancho no señala
 * nada, y encima **contiene** al campo de código de barras, que es justo el del paso anterior: el
 * lead vería dos pasos seguidos señalando la misma zona.
 *
 * El `id` sale de `components/common/buscador-articulos/Index.vue:13` (`id="search-article"`), que
 * `common-vue/components/search/Index.vue:67` baja al `<input :id="_id">`. Ya existe, es estable y
 * no obliga a tocar `common-vue`.
 */
const BUSCADOR_ARTICULOS = '#search-article'

/**
 * Espera larga para los pasos cuyo elemento depende de que el lead haga algo que lleva su tiempo:
 * abrir un presupuesto del listado, esperar la respuesta de la IA. El techo por defecto del motor
 * son 12 s y en esos casos se queda corto.
 */
const TECHO_LARGO = 25000

export default {

	/**
	 * CLIP 2.1 — Armar una venta de punta a punta.
	 *
	 * Precondición: artículos con stock y precio, uno con código de barras; sucursal y método de
	 * pago por defecto; la venta **vacía** (si no, la etapa 1 arranca colapsada y el botón de
	 * guardar todavía no existe).
	 */
	'2.1': {
		ruta: RUTA_VENDER,
		pasos: [
			{
				ancla: 'vender.contenedor',
				texto: 'Esta es la pantalla donde vas a pasar el día. Mirala entera un segundo.',
				avanza: 'siguiente',
			},
			{
				/**
				 * 🔴 Ya no dice "viene enfocado desde que entrás", y no es un retoque de estilo: era
				 * falso con el tour corriendo. `ArticleBarCode.vue:44-48` enfoca el campo con un
				 * `setTimeout(500)` al montarse la vista, pero el tour arranca después —navega,
				 * espera el elemento, deja asentar el layout— y para cuando el cartel aparece ese
				 * foco ya se lo llevó otra cosa. Lucas lo pidió textual el 1/9/2026: *"me dice,
				 * escaneá acá, viene enfocado desde que entras con el mouse. Eso quiero que deje de
				 * aparecer"*. Y lo de fondo: *"es muy poco probable que el usuario tenga un lector de
				 * código de barras"*, así que el paso ofrece las dos formas y manda al lead por la
				 * que sí puede hacer.
				 *
				 * `avanza: 'siguiente'` explícito, y era lo que ya pasaba en la práctica: declarado
				 * como `'aparece'`, el motor veía que el elemento del paso siguiente (el buscador,
				 * que es su vecino en la misma fila) ya estaba a la vista y le devolvía el botón
				 * igual —está medido en el informe del 30/8/2026—. Ahora lo que se declara es lo que
				 * pasa. Lucas: *"ahí le dé a siguiente y pase al siguiente paso"*.
				 *
				 * 700 ms: el `setTimeout(500)` de arriba mueve el foco y con él el layout; medir
				 * antes agarra la fila a mitad de camino.
				 */
				ancla: 'vender.campo_codigo_barras',
				texto: 'Si tenés lector, escaneá acá; si no, tipeá el código y dale Enter. Para este ejemplo vamos por otro lado: buscá el artículo por su nombre.',
				avanza: 'siguiente',
				espera_ms: 700,
			},
			{
				/* Ver `BUSCADOR_ARTICULOS`: se ancla el input y no la fila entera. Avanza por
				 * aparición del modal, que es lo que el clic abre. */
				selector: BUSCADOR_ARTICULOS,
				texto: 'Buscá el artículo por su nombre: tocá acá.',
				avanza: 'aparece',
			},
			{
				/**
				 * `avanza: 'desaparece'`: el gesto que cierra este paso es elegir de la grilla, y eso
				 * cierra el modal (`search/Modal.vue::emitSetSelected` → `$bvModal.hide`). Con
				 * `'clic'` el paso avanzaba con cualquier clic adentro del modal —ordenar una
				 * columna, pasar de página—, o sea antes de que el artículo estuviera elegido.
				 *
				 * ⚠️ Se sacó el gancho `esperar_modal`, y hay que dejarlo escrito para que nadie lo
				 * devuelva: ese gancho espera el evento `bv::modal::shown`, y ahora el paso ANTERIOR
				 * avanza recién cuando el modal ya está a la vista. O sea que el `shown` ya pasó
				 * cuando este paso se prepara, y el gancho se quedaría esperando un evento que no va
				 * a llegar hasta agotar su respaldo de 2,5 s. Los 700 ms de `espera_ms` cubren los
				 * tres reintentos de foco del modal (400/650/700 ms), que es lo único que hacía falta.
				 */
				ancla: 'vender.modal_buscador_articulos',
				texto: 'Escribí parte del nombre y dale Enter. Mirá la grilla antes de elegir: ahí tenés el stock y el precio de cada uno.',
				avanza: 'desaparece',
				/* `foco: true` por lo mismo que su gemelo del clip 1.1: el foco automático se limita
				 * a los pasos que avanzan por carga y este avanza por desaparición, así que hay que
				 * pedirlo explícito. Acá pesa más todavía, porque los 700 ms de espera hacen que el
				 * cartel aparezca bastante después de que el modal se enfocó solo, y driver.js se
				 * lleva el foco al botón de la viñeta en cada render. */
				foco: true,
				espera_ms: 700,
			},
			{
				/* El b-table de adentro es `v-if="items.length"`: con la venta vacía el contenedor
				 * mide un pixel y el motor lo saltea. Por eso este paso va después de agregar. */
				ancla: 'vender.lista_articulos',
				texto: 'Cambiá la cantidad en el mismo renglón. El total de arriba se acomoda solo.',
				avanza: 'siguiente',
			},
			{
				ancla: 'vender.total',
				texto: 'Y el total se actualiza acá, sin que aprietes nada.',
				avanza: 'siguiente',
			},
			{
				ancla: 'vender.barra_atajos',
				texto: 'Seis atajos de teclado, y la tecla la elegís vos.',
				avanza: 'siguiente',
			},
			{
				ancla: 'vender.boton_guardar_venta',
				texto: 'Guardá. Sin punto de venta elegido, la venta nace en negro, y está bien.',
				avanza: 'clic',
				lado: 'top',
			},
		],
	},

	/**
	 * CLIP 2.2 — Facturarla en el mismo acto.
	 *
	 * Precondición: un `afip_information` visible para la sucursal elegida, la venta ya con ítems
	 * y los certificados de homologación cargados.
	 */
	'2.2': {
		ruta: RUTA_VENDER,
		pasos: [
			{
				/* 🔴 Este paso es obligatorio y no se puede reemplazar por el gancho: con la venta
				 * ya armada la etapa 1 está colapsada, y el punto de venta vive adentro. Se le pide
				 * al lead el clic real para que vea DÓNDE se decide la factura. */
				ancla: 'vender.etapa_1',
				texto: 'Abrí la configuración inicial: la factura se decide acá arriba.',
				avanza: 'clic',
			},
			{
				ancla: 'vender.selector_punto_venta',
				texto: 'Elegí el punto de venta de ARCA. Ese campo es el que manda la venta a facturar.',
				avanza: 'clic',
				antes: 'abrir_etapa_1_punto_venta',
			},
			{
				ancla: 'vender.boton_guardar_venta',
				texto: 'Guardá una sola vez. Primero se guarda la venta, después sale el pedido a ARCA.',
				avanza: 'clic',
				lado: 'top',
			},
			{
				/* ⚠️ `#loading-afip-ticket` está SIEMPRE en el DOM, afuera de pantalla en
				 * `right: -500px`, y entra con una clase. O sea que el ancla se resuelve siempre:
				 * lo que hace que este paso caiga en el momento justo es que el anterior avanza por
				 * el clic en Guardar, nunca por aparición. */
				ancla: 'vender.tarjeta_afip',
				texto: 'Mirá: la pantalla ya se limpió. Mientras la factura viaja, arrancás la venta que sigue.',
				avanza: 'siguiente',
				lado: 'left',
			},
		],
	},

	/**
	 * CLIP 2.3 — Cobro con recargo o descuento según el método de pago.
	 *
	 * Precondición: registros en `current_acount_payment_method_discount` y la venta **sin cliente
	 * en cuenta corriente**, porque eso deshabilita el select de método de pago y el botón verde.
	 */
	'2.3': {
		ruta: RUTA_VENDER,
		pasos: [
			{
				ancla: 'vender.total',
				texto: 'Fijate el total. Es lo único que se va a mover.',
				avanza: 'siguiente',
			},
			{
				ancla: 'vender.etapa_1',
				texto: 'Abrí la configuración inicial.',
				avanza: 'clic',
			},
			{
				/* 700 ms y no 450: `focus_payment_method_select` reintenta ocho veces cada 80 ms
				 * (640 ms) y de paso convierte el select en listbox, o sea que le cambia el alto.
				 * Medir antes deja el highlight de driver.js con la altura vieja. */
				ancla: 'vender.selector_metodo_pago',
				texto: 'Elegí Efectivo. El descuento ya está en el nombre del método.',
				avanza: 'clic',
				antes: 'abrir_etapa_1_pago',
			},
			{
				ancla: 'vender.total',
				texto: 'Bajó solo. Cambiá a Tarjeta y mirá cómo sube el recargo.',
				avanza: 'siguiente',
			},
			{
				/* 🔴 UN solo paso, señalado y opcional, donde hasta el 31/8/2026 había TRES.
				 *
				 * Los tres llevaban al lead a repartir el importe entre varios métodos de pago, y
				 * eso es un desvío del clip: el 2.3 vende "no hay cuenta que hacer" —el descuento o
				 * el recargo sale solo del método elegido— y el video no muestra ni nombra el
				 * reparto en ningún momento. Tres de siete pasos poniéndolo a hacer cuentas era
				 * justo lo contrario de lo que el clip promete.
				 *
				 * Y encima se podía COLGAR: el paso del medio esperaba `vender.boton_confirmar_venta`,
				 * que con descuentos por método cargados recién existe después de apretar
				 * "Calcular" —un botón que no tiene ancla y que el tour no podía señalar—.
				 *
				 * `vender.boton_cobrar` NO cobra: es el `+` verde del append que abre ese reparto.
				 * El paso lo señala nada más, avanza con el botón del cartel y no promete un cobro. */
				ancla: 'vender.boton_cobrar',
				texto: 'Y si alguna vez te paga con dos métodos, el reparto se abre desde este más. Para lo de recién no hace falta.',
				avanza: 'siguiente',
				antes: 'abrir_etapa_1_pago',
			},
		],
	},

	/**
	 * CLIP 2.4 — Venta a cuenta corriente.
	 *
	 * Precondición: cliente con `limite_credito` NO nulo en pesos. Con `null`, que es el valor por
	 * defecto, el freno del paso 5 no aparece nunca y el motor saltea ese paso.
	 */
	'2.4': {
		ruta: RUTA_VENDER,
		pasos: [
			{
				ancla: 'vender.etapa_1',
				texto: 'El cliente se elige en la configuración inicial. Abrila.',
				avanza: 'clic',
			},
			{
				ancla: 'vender.selector_cliente',
				texto: 'Buscá al cliente por nombre, CUIT o DNI. Si es nuevo, lo creás desde acá mismo.',
				avanza: 'clic',
				antes: 'abrir_etapa_1_cliente',
			},
			{
				/* El interruptor no existe hasta que hay cliente elegido (`v-if` sobre `client`),
				 * así que este paso va SIEMPRE después del de arriba. */
				ancla: 'vender.toggle_omitir_cuenta_corriente',
				texto: '¿Esta venta puntual no va a la cuenta? La dejás afuera con este interruptor. Es por venta.',
				avanza: 'siguiente',
				antes: 'abrir_etapa_1_cliente',
			},
			{
				ancla: 'vender.boton_guardar_venta',
				texto: 'Guardá. La deuda no se carga aparte: la deuda es la venta.',
				avanza: 'clic',
				lado: 'top',
			},
			{
				/* El freno salta AL GUARDAR, no en vivo, y abre con `no-close-on-backdrop` y
				 * `no-close-on-esc`: de este modal se sale por uno de sus dos botones. El que
				 * lleva al paso siguiente es "Ir a la cuenta corriente". */
				ancla: 'vender.modal_limite_credito',
				texto: 'Si la venta se pasa del límite, el sistema no la guarda. Salí por "Ir a la cuenta corriente".',
				avanza: 'siguiente',
				antes: 'esperar_modal',
			},
			{
				ancla: 'cuentas_corrientes.modal_cuenta',
				texto: 'Y el movimiento queda acá, con su número de venta, su importe y el saldo que dejó.',
				avanza: 'siguiente',
				antes: 'esperar_modal',
			},
		],
	},

	/**
	 * CLIP 2.5 — La cuenta corriente del cliente.
	 *
	 * Precondición: el mismo cliente del 2.4, con `limite_credito` cargado y con movimientos.
	 *
	 * 🔴 El paso 1 tiene que ser un clic REAL: abrir el modal `current-acounts` a mano lo deja
	 * vacío, porque es el botón el que commitea el modelo en el store y despacha `getModels`.
	 *
	 * ⚠️ El botón se dibuja una vez por fila y el motor agarra la primera visible: la demo tiene
	 * que dejar arriba del listado al cliente que corresponde.
	 */
	'2.5': {
		ruta: RUTA_CLIENTES,
		pasos: [
			{
				ancla: 'cuentas_corrientes.boton_abrir_cuenta_cliente',
				texto: 'Abrí la cuenta corriente del cliente.',
				avanza: 'clic',
			},
			{
				/* La franja de límite solo aparece con `limite_credito !== null`; con el default en
				 * null el bloque muestra solo el saldo y el paso igual funciona. */
				ancla: 'cuentas_corrientes.saldo',
				/* Sin prometer "las tres": `SaldoYLimite.vue` dibuja el limite y el disponible solo
				 * con `limite_credito !== null`, y el default es null. Con un cliente sin limite
				 * cargado el lead ve una sola cifra, y el cartel le estaria contando otras dos. */
				texto: 'Acá está lo primero que querés saber: cuánto te debe. Si le tenés puesto un límite, al lado ves hasta cuánto le fiás y cuánto le queda.',
				avanza: 'siguiente',
				antes: 'esperar_modal',
			},
			{
				ancla: 'cuentas_corrientes.lista_movimientos',
				texto: 'Cada renglón es un movimiento con su fecha, su importe y el saldo que dejó.',
				avanza: 'siguiente',
			},
			{
				/* El botón tiene dos ramas con texto distinto según haya o no un movimiento
				 * seleccionado ("Registrar pago" / "Registrar pago para ..."), y las dos llevan la
				 * misma ancla. Por eso el texto del paso es genérico. */
				ancla: 'cuentas_corrientes.boton_registrar_pago',
				texto: 'Te pagó: registrá el cobro acá.',
				avanza: 'clic',
				lado: 'top',
			},
			{
				/* 650 ms: el modal enfoca el primer importe con un `setTimeout(500)` colgado del
				 * `bv::modal::shown`, y ese foco le mueve el alto al bloque de métodos. */
				ancla: 'cuentas_corrientes.modal_pago',
				texto: 'Cargá con qué te pagó. El monto sale solo de la suma de los métodos.',
				avanza: 'aparece',
				antes: 'esperar_modal',
				espera_ms: 650,
			},
			{
				ancla: 'cuentas_corrientes.boton_confirmar_pago',
				texto: 'Confirmá y el saldo baja solo.',
				avanza: 'clic',
			},
			{
				ancla: 'cuentas_corrientes.boton_nota_credito',
				texto: 'Si hay que corregir algo, tenés nota de crédito y de débito. No se borra nada por arriba.',
				avanza: 'siguiente',
				lado: 'top',
			},
			{
				/* Imprimir hace `window.open()`: el paso lo SEÑALA y avanza con Siguiente. Si se
				 * encadenara al clic, el tour quedaría atrás de una pestaña nueva. */
				ancla: 'cuentas_corrientes.dropdown_imprimir',
				texto: 'Y el estado de cuenta se lo mandás en PDF.',
				avanza: 'siguiente',
			},
		],
	},

	/**
	 * CLIP 2.8 — Presupuestos.
	 *
	 * Se arma en Vender y se sigue en el listado de presupuestos, así que **cada paso declara su
	 * ruta**: el motor le pone la del tour a todo paso que no traiga una propia, y con una sola
	 * ruta de tour los pasos del listado volverían a Vender.
	 *
	 * Precondición: extensión `budgets`; para el paso del mail, además la extensión
	 * `enviar_mail_a_clientes` y un cliente CON email cargado.
	 */
	'2.8': {
		ruta: RUTA_VENDER,
		pasos: [
			{
				ruta: RUTA_VENDER,
				ancla: 'vender.selector_cliente',
				texto: 'Un presupuesto se arma igual que una venta. Empezá por el cliente.',
				avanza: 'clic',
				antes: 'abrir_etapa_1_cliente',
			},
			{
				ruta: RUTA_VENDER,
				ancla: 'vender.toggle_presupuesto',
				texto: 'Prendé Guardar como presupuesto.',
				avanza: 'clic',
				antes: 'abrir_etapa_1_cliente',
			},
			{
				ruta: RUTA_VENDER,
				ancla: 'vender.checkbox_enviar_mail',
				texto: 'Tildá acá y al guardarlo le llega por mail al cliente, en el momento.',
				avanza: 'siguiente',
				antes: 'abrir_etapa_1_cliente',
			},
			{
				ruta: RUTA_VENDER,
				ancla: 'vender.buscador_articulos',
				texto: 'Cargá los artículos y las cantidades, igual que en una venta.',
				avanza: 'siguiente',
			},
			{
				/* Con el interruptor prendido, este mismo botón dice "Guardar Presupuesto". */
				ruta: RUTA_VENDER,
				ancla: 'vender.boton_guardar_venta',
				texto: 'Guardalo. El botón ya dice Guardar Presupuesto.',
				avanza: 'clic',
				lado: 'top',
			},
			{
				/* El "Abrí uno" va acá y no en el paso siguiente: el paso del modal solo se ve
				 * cuando el modal ya está abierto, así que la instrucción para abrirlo tiene que
				 * estar en el último paso visible antes. */
				ruta: RUTA_PRESUPUESTOS,
				selector: PRIMERA_FILA_PRESUPUESTO,
				texto: 'Acá están los que siguen sin confirmar. Abrí uno con un clic en la fila.',
				avanza: 'siguiente',
			},
			{
				ruta: RUTA_PRESUPUESTOS,
				ancla: 'presupuestos.modal',
				texto: 'Tocá lo que haga falta mientras el cliente decide.',
				avanza: 'siguiente',
				antes: 'esperar_modal',
				techo_ms: TECHO_LARGO,
			},
			{
				/* ⚠️ El menú de este desplegable tiene `z-index: 3060` y se dibuja ENCIMA del
				 * overlay del tour. Se ve raro pero no rompe nada: el paso solo lo señala. */
				ruta: RUTA_PRESUPUESTOS,
				/* Los tres textos son los del menú de verdad (`budget/components/ModalButtons.vue`):
				 * la tercera opción dice "Con imagenes", no "con precios y las fotos". */
				ancla: 'presupuestos.boton_imprimir',
				texto: 'El PDF lo elegís vos: "Sin precios", "Con precios" o "Con imagenes".',
				avanza: 'siguiente',
			},
			{
				/* 🔴 El ancla está puesta SOLO en la instancia del modal (`budget/ModalButtons`),
				 * no en la del listado: `BtnConfirmarAnular` se dibuja una vez por fila y con el
				 * ancla adentro del componente el tour señalaría el botón de la primera fila. */
				ruta: RUTA_PRESUPUESTOS,
				ancla: 'presupuestos.boton_confirmar',
				texto: 'Cuando te dice que sí, apretá Confirmar. Eso crea la venta con todo adentro.',
				avanza: 'clic',
			},
			{
				/* Mismo botón, ya mutado: `esta_confirmado` le da vuelta el texto y la variante.
				 * Anular abre un `confirm()` NATIVO, que driver.js no puede resaltar, así que el
				 * tour termina acá y no lo sigue. */
				ruta: RUTA_PRESUPUESTOS,
				ancla: 'presupuestos.boton_confirmar',
				texto: 'Y este mismo botón ahora dice Anular.',
				avanza: 'siguiente',
			},
		],
	},

	/**
	 * CLIP 2.10 — El agente de WhatsApp.
	 *
	 * 🔴 **Cuatro gates encadenados, y ninguno se resuelve desde acá:** extensión `whatsapp`;
	 * un `WhatsappBotConfig` creado (el `DemoSetupHelper` NO lo crea); `chat_simulation_enabled`
	 * en true (viene en false); y estar logueado como dueño. Sin los cuatro, el motor saltea los
	 * pasos de a uno y el tour queda en la bandeja.
	 *
	 * ⚠️ **La conversación no se dibuja en la vista**: vive en el sidebar que monta `App.vue`
	 * (`position: fixed`), que se crea y se destruye. Si el lead lo cierra, los pasos 7 a 11
	 * desaparecen del DOM y el motor los saltea. Escape lo cierra, y driver.js también escucha
	 * Escape para cancelar el tour: en este clip las dos cosas pelean por la misma tecla.
	 *
	 * ⚠️ Los pasos 4 y 5 señalan campos internos de un formulario, que en el resto de los tours no
	 * se hace. Es una excepción consciente: el buscador de clientes del modal no devuelve
	 * resultados en la demo, así que el teléfono se escribe a mano.
	 *
	 * ⚠️ El disparo automático de la respuesta está roto, por eso el flujo pasa por "Sugerir
	 * respuesta". Y son diez simulaciones por minuto, cada una con una llamada paga.
	 */
	'2.10': {
		ruta: RUTA_WHATSAPP,
		pasos: [
			{
				ancla: 'whatsapp.bandeja',
				texto: 'Esta es la bandeja: todos los chats de tus clientes en un solo lado.',
				avanza: 'siguiente',
			},
			{
				ancla: 'whatsapp.boton_simular',
				texto: 'Probalo sin molestar a nadie: apretá el conito para simular un mensaje.',
				avanza: 'clic',
			},
			{
				ancla: 'whatsapp.modal_simular',
				texto: 'Leé el aviso amarillo: esto no le manda nada a nadie.',
				avanza: 'siguiente',
				antes: 'esperar_modal',
			},
			{
				ancla: 'whatsapp.campo_telefono_simulado',
				texto: 'Escribí el número de uno de tus clientes, a mano.',
				avanza: 'siguiente',
			},
			{
				ancla: 'whatsapp.campo_mensaje_simulado',
				texto: 'Y escribí lo que te preguntaría.',
				avanza: 'siguiente',
			},
			{
				ancla: 'whatsapp.boton_enviar_simulacion',
				texto: 'Dale Simular mensaje. Entra como si lo hubiera escrito él.',
				avanza: 'clic',
			},
			{
				/* 300 ms: el sidebar entra con un `transform` de .22 s y toma el ancho de
				 * localStorage al montarse. */
				ancla: 'whatsapp.conversacion',
				texto: 'Se abre el chat con el mensaje, y mirá la etiqueta: dice Simulado.',
				avanza: 'siguiente',
				espera_ms: 300,
			},
			{
				ancla: 'whatsapp.boton_sugerir_respuesta',
				texto: 'Apretá Sugerir respuesta. La IA lee el chat y busca en tu catálogo.',
				avanza: 'clic',
			},
			{
				/* El campo existe siempre: el gancho es para no señalarlo VACÍO mientras la
				 * sugerencia todavía viaja. */
				ancla: 'whatsapp.campo_respuesta',
				texto: 'Te la deja escrita acá, con el producto y el precio.',
				avanza: 'siguiente',
				antes: 'esperar_proceso_largo',
			},
			{
				ancla: 'whatsapp.boton_enviar',
				texto: 'La mandás vos.',
				avanza: 'clic',
			},
			{
				ancla: 'whatsapp.toggle_ia',
				texto: 'Y entrás cuando quieras: apagás la IA en esa conversación y seguís vos.',
				avanza: 'siguiente',
			},
			{
				ancla: 'whatsapp.boton_configuracion',
				texto: 'Cómo habla y qué puede hacer se lo escribís vos acá.',
				avanza: 'siguiente',
			},
		],
	},
}

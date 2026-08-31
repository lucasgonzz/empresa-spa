/**
 * Guiones de los tours de VENTAS (clips 3.1 y 3.2) y de COMPRAS (4.1, 4.6, 4.2 y 4.3).
 *
 * El formato de un paso lo define `src/tours/motor.js`: `ancla` o `selector`, `texto`, `avanza`,
 * y los opcionales `ruta`, `antes`, `espera_ms`, `techo_ms`, `lado`, `alineacion`.
 *
 * 🔴 Dos cosas del motor que condicionan cómo está escrito todo este archivo:
 *
 * 1. **El motor saltea solo el paso cuyo elemento no aparece.** Por eso acá NO hay ramas por
 *    configuración: `ventas.boton_editar_venta` tiene cinco frenos que lo pueden esconder,
 *    `compras.boton_dif` solo existe si se cargó cantidad recibida, `ventas.grilla_alicuotas`
 *    solo si antes se escribió un importe, y los dos botones del 4.6 solo existen con la
 *    extensión `escaneo_factura_compra` prendida. Los pasos se escriben completos y el que no
 *    tenga destino se cae solo.
 *
 * 2. **`ruta` se hereda del guion pero NO se puede desheredar.** `iniciar_tour` resuelve
 *    `paso.ruta || guion.ruta || null`, o sea que un `ruta: null` en un paso vuelve a caer en la
 *    del guion. Los tours que pasan por más de una vista (3.1 y 4.2) NO declaran `ruta` a nivel
 *    guion y la ponen paso por paso: es la única forma de que un paso pueda quedarse quieto donde
 *    lo dejó la aplicación en vez de que el motor lo devuelva a la vista de arranque. Es
 *    exactamente lo que necesita el 3.1 después de "Actualizar venta" (la app navega sola, con un
 *    `setTimeout(500)` de por medio) y el 4.2 una vez que aterrizó en el Listado.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * PASOS PUENTE ANTES DE CAMBIAR DE RUTA (3.1 y 4.2)
 *
 * 🔴 El motor prepara el paso siguiente EN PARALELO con el actual (`enganchar_paso` llama a
 * `preparar_el_siguiente()` apenas se dibuja el paso), y preparar incluye `ir_a()`. O sea que un
 * paso que declara otra `ruta` **navega apenas se dibuja el paso anterior**, no cuando el lead
 * termina con él. Para que eso no le arranque la pantalla de abajo de los pies, los dos clips que
 * saltan de vista meten antes un paso puente: un "ahora te llevo a X". Es la misma convención que
 * usa `s1-listado.js`.
 *
 * ⚠️ Un paso puente avanza con `'siguiente'`, EXPLÍCITO, y no con `'aparece'`. El motor no puede
 * detectar la aparición del elemento del paso que viene, porque ese elemento vive en otra ruta y lo
 * que lo haría aparecer es justamente el avance que estaría esperando. Desde el 31/8/2026 el motor
 * lo detecta y le devuelve el botón igual, pero declararlo es lo honesto: es lo que va a hacer.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * POR QUÉ LOS MODALES VAN CON `selector` Y NO CON `ancla`
 *
 * 🔴 Un `data-tour` puesto sobre un `<b-modal>` **no le sirve al motor**. `BModal` baja los
 * atributos sueltos al div EXTERIOR del portal, que es `position: absolute` y mide 0x0 (adentro
 * solo tiene cosas `fixed`), y `buscar_visible()` descarta todo lo que mida menos de 2px de lado.
 * El `id` del `b-modal`, en cambio, cae en el `.modal` de verdad, y `.modal-content` es la tarjeta
 * blanca, que es justo lo que hay que resaltar. Por eso todo paso que señala un modal entero cuya
 * ancla vive sobre el `<b-modal>` usa `#<id> .modal-content`. Es el mismo hallazgo y la misma
 * solución que documenta `s1-listado.js`.
 *
 * Los cuatro modales de esta sección cuyo `data-tour` sí está sobre un elemento REAL de adentro
 * —`ventas.modal_facturacion`, `compras.modal_diferencias`, `compras.modal_escaneo` y
 * `compras.modal_revision_escaneo`— se siguen señalando por `ancla`, que es la forma preferida.
 */

/* Las rutas se comparten por referencia: ni `ir_a` ni vue-router mutan el objeto de destino. */

/** Ventas abre siempre en "todas / todos", que es donde arrancan los clips 3.x. */
const RUTA_VENTAS = { name: 'sale', params: { view: 'todas', sub_view: 'todos' } }

/**
 * La primera fila de la tabla de ventas, y la de compras.
 *
 * `Tr.vue` le pone a cada fila `data-testid="<modelo>-row-<id>"`, así que el prefijo alcanza para
 * agarrarla sin saber el id, y `buscar_visible()` del motor devuelve la primera que se pueda
 * señalar.
 *
 * 🔴 Reemplazan al anclaje de la TABLA ENTERA que tenían los pasos de "abrí una venta / abrí la
 * compra". El comentario que lo justificaba decía que no se podía anclar la fila porque `Tr.vue` no
 * recibe el índice del `v-for` — y es cierto que no lo recibe, pero no hace falta: el `data-testid`
 * ya está y el motor se queda con la primera visible. Mientras tanto el recuadro abarcaba la
 * pantalla entera y no señalaba nada, que es lo que Lucas reportó el 31/8/2026 sobre el mismo paso
 * del clip 1.4.
 */
const PRIMERA_FILA_VENTA = '[data-testid^="sale-row-"]'
const PRIMERA_FILA_COMPRA = '[data-testid^="provider_order-row-"]'

/**
 * 🔴 Compras NO tiene ruta propia: vive adentro de Proveedores. `router/index.js` declara una
 * sola ruta `/proveedores/:view?/:sub_view?`, y el `:view` decide si se dibuja el listado de
 * proveedores o el de compras. Los dos `v-if` son mutuamente excluyentes.
 */
const RUTA_COMPRAS = { name: 'provider', params: { view: 'compras' } }

/** El 4.3 arranca en la solapa Proveedores, no en Compras: el botón de C/C vive en esa fila. */
const RUTA_PROVEEDORES = { name: 'provider', params: { view: 'proveedores' } }

/** El Listado, adonde salta el 4.2 para mostrar el flete ya prorrateado al costo del artículo. */
const RUTA_LISTADO = { name: 'article' }

/** Por Entregar, adonde salta el último paso del 3.1. */
const RUTA_POR_ENTREGAR = { name: 'por-entregar', params: { view: 'ventas' } }

/**
 * El modal de detalle de una venta.
 *
 * Sale de `model/Index.vue` con `model_name="sale"` (`b-modal :id="model_name"`), pero NO del
 * `view-component` de `views/Ventas.vue`, que lo apaga con `:show_modal="false"`: lo monta
 * `components/common/SaleModal.vue`, que le mete `<sale-details>` en el slot del encabezado y al
 * que se llega por `current-acounts/Index.vue`. Ahí adentro vive el botón "Actualizar venta".
 */
const MODAL_VENTA = '#sale .modal-content'

/** El modal de formulario de una compra (`model/Index.vue` con `model_name="provider_order"`). */
const MODAL_COMPRA = '#provider_order .modal-content'

/** El modal de formulario de un costo extra, que abre ARRIBA del de la compra. */
const MODAL_COSTO_EXTRA = '#provider_order_extra_cost .modal-content'

/**
 * El desglose del precio (`components/common/PriceDescription.vue`).
 *
 * Va por selector y no por ancla porque ese componente es compartido con Ventas y con el Listado:
 * un `data-tour` literal ahí adentro dejaría de ser único. Su envoltorio de compras
 * (`provider/modals/orders/PriceDescription.vue`) tampoco sirve para anclarlo, porque no tiene
 * elemento propio: su raíz ES el `<b-modal>` del componente compartido. Es la misma constante que
 * usa `s1-listado.js`.
 */
const MODAL_CALCULO_PRECIO = '#final-price-description .modal-content'

/** El modal de artículo, adonde aterriza el 4.2 a ver el flete ya prorrateado. */
const MODAL_ARTICULO = '#article .modal-content'

/** La cuenta corriente y sus dos modales hijos, todos compartidos con la cuenta de un cliente. */
const MODAL_CUENTA_CORRIENTE = '#current-acounts .modal-content'
const MODAL_PAGO_CUENTA = '#current-acounts-pago .modal-content'
const MODAL_NOTA_CREDITO = '#current-acounts-nota-credito .modal-content'

/**
 * Techo largo para el 4.6: el escaneo de la factura corre en el servidor y tarda alrededor de 30
 * segundos. Con el techo por defecto (12 s) el paso se daría por perdido antes de tiempo.
 *
 * ⚠️ Además está medido que el evento de Pusher NO llega: el botón rojo "Revisar escaneo" no se
 * enciende solo con la pantalla abierta, sale de `provider_order_scan/pendientes`, que se le pide
 * al servidor. El lead se tiene que ir y volver. El techo largo le da margen a esa vuelta.
 */
const TECHO_ESCANEO = 90000

export default {

	/* ================================================================================
	 * CLIP 3.1 — Ver y gestionar las ventas hechas
	 *
	 * Sin `ruta` de guion a propósito: el paso 8 no declara ninguna, para que el tour se quede
	 * donde lo dejó "Actualizar venta" en vez de volver a /ventas.
	 * ================================================================================ */
	'3.1': {
		pasos: [
			{
				ruta: RUTA_VENTAS,
				ancla: 'ventas.contenedor',
				texto: 'Este es el módulo de Ventas. Abre parado en el día de hoy, sin que le pidas nada.',
				avanza: 'siguiente',
			},
			{
				/* Está bajo `can('sale.index.total')`: sin ese permiso el motor lo saltea. */
				ruta: RUTA_VENTAS,
				ancla: 'ventas.totales',
				texto: 'Acá arriba, cuánta plata entró hoy.',
				avanza: 'siguiente',
			},
			{
				ruta: RUTA_VENTAS,
				ancla: 'ventas.control_fecha',
				texto: 'Movés la fecha desde acá y traés otro día, o toda una semana.',
				avanza: 'siguiente',
			},
			{
				ruta: RUTA_VENTAS,
				ancla: 'ventas.tabla',
				texto: 'Acá está cada venta. Filtrá por la columna que quieras: cliente, número, importe.',
				avanza: 'siguiente',
			},
			{
				/* Se señala la primera fila y se avanza cuando aparece el modal: así el paso
				 * sobrevive a listas vacías, paginado, `order_list_by` y filtros, y el lead ve qué
				 * tiene que tocar. */
				ruta: RUTA_VENTAS,
				selector: PRIMERA_FILA_VENTA,
				texto: 'Abrí una venta tuya: un clic en la fila.',
				avanza: 'aparece',
			},
			{
				ruta: RUTA_VENTAS,
				selector: MODAL_VENTA,
				antes: 'esperar_modal',
				texto: 'Ahí está todo: los artículos, cómo se cobró, si se facturó y con qué comprobante.',
				avanza: 'siguiente',
			},
			{
				/* 🔴 `can_edit_sale` son cinco frenos (facturada con CAE, cerrada, movió caja,
				 * cobrada con varios métodos, comercio con cajas). Si la venta que abrió el lead no
				 * los pasa, el botón no existe y el motor saltea este paso y el que sigue. */
				ruta: RUTA_VENTAS,
				ancla: 'ventas.boton_editar_venta',
				texto: 'Apretá "Actualizar venta": la venta se abre en la pantalla de vender y le seguís cargando.',
				avanza: 'clic',
			},
			{
				/* Sin `ruta`: acá navega la aplicación, no el tour. `setPreviusSale` deja la venta en
				 * el store y recién después empuja a Vender, con un `setTimeout(500)` de por medio.
				 * Si el tour empujara la ruta por su cuenta, Vender montaría antes de que la venta
				 * esté cargada y el lead vería una venta nueva y vacía. */
				ancla: 'vender.contenedor',
				techo_ms: 15000,
				texto: 'Es la misma venta, no una nueva. Agregale un artículo y guardá.',
				avanza: 'siguiente',
			},
			{
				/* Paso puente: el paso siguiente cambia de ruta y el motor navega apenas se dibuja
				 * ESTE cartel. Anunciarlo es lo que hace que el salto se lea como parte del tour. */
				ancla: 'vender.contenedor',
				texto: 'Ahora te llevo a "Por entregar", que es la otra mitad de esto.',
				avanza: 'siguiente',
			},
			{
				/* "Por entregar" desaparece del menú sin la extensión `ventas_con_fecha_de_entrega`.
				 * No se hace rama: el contenedor no aparece y el motor saltea el paso. */
				ruta: RUTA_POR_ENTREGAR,
				ancla: 'ventas.por_entregar_contenedor',
				texto: 'Si vendés hoy y entregás mañana, eso tiene su propia pantalla.',
				avanza: 'siguiente',
			},
		],
	},

	/* ================================================================================
	 * CLIP 3.2 — Facturar una venta que ya estaba cargada
	 *
	 * ⚠️ La emisión pega contra ARCA de verdad y no es reversible. El último paso SEÑALA el botón
	 * y lo deja en `clic`: aprieta el lead, no el tour.
	 * ================================================================================ */
	'3.2': {
		ruta: RUTA_VENTAS,
		pasos: [
			{
				ancla: 'ventas.control_fecha',
				texto: 'Elegí el día en la tira de fechas.',
				avanza: 'siguiente',
			},
			{
				ancla: 'ventas.tabla',
				texto: 'Ahí tenés todo lo de ese día: el total de cada venta y lo que se facturó de cada una.',
				avanza: 'siguiente',
			},
			{
				ancla: 'ventas.boton_seleccion',
				texto: 'Prendé el modo selección.',
				avanza: 'clic',
			},
			{
				/* Avanza por aparición y no por clic: el lead marca la fila con el check, pero
				 * cualquier otro clic en la tabla (ordenar, filtrar una columna) no tiene por qué
				 * hacer avanzar el tour. */
				ancla: 'ventas.tabla',
				texto: 'Marcá la venta que querés facturar.',
				avanza: 'aparece',
			},
			{
				ancla: 'ventas.dropdown_seleccion',
				texto: 'Abrí las acciones de la selección.',
				avanza: 'clic',
			},
			{
				ancla: 'ventas.boton_facturar',
				texto: 'Mandala a facturar.',
				avanza: 'clic',
			},
			{
				ancla: 'ventas.modal_facturacion',
				antes: 'esperar_modal',
				texto: 'Esta es la pantalla de emisión: todo lo que ARCA necesita, en un solo lugar.',
				avanza: 'siguiente',
			},
			{
				/* El select queda `:disabled` cuando el punto de venta ya viene precargado: este
				 * paso es explicativo, no una acción. */
				ancla: 'ventas.selector_punto_de_venta',
				texto: 'Elegí el punto de venta.',
				avanza: 'siguiente',
			},
			{
				ancla: 'ventas.selector_tipo_comprobante',
				texto: 'Y el tipo de comprobante.',
				avanza: 'siguiente',
			},
			{
				/* 🔴 Todo el bloque de importe está bajo `bloque_importe_visible`: exige UNA sola
				 * venta seleccionada y tipo de comprobante distinto de 8 (exportación). Con dos
				 * ventas marcadas, este paso y el que sigue no tienen destino y se saltean. */
				ancla: 'ventas.campo_importe_a_facturar',
				texto: 'Podés facturar solo una parte: escribí un importe menor al total.',
				avanza: 'siguiente',
			},
			{
				/* 🔴 `mostrar_alicuotas` recién es true cuando YA hay un importe personalizado
				 * escrito. Si el lead no tipeó nada en el paso anterior, este se saltea solo. */
				ancla: 'ventas.grilla_alicuotas',
				texto: 'Y si querés repartir ese importe entre alícuotas, lo repartís acá. Si no tocás nada, va todo al veintiuno.',
				avanza: 'siguiente',
			},
			{
				/* Desaparece si se eligió exportación (tipo 8). */
				ancla: 'ventas.campo_fecha_comprobante',
				texto: 'La fecha se puede mover cinco días para atrás o para adelante. Ese es el margen de ARCA.',
				avanza: 'siguiente',
			},
			{
				/* 🔴 Último paso, y a propósito: la emisión pega contra ARCA de verdad y en la demo
				 * no se puede deshacer. El tour señala el botón y lo aprieta el lead. Además el
				 * botón está `:disabled` mientras el reparto de alícuotas no cierre al centavo. */
				ancla: 'ventas.boton_emitir_factura',
				texto: 'Emitila cuando estés seguro: la factura sale contra ARCA de verdad y no se puede deshacer. El sistema vuelve con el número y el CAE.',
				avanza: 'clic',
			},
		],
	},

	/* ================================================================================
	 * CLIP 4.1 — Cargar una compra: impacta stock y costo
	 * ================================================================================ */
	'4.1': {
		ruta: RUTA_COMPRAS,
		pasos: [
			{
				ancla: 'compras.solapa_compras',
				texto: 'Arriba, la solapa Compras.',
				avanza: 'clic',
			},
			{
				ancla: 'compras.contenedor',
				texto: 'Acá está todo lo que le comprás a cada proveedor.',
				avanza: 'siguiente',
			},
			{
				ancla: 'compras.control_fecha',
				texto: 'Abre parado en el día de hoy. Apretá "Historico" para ver todo.',
				avanza: 'clic',
			},
			{
				/* El listado usa `order_list_by="provider_order_status"`: las filas van agrupadas con
				 * títulos intercalados. Cualquier anclaje de fila por índice se rompe acá, así que
				 * se señala la tabla entera. */
				ancla: 'compras.tabla',
				texto: 'Ahí tenés todas tus compras.',
				avanza: 'siguiente',
			},
			{
				ancla: 'compras.boton_crear',
				texto: 'Creá una compra nueva.',
				avanza: 'clic',
			},
			{
				selector: MODAL_COMPRA,
				antes: 'esperar_modal',
				texto: 'Este es el formulario. Se llena por solapas.',
				avanza: 'siguiente',
			},
			{
				ancla: 'compras.campo_proveedor',
				texto: 'Lo primero, el proveedor: escribí, dale enter y elegilo de la lista.',
				avanza: 'aparece',
			},
			{
				/* Anclaje gratis: `horizontal-nav` ya emite `data-testid="nav-item-<grupo>"` para
				 * cada solapa del formulario. No hace falta tocar `common-vue` para esto. */
				selector: '[data-testid="nav-item-Articulos"]',
				texto: 'Pasá a Artículos.',
				avanza: 'clic',
			},
			{
				ancla: 'compras.buscador_articulos',
				texto: 'Cada artículo se busca igual, con su cantidad y su costo.',
				avanza: 'siguiente',
			},
			{
				ancla: 'compras.tabla_articulos',
				texto: 'Acá está la columna que vale oro: Cant Recibida. Cargá lo que realmente llegó.',
				avanza: 'siguiente',
			},
			{
				ancla: 'compras.boton_guardar',
				texto: 'Guardá.',
				avanza: 'clic',
			},
			{
				/* 🔴 `has_received`: si el lead no cargó Cant Recibida en el paso anterior, este
				 * botón NO se dibuja. El motor saltea este paso y el que sigue. */
				ancla: 'compras.boton_dif',
				texto: 'Desde el listado, este botón te muestra el desvío renglón por renglón.',
				avanza: 'clic',
			},
			{
				ancla: 'compras.modal_diferencias',
				antes: 'esperar_modal',
				texto: 'Qué llegó completo, qué a medias, qué no llegó y qué vino de más.',
				avanza: 'siguiente',
			},
			{
				selector: PRIMERA_FILA_COMPRA,
				texto: 'Volvé a abrir la compra con un clic en su fila.',
				avanza: 'aparece',
			},
			{
				/* Anclaje gratis: `ModelForm` le pone `id="form-group-<key>"` a cada campo de cada
				 * formulario del sistema. Los tres interruptores viven en la solapa "Configuracion",
				 * que es la que abre por defecto. */
				selector: '#form-group-update_prices',
				antes: 'esperar_modal',
				texto: 'Este actualiza los costos y los precios de esos artículos.',
				avanza: 'siguiente',
			},
			{
				selector: '#form-group-update_stock',
				texto: 'Este genera los movimientos de stock. Los dos vienen apagados a propósito.',
				avanza: 'clic',
			},
			{
				selector: '#form-group-generate_current_acount',
				texto: 'Mirá el tercero, que viene prendido: la cuenta corriente del proveedor.',
				avanza: 'siguiente',
			},
			{
				/* 🔴 Sin este guardado el tilde de `update_stock` que el lead acaba de prender NO
				 * queda: vive en el formulario y se pierde apenas se cierra el modal. Y encima el
				 * desglose del total que se mira cinco pasos más abajo lo escribe el BACKEND al
				 * guardar, así que sin este paso el "?" muestra la cuenta vieja, sin los costos ni
				 * el stock que el lead acaba de pedir. */
				ancla: 'compras.boton_guardar',
				texto: 'Guardá, que es lo que deja aplicado ese interruptor. Ojo: los movimientos de stock se generan de verdad.',
				avanza: 'clic',
			},
			{
				/* "Guardar y cerrar" CIERRA el modal (`prop_to_send_on_emit="{close: true}"`), así
				 * que la compra hay que volver a abrirla para seguir. Es la misma convención que
				 * usa el 4.2 después de su guardado. */
				selector: PRIMERA_FILA_COMPRA,
				texto: 'El guardado cerró la compra. Volvé a abrirla con un clic en su fila.',
				avanza: 'aparece',
			},
			{
				selector: '[data-testid="nav-item-Facturacion"]',
				texto: 'Y la factura llega cuando llega. Entrá a Facturación.',
				avanza: 'clic',
			},
			{
				selector: '#form-group-modo_facturacion',
				texto: 'Tres formas: sin factura, automática o manual. El sistema no adivina cuál es tu caso.',
				avanza: 'siguiente',
			},
			{
				selector: '[data-testid="nav-item-Total"]',
				texto: 'Entrá a Total.',
				avanza: 'clic',
			},
			{
				/* 🔴 El "?" del total solo existe sobre una compra GUARDADA: `Total.vue` es
				 * `v-if="provider_order"` y el desglose lo escribe el backend al guardar. Por eso
				 * este paso va después de la reapertura, no antes. */
				ancla: 'compras.boton_explicar_total',
				texto: 'Apretá el signo de pregunta del total.',
				avanza: 'clic',
			},
			{
				selector: MODAL_CALCULO_PRECIO,
				antes: 'esperar_modal',
				texto: 'Ahí está la cuenta, línea por línea. No es una caja negra.',
				avanza: 'siguiente',
			},
		],
	},

	/* ================================================================================
	 * CLIP 4.6 — Escanear la factura del proveedor
	 *
	 * 🔴🔴 Este tour SOLO corre con la extensión `escaneo_factura_compra` prendida en la cuenta de
	 * la demo. Viene apagada, y sin ella `BtnScanInvoice.vue` no renderiza NINGUNO de los dos
	 * botones: no se deshabilitan ni se esconden con CSS, no existen. El tour se cae en el paso 2.
	 * El estado ON/OFF no vive en el repo (`hasExtencion` lee `owner_extencions`, que llega del
	 * servidor), así que no hay nada que se pueda hacer desde acá.
	 * ================================================================================ */
	'4.6': {
		ruta: RUTA_COMPRAS,
		pasos: [
			{
				ancla: 'compras.contenedor',
				texto: 'Esta es una compra recién creada, todavía vacía.',
				avanza: 'siguiente',
			},
			{
				ancla: 'compras.boton_escanear',
				texto: 'Desde la compra, Escanear.',
				avanza: 'clic',
			},
			{
				ancla: 'compras.modal_escaneo',
				antes: 'esperar_modal',
				texto: 'Sacás la foto con la cámara del teléfono, como cualquier foto.',
				avanza: 'siguiente',
			},
			{
				/* ⚠️ Se ancla "Tomar foto" y NO "Elegir archivos": el HEIC del iPhone se rechaza a
				 * propósito y Safari solo lo convierte por el camino de la cámara.
				 * Este botón abre el diálogo NATIVO de archivos y driver.js pierde el foco ahí, así
				 * que el paso avanza por aparición en vez de por clic. */
				ancla: 'compras.boton_tomar_foto',
				texto: 'Sacale la foto. Si la factura tiene tres hojas, sacá las tres: las lee juntas.',
				avanza: 'aparece',
			},
			{
				ancla: 'compras.boton_enviar_escaneo',
				texto: 'Mandalo. El escaneo corre en el servidor, no en tu computadora.',
				avanza: 'clic',
			},
			{
				ancla: 'compras.tabla',
				antes: 'esperar_proceso_largo',
				texto: 'Seguí trabajando. Cuando volvés, la factura leída te está esperando en la compra.',
				avanza: 'aparece',
			},
			{
				/* 🔴 El botón rojo tiene `v-if="escaneo_pendiente"`, que sale del SERVIDOR
				 * (`provider_order_scan/pendientes`), y el evento de Pusher no llega: no se enciende
				 * solo con la pantalla abierta. El lead se tiene que ir y volver. El techo largo le
				 * da margen a esa vuelta y al escaneo, que tarda alrededor de 30 segundos. */
				ancla: 'compras.boton_revisar_escaneo',
				antes: 'esperar_proceso_largo',
				techo_ms: TECHO_ESCANEO,
				texto: 'Ahí está, con la cantidad de artículos que encontró. Abrilo.',
				avanza: 'clic',
			},
			{
				ancla: 'compras.modal_revision_escaneo',
				antes: 'esperar_modal',
				texto: 'Y esto es lo que te devuelve.',
				avanza: 'siguiente',
			},
			{
				ancla: 'compras.chips_columnas_detectadas',
				texto: 'Qué entendió de la factura: qué columna era el código, cuál la cantidad, cuál el costo. Con su porcentaje de seguridad.',
				avanza: 'siguiente',
			},
			{
				ancla: 'compras.tabla_escaneo',
				texto: 'Y abajo, la tabla ya cargada. Cada renglón, con el artículo de tu catálogo al que corresponde.',
				avanza: 'siguiente',
			},
			{
				/* Solo existe si la IA no matcheó todo. Si matcheó todo, el motor lo saltea. */
				ancla: 'compras.aviso_descartes',
				texto: 'A lo que no encontró en tu catálogo no lo crea. Vos decidís si es nuevo o si es uno que ya tenés.',
				avanza: 'siguiente',
			},
			{
				/* Último paso. La segunda confirmación es un `msgBoxConfirm` de bootstrap-vue, sin
				 * markup propio del repo: no se le puede poner `data-tour` y queda fuera del tour. */
				ancla: 'compras.boton_confirmar_escaneo',
				texto: 'Cuando la tabla dice lo que dice el papel, confirmá.',
				avanza: 'clic',
			},
		],
	},

	/* ================================================================================
	 * CLIP 4.2 — Flete y gastos prorrateados al costo real
	 *
	 * Sin `ruta` de guion: los cuatro últimos pasos aterrizan en el Listado y tienen que quedarse
	 * ahí. Con una ruta de guion, cada uno volvería a empujar a /proveedores/compras.
	 *
	 * 🔴 Precondición del clip: la compra guardada con `update_prices` en Sí. Si está apagado NO se
	 * prorratea nada y el último paso mostraría costo real = costo base, contradiciendo lo que dice
	 * el video.
	 * ================================================================================ */
	'4.2': {
		pasos: [
			{
				ruta: RUTA_COMPRAS,
				ancla: 'compras.tabla',
				texto: 'Volvé a la compra y abrila.',
				avanza: 'aparece',
			},
			{
				ruta: RUTA_COMPRAS,
				selector: '[data-testid="nav-item-Descuentos y recargos"]',
				antes: 'esperar_modal',
				texto: 'Entrá a Descuentos y recargos.',
				avanza: 'clic',
			},
			{
				/* 🔴 Esta solapa tiene DOS `has_many` —los descuentos y los costos extra—, o sea dos
				 * botones "Agregar". El ancla en `HasMany.vue` discrimina por `prop.key` y no por
				 * modelo, justamente para no resolver contra el de descuentos. */
				ruta: RUTA_COMPRAS,
				ancla: 'compras.boton_agregar_costo_extra',
				texto: 'Acá está el botón de costos extra. Agregá uno.',
				avanza: 'clic',
			},
			{
				ruta: RUTA_COMPRAS,
				selector: MODAL_COSTO_EXTRA,
				antes: 'esperar_modal',
				texto: 'Un nombre y un importe. Nada más.',
				avanza: 'siguiente',
			},
			{
				/* Anclaje gratis por el `id` que arma `ModelForm`. En este punto del tour el único
				 * campo `tipo` visible es el del costo extra: la compra que quedó abajo no tiene
				 * ninguna propiedad con esa clave. */
				ruta: RUTA_COMPRAS,
				selector: '#form-group-tipo',
				texto: 'El tipo ya viene en Transporte, que es el caso de casi todos. Transporte se reparte entre los artículos; "Otro" solamente suma al total.',
				avanza: 'siguiente',
			},
			{
				/* 🔴 Son DOS "Guardar y cerrar" seguidos y salen del MISMO `<btn-loader>` de
				 * `model/Index.vue`. Por eso `provider_order_extra_cost` y `provider_order` tienen
				 * anclas DISTINTAS en `anclas-por-modelo.js`: con un solo valor, el paso que espera
				 * el guardado de la compra podría resolverse contra el botón del modal hijo, que
				 * todavía está en el DOM. */
				ruta: RUTA_COMPRAS,
				ancla: 'compras.boton_guardar_costo_extra',
				texto: 'Guardá el costo extra.',
				avanza: 'clic',
			},
			{
				ruta: RUTA_COMPRAS,
				ancla: 'compras.boton_guardar',
				texto: 'Y ahora guardá la compra. Este es el guardado que reparte el flete entre los artículos.',
				avanza: 'clic',
			},
			{
				/* Paso que el mapa no tenía y que el flujo necesita: "Guardar y cerrar" CIERRA el
				 * modal (`prop_to_send_on_emit="{close: true}"`), y `compras.total_final` vive
				 * adentro, en la solapa Total. Sin volver a abrir la compra, el paso siguiente no
				 * tiene destino y el motor lo saltea, que es justo el número que el clip quiere
				 * mostrar. */
				ruta: RUTA_COMPRAS,
				ancla: 'compras.tabla',
				texto: 'El guardado cerró la compra. Volvé a abrirla y andá a la solapa Total.',
				avanza: 'aparece',
			},
			{
				ruta: RUTA_COMPRAS,
				/* 🔴 Sin números. Los que había acá hasta el 31/8/2026 ("trece mil", "ciento
				 * cuarenta y tres") eran los de la compra sembrada para FILMAR el clip: el lead
				 * está mirando su propia compra, con su propio costo extra, y el sistema le iba a
				 * desmentir al acompañante justo en el paso que le pide confianza en la cuenta. */
				ancla: 'compras.total_final',
				texto: 'Mirá el total: el costo extra que cargaste ya está sumado acá, y el total final subió por esa misma plata.',
				avanza: 'siguiente',
			},
			{
				/* Paso puente antes del salto al Listado. Ver el comentario del encabezado: el
				 * motor navega apenas se dibuja este cartel, así que el cartel lo anuncia. */
				ruta: RUTA_COMPRAS,
				ancla: 'compras.total_final',
				texto: 'Ahora te llevo al Listado, a ver qué le pasó al costo del artículo.',
				avanza: 'siguiente',
			},
			{
				ruta: RUTA_LISTADO,
				ancla: 'listado.contenedor',
				texto: 'Y ahora mirá el artículo.',
				avanza: 'siguiente',
			},
			{
				/* Sin `ruta` de acá en adelante: ya estamos en el Listado y no hay que remontarlo. */
				ancla: 'listado.tabla',
				texto: 'Abrí la pinza.',
				avanza: 'aparece',
			},
			{
				selector: MODAL_ARTICULO,
				antes: 'esperar_modal',
				texto: 'Acá figura el flete como recargo de su costo, con el tipo puesto: transporte.',
				avanza: 'siguiente',
			},
			{
				/* Mismo criterio que el paso del total final: se dice QUÉ mirar y por qué, nunca
				 * cuánto. El número lo pone la compra del lead. */
				ancla: 'listado.campo_costo_real',
				texto: 'Compará los dos costos: el real quedó arriba del base, y esa diferencia es la parte del flete que le tocó a este artículo. El precio de venta se calcula sobre el costo real, no sobre el de la factura.',
				avanza: 'siguiente',
			},
		],
	},

	/* ================================================================================
	 * CLIP 4.3 — La cuenta corriente del proveedor
	 *
	 * 🔴 Todo el clip corre sobre componentes 100% compartidos entre clientes y proveedores:
	 * `common/current-acounts/Index.vue` lo montan doce vistas, incluida `views/Ventas.vue`. Por
	 * eso las anclas viven en la sección `cuentas_corrientes` con nombres NEUTROS (sirven para la
	 * cuenta de un cliente y para la de un proveedor) y no en `compras.*`. La discriminación por
	 * `from_model_name` es estado del store, no una prop, así que no se puede hacer por template.
	 * El único paso que discrimina por prop es el primero, que es el que abre la cuenta.
	 * ================================================================================ */
	'4.3': {
		ruta: RUTA_PROVEEDORES,
		pasos: [
			{
				/* ⚠️ Arranca en la solapa PROVEEDORES, no en Compras: el botón de cuenta corriente
				 * vive en la fila del proveedor. */
				ancla: 'cuentas_corrientes.boton_abrir_cuenta_proveedor',
				texto: 'Abrí la cuenta corriente del proveedor.',
				avanza: 'clic',
			},
			{
				selector: MODAL_CUENTA_CORRIENTE,
				antes: 'esperar_modal',
				texto: 'Del otro lado del mostrador pasa lo mismo que con tus clientes, pero al revés: vos sos el que debe.',
				avanza: 'siguiente',
			},
			{
				ancla: 'cuentas_corrientes.saldo',
				texto: 'Ojo con el signo: en un proveedor, saldo positivo significa que vos le debés.',
				avanza: 'siguiente',
			},
			{
				/* Esta tabla no es la genérica: usa `TableComponent.vue`, por eso el ancla es propia
				 * y no sale de `anclas-por-modelo.js`. */
				ancla: 'cuentas_corrientes.lista_movimientos',
				texto: 'Y esta cuenta se llena sola: cada compra que cargás deja acá su renglón.',
				avanza: 'siguiente',
			},
			{
				ancla: 'cuentas_corrientes.boton_registrar_pago',
				texto: 'Le pagás desde acá.',
				avanza: 'clic',
			},
			{
				/* El modal de pago escribe en el DOM con un `setTimeout(500)` propio: se le da un
				 * respiro más largo que el de un modal común después del `shown`. */
				selector: MODAL_PAGO_CUENTA,
				antes: 'esperar_modal',
				espera_modal_ms: 650,
				texto: 'Elegís con qué le pagás y de qué caja sale. Si querés, le dejás el número de orden de compra como referencia.',
				avanza: 'siguiente',
			},
			{
				/* 🔴 Hasta el 31/8/2026 este paso no existía y el tour NUNCA confirmaba el pago:
				 * dejaba el modal abierto y el paso siguiente hablaba de un renglón nuevo sobre una
				 * lista que el modal estaba tapando. Es el mismo botón que usa el 2.5.
				 *
				 * Es un `btn-loader` (`current-acounts/pago/Index.vue:85`), o sea un `<button>` sin
				 * campos adentro: el motor lo resuelve como clic y no como carga de dato. */
				ancla: 'cuentas_corrientes.boton_confirmar_pago',
				texto: 'Registrá el pago. Se asienta de verdad: descarga la deuda y mueve la caja que elegiste.',
				avanza: 'clic',
			},
			{
				ancla: 'cuentas_corrientes.lista_movimientos',
				texto: 'Y ahí lo tenés: el renglón nuevo, con el saldo ya actualizado.',
				avanza: 'siguiente',
			},
			{
				ancla: 'cuentas_corrientes.boton_nota_credito',
				texto: 'Si el proveedor te reconoce algo, lo asentás con una nota de crédito.',
				avanza: 'clic',
			},
			{
				selector: MODAL_NOTA_CREDITO,
				antes: 'esperar_modal',
				texto: 'Dos campos: monto y descripción. Acá no marcás qué unidades devolviste, como sí hacés con tus clientes.',
				avanza: 'siguiente',
			},
			{
				/* ⚠️ Último paso, y termina con el desplegable ABIERTO: no se aprieta ninguna de las
				 * dos opciones porque el PDF abre en otra pestaña y el tour se quedaría atrás. */
				ancla: 'cuentas_corrientes.dropdown_imprimir',
				texto: 'Y cuando quieras conciliar, bajás el estado de cuenta: resumen o con desglose.',
				avanza: 'clic',
			},
		],
	},
}

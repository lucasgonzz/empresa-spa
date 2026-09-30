/*
	Vistas previas de los campos de Vender en el editor de diseños (mision diseno-vender-configurable,
	28/9/2026).

	Cada tarjeta del editor muestra, debajo del nombre del campo, un dibujo del control tal como se ve
	en Vender: un grupo con su etiqueta a la izquierda y un select, un buscador con lupa, un toggle,
	un textarea, el panel de descuentos... Es lo que hace que un comerciante reconozca el campo de un
	vistazo sin tener que leer el nombre, y es la mitad de lo que hace "amigable" al editor.

	🔴 Son DIBUJOS, no controles: VistaPreviaDeElemento.vue los arma con <div> y <span>, nunca con
	<input> ni <select>. Un control real adentro de una tarjeta arrastrable se come el mousedown (el
	usuario quiere arrastrar la tarjeta y termina escribiendo en el input) y ademas entra en el orden
	de tabulacion del modal. Los textos imitan los de los componentes reales de Vender (el prepend
	"Mét. pago" de PaymentMethod.vue, el placeholder del buscador de clientes de SelectClient.vue, etc.).

	Este archivo es del editor, NO del contrato: si Vender agrega un campo nuevo y nadie le escribe
	una vista previa aca, el editor le dibuja la generica (una barra con el nombre) y sigue andando.

	Tipos de vista previa:

	- select      grupo con prepend y un select falso. `append`: 'mas' (boton de varios metodos de
	              pago) o 'info' (ayuda de la sucursal).
	- fecha       igual que select, con el icono de calendario en vez de la flecha.
	- input       campo de texto con placeholder; `prepend` e `icono` opcionales.
	- buscador    buscador redondeado con lupa (o el icono que se indique).
	- toggle      interruptor tipo iPhone con su texto. `encendido` para dibujarlo prendido.
	- checkbox    casilla con su texto.
	- textarea    etiqueta arriba y un area de texto de un renglon.
	- panel       tarjeta con titulo, subtitulo y dos filas (descuentos, recargos, puntos, nota de
	              credito). `acento`: 'descuento' | 'recargo' | null.
	- resumen     la barra de contexto de la etapa 2: total, cliente y metodo de pago.
	- separador   la linea horizontal.
	- generico    lo que se usa para una key sin vista previa propia.
*/

/* Vista previa de cada key del catalogo (src/components/vender/layout/elementos.js). */
export const VISTAS_PREVIAS = {

	/* ---------------------------------------------------------------- Etapa 1 */

	facturacion: { tipo: 'select', prepend: 'Factura', valor: 'No facturar' },
	metodo_de_pago: { tipo: 'select', prepend: 'Mét. pago', valor: 'Efectivo', append: 'mas' },
	caja: { tipo: 'select', prepend: 'Caja', valor: 'Caja principal' },
	sucursal: { tipo: 'select', prepend: 'Sucursal', valor: 'Casa central', append: 'info' },
	lista_de_precios: { tipo: 'select', prepend: 'Lista de precios', valor: 'Minorista' },
	moneda: { tipo: 'select', prepend: 'Moneda', valor: 'Pesos' },
	tipo_de_venta: { tipo: 'select', prepend: 'Tipo venta', valor: 'Mostrador' },
	vendedor: { tipo: 'select', prepend: 'Vendedor', valor: 'Sin vendedor' },
	fecha_de_venta: { tipo: 'fecha', prepend: 'Fecha', valor: 'Hoy' },
	cliente: { tipo: 'buscador', placeholder: 'Buscar cliente, CUIT o DNI', icono: 'bi-person' },
	guardar_como_presupuesto: { tipo: 'toggle', texto: 'Guardar como presupuesto' },
	omitir_en_cuenta_corriente: { tipo: 'toggle', texto: 'Omitir en cuenta corriente' },
	alerta_de_cobro: { tipo: 'input', prepend: 'Alerta cobro', placeholder: 'Días' },
	enviar_correo: { tipo: 'checkbox', texto: 'Enviar correo al cliente' },

	/* ---------------------------------------------------------------- Etapa 2 */

	resumen: { tipo: 'resumen' },
	codigo_de_barras: { tipo: 'input', placeholder: 'Código de barras', icono: 'bi-upc-scan' },
	buscador_de_articulos: { tipo: 'buscador', placeholder: 'Buscar artículo', icono: 'bi-search' },
	combos: { tipo: 'buscador', placeholder: 'Combos', icono: 'bi-search' },
	promociones: { tipo: 'buscador', placeholder: 'Promoción', icono: 'bi-search' },
	servicio: { tipo: 'input', placeholder: 'Servicio' },
	cantidad: { tipo: 'input', placeholder: 'Cantidad' },

	/* ---------------------------------------------------------------- Etapa 3 */

	estado: { tipo: 'select', prepend: 'Estado', valor: 'Sin estado' },
	fecha_de_entrega: { tipo: 'fecha', prepend: 'Fecha de entrega', valor: 'dd/mm/aaaa' },
	orden_de_compra: { tipo: 'input', prepend: 'N° Orden compra', placeholder: '' },
	empleado: { tipo: 'select', prepend: 'Empleado', valor: 'Vos' },
	precios_con_iva: { tipo: 'toggle', texto: 'Precios con IVA', encendido: true },
	descontar_stock: { tipo: 'toggle', texto: 'Descontar stock', encendido: true },
	observaciones: { tipo: 'textarea', etiqueta: 'Observaciones', placeholder: 'Notas visibles en el comprobante' },
	observaciones_ocultas: { tipo: 'textarea', etiqueta: 'Observaciones ocultas', placeholder: 'Solo uso interno, no se imprimen' },
	descuentos: { tipo: 'panel', titulo: 'Descuentos', subtitulo: 'Seleccionar descuentos a aplicar', acento: 'descuento' },
	recargos: { tipo: 'panel', titulo: 'Recargos', subtitulo: 'Seleccionar recargos a aplicar', acento: 'recargo' },
	puntos: { tipo: 'panel', titulo: 'Puntos del cliente', subtitulo: 'Canjear puntos en esta venta', acento: null },
	nota_de_credito: { tipo: 'panel', titulo: 'Nota de crédito', subtitulo: 'Por los artículos que el cliente devuelve', acento: null },

	/* ---------------------------------------------------------------- Separador */

	separador: { tipo: 'separador' },
}

/* Lo que se dibuja para una key que todavia no tiene vista previa propia. */
const VISTA_PREVIA_GENERICA = { tipo: 'generico' }

/**
 * La vista previa de una key, o la generica si no tiene una propia.
 *
 * @param {string} key
 * @returns {Object}
 */
export function vista_previa(key) {
	if (Object.prototype.hasOwnProperty.call(VISTAS_PREVIAS, key)) {
		return VISTAS_PREVIAS[key]
	}
	return VISTA_PREVIA_GENERICA
}

/*
	Catalogo de los elementos que se pueden ubicar en el modulo Vender (mision
	diseno-vender-configurable, 28/9/2026).

	Cada campo que el vendedor usa en las tres etapas de Vender es un ELEMENTO de este catalogo. Un
	"Diseño de Vender" (modelo `vender_layout`) dice en que etapa va cada elemento, en que orden y de
	cuantas columnas (1 a 12, grilla de Bootstrap). El diseño lo arma el usuario en ABM -> Ventas ->
	Diseños de Vender y Vender lo dibuja con `layout/GrillaDeEtapa.vue`.

	Este archivo es CONTRATO entre el runtime de Vender y el editor del ABM: son solo metadatos, sin
	componentes (las fabricas de los componentes viven en `layout/componentes.js`, que es del runtime).

	-------------------------------------------------------------------------------------------------
	🔴 LAS KEYS SE PERSISTEN EN LA BASE DE CADA CLIENTE. UNA KEY NO SE RENOMBRA NUNCA.
	-------------------------------------------------------------------------------------------------

	El JSON de `vender_layouts.layout` guarda estas keys tal cual. Renombrar una es romper en silencio
	todos los diseños que la nombran: el resolver la trata como desconocida, la descarta, y el elemento
	"nuevo" (con el nombre nuevo) aparece en su lugar por defecto, perdiendo la ubicacion y el ancho que
	el usuario habia elegido. Si un elemento se retira, se saca de este catalogo y listo: el resolver
	ignora las keys que no conoce.

	Y un elemento NUEVO que se agregue a Vender en el futuro no necesita migrar los diseños guardados:
	el resolver lo inserta solo en su etapa por defecto, al lado de su predecesor (ver
	resolver_diseno.js). Por eso el ORDEN de este array importa: es el orden del diseño predeterminado
	dentro de cada etapa.

	-------------------------------------------------------------------------------------------------
	Campos de cada elemento
	-------------------------------------------------------------------------------------------------

	- key                   identificador persistido (ver arriba).
	- nombre                como se lo muestra en el editor.
	- nombre_corto          en minuscula, para armar el subtitulo de la etapa ("Sucursal, caja y ...").
	- etapa                 etapa por defecto ('etapa_1' | 'etapa_2' | 'etapa_3').
	- cols                  ancho por defecto (1..12). Numero o function(vm) que devuelve un numero.
	- obligatorio           no se puede sacar del diseño: se mueve y se le cambia el ancho, nada mas
	                        (decision de Lucas, 28/9/2026: sin estos la venta no se guarda, y el resumen
	                        es el unico lugar donde se ve el total).
	- motivo_obligatorio    texto del candado en el editor.
	- entrada_de_articulos  agrega articulos a la venta. Una etapa que tiene alguno arranca abierta y
	                        la grilla los oculta cuando se llega al tope de items por venta.
	- mantiene_etapa_abierta (opcional) la etapa que lo tiene no arranca plegada ni se pliega sola,
	                        igual que con una entrada de articulos. Es el caso del resumen: es
	                        obligatorio justamente para que el total se vea siempre, y moverlo a la
	                        etapa 3 (plegada por defecto) lo escondia igual.
	- se_fuerza_si(vm)      (opcional) si devuelve true, el elemento se dibuja en Vender AUNQUE el
	                        diseño lo haya sacado, en su lugar por defecto. Es para los campos sin los
	                        que el flujo se traba segun la configuracion del USUARIO (que el diseño,
	                        que es del negocio, no conoce). Hoy solo `cantidad`.
	- motivo_forzado        texto que el editor muestra sobre ese elemento cuando esta sacado.
	- disponible(vm)        si este negocio/usuario puede ver el elemento. Copia SOLO la parte estable
	                        del v-if raiz del componente (extension, permiso, catalogo vacio). Lo
	                        transitorio (hay cliente, hay devoluciones, reparto de pagos) NO va aca: el
	                        componente se oculta solo y el editor lo explica con `aparece_cuando`.
	- aparece_cuando        texto corto para el editor cuando el elemento no se ve siempre, o null.

	`vm` es cualquier componente de la SPA: los mixins globales (hasExtencion, can, user, owner,
	ownerUsesListasDePrecio, $store) estan en todos.
*/

/* Key reservada del separador: una linea horizontal a lo ancho que se puede repetir. */
export const KEY_SEPARADOR = 'separador'

/*
	Key reservada del salto de fila: como el separador, pero invisible. Lo que viene despues arranca
	en una fila nueva aunque en la anterior quedara lugar. Se puede repetir.

	Existe para que el diseño predeterminado reproduzca la etapa 3 de antes: IVA, stock y las dos
	observaciones iban en una fila PROPIA, debajo de estado/fecha de entrega/orden de compra/empleado.
	Sin el salto, con "Estado" cargado, las observaciones quedaban partidas en dos filas.
*/
export const KEY_SALTO_DE_FILA = 'salto_de_fila'

/**
 * Si la key es un marcador (separador o salto de fila): no es un campo del catalogo, se puede
 * repetir (cada uno con su `id`) y siempre ocupa las 12 columnas.
 *
 * 🔴 Todo lo que antes preguntaba `key === KEY_SEPARADOR` para saber "esto no es un campo" tiene
 * que preguntar esto: un salto de fila tratado como campo desconocido se descarta o rompe la grilla.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function es_marcador(key) {
	return key === KEY_SEPARADOR || key === KEY_SALTO_DE_FILA
}

/* Las tres etapas de Vender, en orden. */
export const ETAPAS = ['etapa_1', 'etapa_2', 'etapa_3']

/* Titulo de cada etapa, igual al que se ve en Vender (VenderStage1/2/3). */
export const TITULOS_DE_ETAPAS = {
	etapa_1: 'Configuración inicial',
	etapa_2: 'Artículos y servicios',
	etapa_3: 'Cierre y opciones',
}

/* Textos del candado de los obligatorios. */
const MOTIVO_NO_SE_GUARDA = 'No se puede sacar: la venta no se guarda sin este campo.'
const MOTIVO_TOTAL = 'No se puede sacar: es donde se ve el total de la venta.'

/**
 * Cantidad de elementos de un catalogo del store, sin romper si el modulo todavia no existe.
 *
 * @param {Object} vm
 * @param {string} modulo nombre del modulo de Vuex (address, caja, sale_type...)
 * @returns {number}
 */
function cantidad_en_store(vm, modulo) {
	if (!vm || !vm.$store || !vm.$store.state[modulo] || !vm.$store.state[modulo].models) {
		return 0
	}
	return vm.$store.state[modulo].models.length
}

/**
 * hasExtencion tolerante a un vm sin el mixin (no deberia pasar, pero un catalogo no puede romper
 * la pantalla de venta).
 *
 * @param {Object} vm
 * @param {string} extencion
 * @returns {boolean}
 */
function tiene_extencion(vm, extencion) {
	return !!(vm && typeof vm.hasExtencion == 'function' && vm.hasExtencion(extencion))
}

/**
 * can() tolerante, mismo criterio que tiene_extencion().
 *
 * @param {Object} vm
 * @param {string} permiso
 * @returns {boolean}
 */
function tiene_permiso(vm, permiso) {
	return !!(vm && typeof vm.can == 'function' && vm.can(permiso))
}

/**
 * Hay combos o promociones de vinoteca: los dos achican el buscador y el servicio en el diseño
 * predeterminado (mismo criterio que ArticleName.vue::col_header_lg de antes de esta mision).
 *
 * @param {Object} vm
 * @returns {boolean}
 */
function hay_combos_o_promociones(vm) {
	return tiene_extencion(vm, 'combos') || tiene_extencion(vm, 'vinoteca')
}

/*
	El catalogo. El orden dentro de cada etapa es el del diseño predeterminado (ver
	diseno_predeterminado.js, que ademas intercala los separadores).
*/
export const ELEMENTOS = [

	/* ---------------------------------------------------------------- Etapa 1 */

	{
		key: 'facturacion',
		nombre: 'Facturación (punto de venta y comprobante)',
		nombre_corto: 'facturación',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: null,
	},
	{
		key: 'metodo_de_pago',
		nombre: 'Método de pago',
		nombre_corto: 'método de pago',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: true,
		motivo_obligatorio: MOTIVO_NO_SE_GUARDA,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: null,
	},
	{
		key: 'caja',
		nombre: 'Caja',
		nombre_corto: 'caja',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: true,
		motivo_obligatorio: MOTIVO_NO_SE_GUARDA,
		entrada_de_articulos: false,
		/* Caja.vue: v-if="cajas.length && !selected_payment_methods.length" (lo segundo es transitorio) */
		disponible: function (vm) { return cantidad_en_store(vm, 'caja') > 0 },
		aparece_cuando: 'Cuando se cobra con un solo método de pago',
	},
	{
		key: 'sucursal',
		nombre: 'Sucursal',
		nombre_corto: 'sucursal',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: true,
		motivo_obligatorio: MOTIVO_NO_SE_GUARDA,
		entrada_de_articulos: false,
		/* Address.vue: v-if="addresses.length >= 1" */
		disponible: function (vm) { return cantidad_en_store(vm, 'address') >= 1 },
		aparece_cuando: null,
	},
	{
		key: 'lista_de_precios',
		nombre: 'Lista de precios',
		nombre_corto: 'lista de precios',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: true,
		motivo_obligatorio: MOTIVO_NO_SE_GUARDA,
		entrada_de_articulos: false,
		/*
			price-type/Index.vue: show() = requiere_lista_de_precios() || !!price_type_vender.
			La parte estable es "la cuenta vende con listas" (mismo criterio que
			mixins/vender/price_types.js::requiere_lista_de_precios, sin el caso transitorio del
			catalogo confirmado vacio).
		*/
		disponible: function (vm) {
			let usa_listas = !!(vm && typeof vm.ownerUsesListasDePrecio == 'function' && vm.ownerUsesListasDePrecio())
			return usa_listas && !tiene_extencion(vm, 'lista_de_precios_por_rango_de_cantidad_vendida')
		},
		aparece_cuando: null,
	},
	{
		key: 'moneda',
		nombre: 'Moneda y cotización del dólar',
		nombre_corto: 'moneda',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		/* Moneda.vue: show() = user && hasExtencion('ventas_en_dolares') */
		disponible: function (vm) { return tiene_extencion(vm, 'ventas_en_dolares') },
		aparece_cuando: null,
	},
	{
		key: 'tipo_de_venta',
		nombre: 'Tipo de venta',
		nombre_corto: 'tipo de venta',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: true,
		motivo_obligatorio: MOTIVO_NO_SE_GUARDA,
		entrada_de_articulos: false,
		/* SaleType.vue: v-if="sale_types.length > 1" */
		disponible: function (vm) { return cantidad_en_store(vm, 'sale_type') > 1 },
		aparece_cuando: null,
	},
	{
		/*
			Hasta esta mision Seller.vue se montaba DOS veces (etapa 1 y etapa 3). En un diseño cada
			elemento aparece una sola vez: el predeterminado lo deja en la etapa 1.
		*/
		key: 'vendedor',
		nombre: 'Vendedor',
		nombre_corto: 'vendedor',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function (vm) { return tiene_extencion(vm, 'indicar_vendedor_en_vender') },
		aparece_cuando: null,
	},
	{
		key: 'fecha_de_venta',
		nombre: 'Fecha de la venta',
		nombre_corto: 'fecha',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: null,
	},
	{
		key: 'cliente',
		nombre: 'Cliente',
		nombre_corto: 'cliente',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: null,
	},
	{
		key: 'guardar_como_presupuesto',
		nombre: 'Guardar como presupuesto',
		nombre_corto: 'presupuesto',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function (vm) { return tiene_extencion(vm, 'budgets') },
		aparece_cuando: 'Con un cliente elegido',
	},
	{
		key: 'omitir_en_cuenta_corriente',
		nombre: 'Omitir en cuenta corriente',
		nombre_corto: 'cuenta corriente',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: 'Con un cliente elegido',
	},
	{
		key: 'alerta_de_cobro',
		nombre: 'Alerta de cobro',
		nombre_corto: 'alerta de cobro',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: 'Con un cliente elegido (no en presupuestos)',
	},
	{
		key: 'enviar_correo',
		nombre: 'Enviar correo al cliente',
		nombre_corto: 'correo',
		etapa: 'etapa_1',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function (vm) { return tiene_extencion(vm, 'enviar_mail_a_clientes') },
		aparece_cuando: 'Con un cliente elegido que tenga correo',
	},

	/* ---------------------------------------------------------------- Etapa 2 */

	{
		key: 'resumen',
		nombre: 'Resumen de la venta (total, cliente, pago y vuelto)',
		nombre_corto: 'resumen',
		etapa: 'etapa_2',
		cols: 12,
		obligatorio: true,
		motivo_obligatorio: MOTIVO_TOTAL,
		entrada_de_articulos: false,
		/* Obligatorio para que el total se vea siempre: la etapa que lo tenga no puede arrancar plegada. */
		mantiene_etapa_abierta: true,
		disponible: function () { return true },
		aparece_cuando: null,
	},
	{
		key: 'codigo_de_barras',
		nombre: 'Código de barras',
		nombre_corto: 'código de barras',
		etapa: 'etapa_2',
		cols: 3,
		obligatorio: false,
		entrada_de_articulos: true,
		disponible: function (vm) { return !tiene_extencion(vm, 'no_usar_codigos_de_barra') },
		aparece_cuando: null,
	},
	{
		key: 'buscador_de_articulos',
		nombre: 'Buscador de artículos',
		nombre_corto: 'buscador',
		etapa: 'etapa_2',
		/*
			Misma cuenta que ArticleName.vue::col_header_lg hasta esta mision: el buscador toma el
			lugar que dejan libre la cantidad y el codigo de barras cuando no se usan. Rige para el
			diseño predeterminado; un diseño guardado congela su ancho.
		*/
		cols: function (vm) {
			let cols = 4
			if (hay_combos_o_promociones(vm)) {
				cols -= 1
			}
			if (!vm || !vm.user || !vm.user.ask_amount_in_vender) {
				cols += 2
			}
			if (tiene_extencion(vm, 'no_usar_codigos_de_barra')) {
				cols += 3
			}
			return cols
		},
		obligatorio: false,
		entrada_de_articulos: true,
		disponible: function () { return true },
		aparece_cuando: null,
	},
	{
		key: 'combos',
		nombre: 'Combos',
		nombre_corto: 'combos',
		etapa: 'etapa_2',
		cols: 2,
		obligatorio: false,
		entrada_de_articulos: true,
		disponible: function (vm) { return tiene_extencion(vm, 'combos') },
		aparece_cuando: null,
	},
	{
		key: 'promociones',
		nombre: 'Promociones',
		nombre_corto: 'promociones',
		etapa: 'etapa_2',
		cols: 2,
		obligatorio: false,
		entrada_de_articulos: true,
		disponible: function (vm) { return tiene_extencion(vm, 'vinoteca') },
		aparece_cuando: null,
	},
	{
		key: 'servicio',
		nombre: 'Servicio',
		nombre_corto: 'servicios',
		etapa: 'etapa_2',
		/* Misma cuenta que mixins/vender.js::services_col_header_lg. */
		cols: function (vm) {
			return hay_combos_o_promociones(vm) ? 2 : 3
		},
		obligatorio: false,
		entrada_de_articulos: true,
		disponible: function () { return true },
		aparece_cuando: null,
	},
	{
		key: 'cantidad',
		nombre: 'Cantidad',
		nombre_corto: 'cantidad',
		etapa: 'etapa_2',
		cols: 2,
		obligatorio: false,
		entrada_de_articulos: true,
		/* Amount.vue: v-if="user.ask_amount_in_vender" es una preferencia del usuario: va en aparece_cuando. */
		disponible: function () { return true },
		aparece_cuando: 'Si el usuario tiene activado "pedir la cantidad al vender"',
		/*
			🔴 Con "pedir la cantidad al vender" prendido, el articulo elegido queda PENDIENTE hasta que
			se confirma la cantidad en este campo (Amount.vue). Si el diseño lo saco, el vendedor no
			tiene donde confirmarla y no puede agregar ningun articulo. La preferencia es de cada
			usuario y el diseño es del negocio, asi que no alcanza con un candado en el editor: se
			fuerza al dibujar.
		*/
		se_fuerza_si: function (vm) {
			return !!(vm && vm.user && vm.user.ask_amount_in_vender)
		},
		motivo_forzado: 'Si el usuario tiene activado "pedir la cantidad al vender", aparece igual en Vender: sin este campo no se puede confirmar la cantidad.',
	},

	/* ---------------------------------------------------------------- Etapa 3 */

	{
		key: 'estado',
		nombre: 'Estado de la venta',
		nombre_corto: 'estado',
		etapa: 'etapa_3',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		/* SaleStatus.vue: v-if="$store.state.sale_status.models.length" */
		disponible: function (vm) { return cantidad_en_store(vm, 'sale_status') > 0 },
		aparece_cuando: null,
	},
	{
		key: 'fecha_de_entrega',
		nombre: 'Fecha de entrega',
		nombre_corto: 'fecha de entrega',
		etapa: 'etapa_3',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function (vm) { return tiene_extencion(vm, 'ventas_con_fecha_de_entrega') },
		aparece_cuando: 'No aparece al editar un presupuesto',
	},
	{
		key: 'orden_de_compra',
		nombre: 'N° de orden de compra',
		nombre_corto: 'orden de compra',
		etapa: 'etapa_3',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function (vm) { return tiene_extencion(vm, 'numero_orden_de_compra_para_las_ventas') },
		aparece_cuando: null,
	},
	{
		key: 'empleado',
		nombre: 'Empleado',
		nombre_corto: 'empleado',
		etapa: 'etapa_3',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function (vm) {
			return tiene_extencion(vm, 'cambiar_empleado_en_vender') && tiene_permiso(vm, 'vender.change_employee')
		},
		aparece_cuando: null,
	},
	{
		key: 'precios_con_iva',
		nombre: 'Precios con IVA',
		nombre_corto: 'IVA',
		etapa: 'etapa_3',
		cols: 2,
		obligatorio: false,
		entrada_de_articulos: false,
		/* Antes lo decidia IvaYStock.vue::can_use_iva_aplicado */
		disponible: function (vm) {
			return !tiene_extencion(vm, 'hide_iva_and_discount_stock_in_vender') && tiene_permiso(vm, 'vender.iva_aplicado')
		},
		aparece_cuando: null,
	},
	{
		key: 'descontar_stock',
		nombre: 'Descontar stock',
		nombre_corto: 'stock',
		etapa: 'etapa_3',
		cols: 2,
		obligatorio: false,
		entrada_de_articulos: false,
		/* Antes lo decidia IvaYStock.vue::can_use_discount_stock */
		disponible: function (vm) {
			return !tiene_extencion(vm, 'hide_iva_and_discount_stock_in_vender') && tiene_permiso(vm, 'vender.discount_stock')
		},
		aparece_cuando: null,
	},
	{
		key: 'observaciones',
		nombre: 'Observaciones',
		nombre_corto: 'observaciones',
		etapa: 'etapa_3',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: null,
	},
	{
		key: 'observaciones_ocultas',
		nombre: 'Observaciones ocultas',
		nombre_corto: 'observaciones ocultas',
		etapa: 'etapa_3',
		cols: 4,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: null,
	},
	{
		key: 'descuentos',
		nombre: 'Descuentos',
		nombre_corto: 'descuentos',
		etapa: 'etapa_3',
		cols: 6,
		obligatorio: false,
		entrada_de_articulos: false,
		/*
			Discounts.vue se dibuja con el permiso sale.discount_surchage.aplicar O si el cliente
			elegido tiene descuentos vinculados (lo segundo es transitorio), asi que se lista siempre.
		*/
		disponible: function () { return true },
		aparece_cuando: 'Si podés aplicar descuentos o el cliente elegido tiene descuentos vinculados',
	},
	{
		key: 'recargos',
		nombre: 'Recargos',
		nombre_corto: 'recargos',
		etapa: 'etapa_3',
		cols: 6,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: 'Si podés aplicar recargos o el cliente elegido tiene recargos vinculados',
	},
	{
		key: 'puntos',
		nombre: 'Puntos del cliente',
		nombre_corto: 'puntos',
		etapa: 'etapa_3',
		cols: 12,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function (vm) { return tiene_extencion(vm, 'puntos_clientes') },
		aparece_cuando: 'Con un cliente elegido y un programa de puntos activo',
	},
	{
		key: 'nota_de_credito',
		nombre: 'Nota de crédito',
		nombre_corto: 'nota de crédito',
		etapa: 'etapa_3',
		cols: 12,
		obligatorio: false,
		entrada_de_articulos: false,
		disponible: function () { return true },
		aparece_cuando: 'Cuando se devuelven artículos de un cliente',
	},
]

/* Indice por key, armado una sola vez. */
export const ELEMENTOS_POR_KEY = {}
ELEMENTOS.forEach(function (elemento) {
	ELEMENTOS_POR_KEY[elemento.key] = elemento
})

/**
 * El elemento del catalogo con esa key, o null (key desconocida o retirada).
 *
 * @param {string} key
 * @returns {Object|null}
 */
export function elemento(key) {
	return Object.prototype.hasOwnProperty.call(ELEMENTOS_POR_KEY, key) ? ELEMENTOS_POR_KEY[key] : null
}

/**
 * Si la key es un elemento que no se puede sacar del diseño.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function es_obligatorio(key) {
	let el = elemento(key)
	return !!(el && el.obligatorio)
}

/**
 * Si la key es un elemento que agrega articulos a la venta.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function es_entrada_de_articulos(key) {
	let el = elemento(key)
	return !!(el && el.entrada_de_articulos)
}

/**
 * Si la etapa que tiene este elemento no puede arrancar plegada ni plegarse sola: las entradas de
 * articulos (hay que poder escanear) y los que lo piden explicitamente (el resumen, donde esta el
 * total).
 *
 * @param {string} key
 * @returns {boolean}
 */
export function mantiene_etapa_abierta(key) {
	let el = elemento(key)
	return !!(el && (el.entrada_de_articulos || el.mantiene_etapa_abierta))
}

/**
 * Si el elemento se dibuja aunque el diseño lo haya sacado (ver `se_fuerza_si` en el catalogo).
 * Si la funcion revienta, NO se fuerza: el diseño manda.
 *
 * @param {string} key
 * @param {Object} vm
 * @returns {boolean}
 */
export function se_fuerza(key, vm) {
	let el = elemento(key)
	if (!el || typeof el.se_fuerza_si != 'function') {
		return false
	}
	try {
		return !!el.se_fuerza_si(vm)
	} catch (e) {
		console.log('diseño de vender: fallo se_fuerza_si() de ' + key, e)
		return false
	}
}

/**
 * Si el elemento se puede ver en este negocio/usuario. Un marcador (separador o salto de fila)
 * siempre se ve; una key desconocida nunca. Si la funcion del catalogo revienta, se considera NO
 * disponible: un catalogo roto no puede tumbar la pantalla de venta.
 *
 * @param {string} key
 * @param {Object} vm
 * @returns {boolean}
 */
export function esta_disponible(key, vm) {
	if (es_marcador(key)) {
		return true
	}
	let el = elemento(key)
	if (!el) {
		return false
	}
	try {
		return !!el.disponible(vm)
	} catch (e) {
		console.log('diseño de vender: fallo disponible() de ' + key, e)
		return false
	}
}

/**
 * Ancho por defecto de un elemento, ya acotado a 1..12.
 *
 * @param {string} key
 * @param {Object} vm
 * @returns {number}
 */
export function cols_por_defecto(key, vm) {
	if (es_marcador(key)) {
		return 12
	}
	let el = elemento(key)
	if (!el) {
		return 12
	}
	let cols = typeof el.cols == 'function' ? el.cols(vm) : el.cols
	return acotar_cols(cols, 12)
}

/**
 * Normaliza un ancho de columnas: entero entre 1 y 12. Si no es un numero, usa el default.
 *
 * @param {*} valor
 * @param {number} por_defecto
 * @returns {number}
 */
export function acotar_cols(valor, por_defecto) {
	let cols = parseInt(valor, 10)
	if (isNaN(cols)) {
		cols = por_defecto
	}
	if (cols < 1) {
		cols = 1
	}
	if (cols > 12) {
		cols = 12
	}
	return cols
}

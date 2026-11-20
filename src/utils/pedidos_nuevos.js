/**
 * Refresco de la pantalla de Pedidos de Tienda Online cuando entra un pedido nuevo (ronda 5 de la
 * prueba gratuita, 14/11/2026, ítem E9a).
 *
 * El defecto: la tabla de Pedidos (components/online/components/orders/Index.vue) pide la lista UNA
 * vez, al crearse. El aviso en vivo de un pedido nuevo (Pusher, mixins/broadcast.js) y la reconexión
 * solo refrescan `order.unconfirmed_models` —el globito del menú—, no la lista. (El polling de 5
 * minutos de mixins/start_methods.js NO corre con Tienda Online abierta: sin Pusher, esta pantalla
 * vuelve a preguntar al volver a la pestaña; ver orders/Index.vue.) Quien abre la tienda con «Ver mi tienda» (que está en esta misma pantalla), compra y vuelve
 * a la pestaña del sistema ve «No hay Pedidos» con el globito en 1, hasta tocar «Por fecha» o
 * «Historico», que son los que vuelven a pedir.
 *
 * Funciones puras (sin store ni `this`): la pantalla las usa para decidir.
 */

/**
 * Si en la lista nueva de pedidos sin confirmar hay alguno que no estaba en la anterior.
 *
 * Se mira el CONTENIDO y no la referencia: el polling deja un arreglo nuevo cada 5 minutos aunque
 * traiga los mismos pedidos, y eso no tiene que volver a pedir la tabla.
 *
 * @param {Array} ids_anteriores Ids de antes (puede venir undefined/null).
 * @param {Array} ids_actuales Ids de ahora.
 * @returns {Boolean}
 */
export function hay_pedido_nuevo(ids_anteriores, ids_actuales) {
	if (!Array.isArray(ids_actuales) || !ids_actuales.length) {
		return false
	}
	let anteriores = Array.isArray(ids_anteriores) ? ids_anteriores.map(String) : []
	return ids_actuales.some(id => anteriores.indexOf(String(id)) == -1)
}

/**
 * Qué hay que despachar para volver a pedir lo que la tabla de Pedidos está mostrando, o null si no
 * hay que tocar nada.
 *
 * - «Por fecha» sin una búsqueda del usuario: `getModels` (el día o rango elegido, como al entrar).
 * - «Por fecha» CON una búsqueda del usuario (`is_filtered`): nada. Volver a pedir le borraría lo que
 *   buscó; el globito del menú ya avisa.
 * - «Historico» con el listado por defecto en la página 1: `runListadoPorDefecto` (el pedido nuevo va
 *   primero). En otra página, o con una búsqueda del usuario: nada, por lo mismo.
 *
 * @param {Object} estado `state.order`.
 * @returns {String|null} 'getModels', 'runListadoPorDefecto' o null.
 */
export function accion_para_refrescar_pedidos(estado) {
	if (!estado) {
		return null
	}
	if (estado.from_dates) {
		return estado.is_filtered ? null : 'getModels'
	}
	if (estado.listado_por_defecto && Number(estado.filter_page || 1) == 1) {
		return 'runListadoPorDefecto'
	}
	return null
}

/**
 * Cuándo se puede refrescar la tabla de Pedidos (revisión de E9a, 14/11/2026):
 * - 'nunca' si la sección a la vista no es Pedidos: al volver a ella se vuelve a pedir igual.
 * - 'pendiente' si el dueño tiene filas tildadas o el formulario de un pedido abierto: `getModels`
 *   le borra la selección (`setSelected([])`) y cambiarle la lista abajo del modal confunde. Se
 *   refresca apenas suelta la selección o cierra el modal.
 * - 'ahora' en cualquier otro caso.
 *
 * @param {Object} momento
 * @param {String} momento.seccion `$route.params.view`.
 * @param {Number} momento.seleccionados Cantidad de filas tildadas (`state.order.selected`).
 * @param {Boolean} momento.modal_abierto Si el formulario de un pedido está abierto.
 * @returns {String} 'ahora', 'pendiente' o 'nunca'.
 */
export function momento_de_refrescar(momento) {
	if (!momento || momento.seccion != 'pedidos') {
		return 'nunca'
	}
	if (Number(momento.seleccionados || 0) > 0 || momento.modal_abierto) {
		return 'pendiente'
	}
	return 'ahora'
}

/** Mínimo entre dos consultas por volver a la pestaña: alternar pestañas no bombardea la API. */
export const MINIMO_ENTRE_CONSULTAS_POR_VISIBILIDAD_MS = 10000

/**
 * Si al volver a la pestaña se puede volver a preguntar por los pedidos sin confirmar.
 *
 * @param {Number} ultima_consulta_ms Momento de la última consulta por visibilidad (0 = nunca).
 * @param {Number} ahora_ms
 * @returns {Boolean}
 */
export function puede_consultar_por_visibilidad(ultima_consulta_ms, ahora_ms) {
	return !ultima_consulta_ms || (ahora_ms - ultima_consulta_ms) >= MINIMO_ENTRE_CONSULTAS_POR_VISIBILIDAD_MS
}

/** Sólo el evento en vivo con id válido puede originar un aviso; nunca el listado histórico. */
export function id_de_aviso_de_pedido(payload) {
	const id = payload && payload.order_id
	return /^(?:[1-9][0-9]*)$/.test(String(id)) ? String(id) : null
}

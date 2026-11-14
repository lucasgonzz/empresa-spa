/**
 * Refresco de la pantalla de Pedidos de Tienda Online cuando entra un pedido nuevo (ronda 5 de la
 * prueba gratuita, 14/11/2026, ítem E9a).
 *
 * El defecto: la tabla de Pedidos (components/online/components/orders/Index.vue) pide la lista UNA
 * vez, al crearse. El aviso en vivo de un pedido nuevo (Pusher, mixins/broadcast.js), la reconexión y
 * el polling de 5 minutos solo refrescan `order.unconfirmed_models` —el globito del menú—, no la
 * lista. Quien abre la tienda con «Ver mi tienda» (que está en esta misma pantalla), compra y vuelve
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

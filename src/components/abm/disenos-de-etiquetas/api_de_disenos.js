/*
	Pedidos a la API de los Diseños de etiquetas (mision disenos-etiquetas-gondola, 29/9/2026).

	Contrato (plan de la mision, §3.6), todo sobre `api/article-ticket-design`:

	- POST   article-ticket-design        {name, diseno}           -> 201 {model}
	- PUT    article-ticket-design/{id}   solo las claves que vienen (name, diseno, position) -> 200 {model}
	- DELETE article-ticket-design/{id}                            -> 200

	El listado (GET) lo pide el store con `article_ticket_design/getModels`: se despacha despues de
	cada escritura para que la solapa y el menu de Listado queden al dia.

	Mismo criterio que los Diseños de Vender (disenos-de-vender/api_de_disenos.js): los pedidos van
	con `skip_global_error_event` y `skip_global_validation_toast` para que el error lo muestre UNA
	vez quien llama, con mensaje_de_error() (que se reusa de alla).
*/
export { mensaje_de_error } from '@/components/abm/disenos-de-vender/api_de_disenos'

/* Ruta del recurso, relativa a $api (que ya lleva el prefijo /api) */
const RUTA = 'article-ticket-design'

/* Configuracion de axios de todos los pedidos de este modulo */
const CONFIGURACION = {
	skip_global_error_event: true,
	skip_global_validation_toast: true,
}

/**
 * Crea un diseño.
 *
 * @param {Object} vm componente que hace el pedido (usa su $api)
 * @param {{name: string, diseno: Object}} datos
 * @returns {Promise}
 */
export function crear_diseno(vm, datos) {
	return vm.$api.post(RUTA, datos, CONFIGURACION)
}

/**
 * Actualiza un diseño. Solo viajan las claves que se quieren cambiar.
 *
 * @param {Object} vm
 * @param {number} id
 * @param {Object} datos p. ej. {name} o {name, diseno}
 * @returns {Promise}
 */
export function actualizar_diseno(vm, id, datos) {
	return vm.$api.put(RUTA + '/' + id, datos, CONFIGURACION)
}

/**
 * Elimina un diseño.
 *
 * @param {Object} vm
 * @param {number} id
 * @returns {Promise}
 */
export function eliminar_diseno(vm, id) {
	return vm.$api.delete(RUTA + '/' + id, CONFIGURACION)
}

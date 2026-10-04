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
import { env } from '@/runtime_config'

export { mensaje_de_error } from '@/components/abm/disenos-de-vender/api_de_disenos'

/*
	Lo que se dice cuando no hay articulos para "Imprimir una prueba". Desde la mision
	etiquetas-prueba-articulos-reales (4/10/2026) la solapa los busca sola en la API, asi que llegar
	aca es que el negocio no tiene ninguno cargado (antes decia "Abrí el Listado...", que con el
	listado de la 4.x no alcanzaba: ver muestra.js).
*/
export const SIN_ARTICULOS_PARA_PROBAR = 'Todavía no tenés artículos cargados con qué probar.'

/* Mientras la solapa busca articulos en la API */
export const BUSCANDO_ARTICULOS_PARA_PROBAR = 'Buscando artículos para la prueba…'

/* Si la busqueda en la API fallo (sin conexion, error del servidor) */
export const NO_SE_PUDIERON_TRAER_ARTICULOS = 'No se pudieron traer artículos para la prueba. Revisá tu conexión y volvé a entrar.'

/* Cuantos articulos se piden a la API para la prueba: los completos alcanzan con la hoja de prueba (6) */
const ARTICULOS_COMPLETOS_A_PEDIR = 6

/* Si no hay ninguno completo, se piden algunos mas de cualquier tipo, para elegir los que tienen precio */
const ARTICULOS_CUALQUIERA_A_PEDIR = 12

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

/**
 * Pide unos articulos del negocio al buscador general (`global-search/article`), para la muestra del
 * lienzo y para "Imprimir una prueba" cuando el store no tiene ninguno completo (se entro a la
 * solapa sin pasar por el Listado, o el Listado que se vio no tenia codigos de barras).
 *
 * Va por $api directo y NO por el store: runGlobalSearch escribe `filtered` del modulo `article`, y
 * eso le pisaria al Listado la pagina que estaba mirando.
 *
 * @param {Object} vm componente que hace el pedido (usa su $api)
 * @param {number} cuantos per_page
 * @param {Array} filtros filtros de columna (mismo formato que los de la lupa del Listado)
 * @returns {Promise<Array>}
 */
function pedir_articulos(vm, cuantos, filtros) {
	return vm.$api.post('global-search/article?page=1', {
		query_value: '',
		props: [],
		relation_props: [],
		extra_filters: [],
		filters: filtros,
		order_by: 'id',
		order_direction: 'DESC',
		per_page: cuantos,
	}, CONFIGURACION)
	.then(function (respuesta) {
		let modelos = respuesta.data && respuesta.data.models ? respuesta.data.models.data : null
		return Array.isArray(modelos) ? modelos : []
	})
}

/**
 * Los articulos con que probar, traidos de la API: primero los ultimos que tienen codigo de barras y
 * precio; si no llegan a llenar la hoja de prueba y `tambien_incompletos`, se suman los ultimos de
 * cualquier tipo (muestra.js saca los repetidos y pone los completos primero).
 *
 * Una API que no entendiera los filtros devuelve los ultimos articulos sin filtrar, y muestra.js
 * igual pone los completos primero.
 *
 * @param {Object} vm
 * @param {boolean} tambien_incompletos si el store no tiene ningun articulo a mano
 * @returns {Promise<Array>} rechaza si falla el pedido
 */
export function buscar_articulos_para_la_prueba(vm, tambien_incompletos) {
	let completos = [
		{ key: 'bar_code', type: 'text', no_en_blanco: true },
		{ key: 'final_price', type: 'number', no_en_blanco: true },
	]

	return pedir_articulos(vm, ARTICULOS_COMPLETOS_A_PEDIR, completos)
	.then(function (articulos) {
		if (articulos.length >= ARTICULOS_COMPLETOS_A_PEDIR || !tambien_incompletos) {
			return articulos
		}
		return pedir_articulos(vm, ARTICULOS_CUALQUIERA_A_PEDIR, [])
		.then(function (cualquiera) {
			return articulos.concat(cualquiera)
		})
	})
}

/**
 * "Imprimir una prueba": abre en otra pestaña el PDF de etiquetas con un diseño guardado y unos
 * articulos (la misma ruta que usa el menu de Listado).
 *
 * @param {number} article_ticket_design_id
 * @param {Array} ids ids de articulos (ids_para_la_prueba de muestra.js)
 * @returns {boolean} false si no habia articulos con que probar
 */
export function abrir_prueba(article_ticket_design_id, ids) {
	if (!article_ticket_design_id || !ids || !ids.length) {
		return false
	}
	window.open(env('VUE_APP_API_URL') + '/article/tickets-pdf/' + ids.join('-') + '?article_ticket_design_id=' + article_ticket_design_id)
	return true
}

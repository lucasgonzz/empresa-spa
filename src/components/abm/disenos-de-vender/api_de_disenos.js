/*
	Pedidos a la API de los Diseños de Vender (mision diseno-vender-configurable, 28/9/2026).

	Contrato (plan de la mision, §2), todo sobre `api/vender-layout`:

	- POST   vender-layout        {name, layout, en_uso}          -> 201 {model}
	- PUT    vender-layout/{id}   solo las claves que vienen      -> 200 {model}
	                              ({en_uso: true} = "Usar este diseño")
	- DELETE vender-layout/{id}                                   -> 200, o 422 {message} si es el
	                                                                 que esta en uso

	El listado (GET) no pasa por aca: lo pide el store con `vender_layout/getModels`, que es lo que
	hay que despachar despues de CUALQUIER escritura -- poner un diseño en uso apaga a los demas, asi
	que cambia mas de una fila.

	🔴 Los pedidos van con `skip_global_error_event` y `skip_global_validation_toast`, igual que
	ZipnovaCard.vue: el error lo muestra quien llama, con mensaje_de_error(). Sin esas banderas el
	interceptor global de main.js mostraria SU toast (un 422 con `message` sale como warning) y aca
	se mostraria otro, o sea dos avisos por el mismo error.
*/
import { collect_laravel_validation_messages } from '@/utils/laravel_validation_toast'

/* Ruta del recurso, relativa a $api (que ya lleva el prefijo /api). */
const RUTA = 'vender-layout'

/* Configuracion de axios de todos los pedidos de este modulo (ver el comentario de arriba). */
const CONFIGURACION = {
	skip_global_error_event: true,
	skip_global_validation_toast: true,
}

/**
 * Crea un diseño.
 *
 * @param {Object} vm componente que hace el pedido (usa su $api)
 * @param {{name: string, layout: Object|null, en_uso: boolean}} datos
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
 * @param {Object} datos p. ej. {en_uso: true} o {name, layout, en_uso}
 * @returns {Promise}
 */
export function actualizar_diseno(vm, id, datos) {
	return vm.$api.put(RUTA + '/' + id, datos, CONFIGURACION)
}

/**
 * Elimina un diseño. El que esta en uso vuelve con 422 y un `message` que explica que hacer.
 *
 * @param {Object} vm
 * @param {number} id
 * @returns {Promise}
 */
export function eliminar_diseno(vm, id) {
	return vm.$api.delete(RUTA + '/' + id, CONFIGURACION)
}

/**
 * El mensaje que corresponde mostrar para un pedido que fallo: los errores de validacion de
 * Laravel si vinieron, el `message` del backend si vino, y si no el texto de respaldo (sin
 * respuesta = sin conexion o servidor caido).
 *
 * @param {Object} error error de axios
 * @param {string} respaldo texto para cuando no hay nada mejor que decir
 * @returns {string}
 */
export function mensaje_de_error(error, respaldo) {
	let datos = error && error.response && error.response.data ? error.response.data : null

	if (!datos || typeof datos != 'object') {
		return respaldo
	}

	let mensajes = collect_laravel_validation_messages(datos)

	if (mensajes.length) {
		return mensajes.join(' ')
	}

	if (datos.message) {
		return datos.message
	}

	return respaldo
}

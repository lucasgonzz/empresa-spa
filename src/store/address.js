import axios from 'axios'
import VueCookies from 'vue-cookies'
import __base_store from '@/store/__base_store'

/**
 * Store de direcciones (modelo `address`) construido desde el factory común.
 *
 * Notas:
 * - Usa el comportamiento estándar del base, salvo la mutación `add` (ver abajo).
 * - Cualquier ajuste futuro se puede hacer vía overrides en `state/mutations/actions`.
 */
let address_store = __base_store({
	/** Estado propio del modelo `address`. */
	state: {
		model_name: 'address',
	},
})

/**
 * Mutación `add` del factory, guardada para envolverla (no se reescribe: así se conserva todo lo
 * que hace hoy, incluida la variante con localStorage si alguna vez se prende para este store).
 */
let add_del_factory = address_store.mutations.add

/**
 * Misión deposito-madre (2/10/2026): el depósito madre es UNO solo por comercio.
 *
 * empresa-api lo garantiza en la base: al guardar una sucursal con `es_deposito_madre` en 1,
 * desmarca las demás. Pero el store no se entera, porque `sendAddModelNotification` del backend
 * está apagado: la sucursal que dejó de ser madre seguiría mostrando el tilde viejo en el ABM y en
 * cualquier otro lugar que lea `address` del store, hasta recargar la página.
 *
 * 🔴 Por qué acá y no "después de guardar" en el ABM: el ABM de sucursales lo dibuja
 * `src/common-vue/views/Abm.vue` con `view/Index.vue`, que no escucha `modelSaved` ni le pasa
 * `actions_after_save` al modal, y common-vue no se toca. Todo guardado del modal termina en
 * `commit('address/add', res.data.model)` (model/Index.vue, PUT y POST), así que la mutación es
 * el único punto de enganche que queda del lado de la SPA.
 *
 * Y como una mutación no puede despachar `getModels`, en vez de volver a pedir las sucursales se
 * aplica en memoria la misma regla que ya aplicó el backend: si la sucursal que llega quedó como
 * madre, las otras copias en memoria (`models`, `filtered`, `options` y el `model` abierto) dejan
 * de serlo. Sin pedido extra y sin resetear el filtro del listado (que `getModels` limpia).
 *
 * Si la sucursal que llega NO es madre (o la API todavía no conoce la columna), no se toca nada.
 *
 * @param {Object} state Estado del módulo.
 * @param {Object} value Sucursal que se acaba de guardar, tal como la devolvió la API.
 * @returns {void}
 */
address_store.mutations.add = function (state, value) {
	add_del_factory(state, value)

	// Defensivo contra un "0" en texto (truthy en JS): solo cuenta como madre un 1 / true real.
	if (!value || !value.es_deposito_madre || value.es_deposito_madre == '0') {
		return
	}

	/** Copias de sucursales en memoria que pueden tener el tilde viejo. */
	let sucursales = []
	if (Array.isArray(state.models)) {
		sucursales = sucursales.concat(state.models)
	}
	if (Array.isArray(state.filtered)) {
		sucursales = sucursales.concat(state.filtered)
	}
	if (Array.isArray(state.options)) {
		sucursales = sucursales.concat(state.options)
	}
	if (state.model) {
		sucursales.push(state.model)
	}

	sucursales.forEach(sucursal => {
		// Las copias sin id se saltean: en un ALTA, cuando vuelve el POST, `state.model` todavía es
		// el formulario de la sucursal nueva con `id` null (distinto del id de la respuesta), y
		// apagarle el tilde lo hacía parpadear mientras se cierra el modal. Una copia sin id no
		// puede ser "otra" sucursal ya guardada como madre.
		if (!sucursal || sucursal.id == null) {
			return
		}
		// Solo se apagan las que hoy tienen el tilde: la clave ya existe en el objeto y la
		// asignación directa es reactiva (no hace falta Vue.set).
		if (sucursal.id != value.id && sucursal.es_deposito_madre) {
			sucursal.es_deposito_madre = 0
		}
	})
}

/**
 * Misión eliminar-sucursal-con-stock (5/10/2026): borra una sucursal con la decisión que tomó el
 * usuario en el modal de ABM → Sucursales (components/abm/eliminar-sucursal/Index.vue).
 *
 * Por qué una acción propia y no la `delete` del factory: la `delete` base hace un DELETE pelado,
 * sin parámetros, y espera un 200 vacío. Acá el DELETE lleva la decisión (qué hacer con el stock,
 * con los empleados y con lo que la sucursal tenía configurado) y la API puede contestar de dos
 * maneras distintas que el factory no distingue:
 *
 *  - 200 `{eliminada: true, resumen}`: la sucursal ya no existe. Se saca de la memoria y se limpia
 *    todo lo que la SPA recordaba de ella (ver `limpiar_referencias_locales`).
 *  - 202 `{queued: true, ...}`: eran tantos artículos que la API lo encoló. La sucursal TODAVÍA
 *    existe y el stock se está moviendo: sacarla de la lista (o limpiar la cookie) acá mostraría
 *    algo que todavía no pasó, y si el proceso falla la sucursal seguiría ahí sin que se la pueda
 *    ver. No se toca nada; el panel de procesos en segundo plano muestra el avance.
 *
 * Los errores (422 con el motivo, 404, 5xx, sin conexión) NO los muestra el interceptor global:
 * van con `skip_global_error_event` y `skip_global_validation_toast` y los muestra el modal adentro
 * de sí mismo, que es donde está mirando el usuario. Sin las banderas aparecía además un toast de
 * 10 segundos con el mismo texto. Mismo criterio que components/abm/disenos-de-vender.
 *
 * @param {Object} contexto Contexto de Vuex (commit, dispatch).
 * @param {Object} payload
 * @param {Number} payload.address_id Sucursal a eliminar.
 * @param {Object} [payload.params] Parámetros del contrato (stock_accion, stock_destino_id,
 *   usuarios_accion, usuarios_destino_id, reemplazo_id). Vacío = el DELETE de siempre.
 * @returns {Promise<Object>} La respuesta de axios. Rechaza con el error de axios si la API no
 *   aceptó el borrado.
 */
address_store.actions.eliminar_con_decision = function ({ commit, dispatch }, payload) {
	/** Sucursal que se está borrando. */
	let address_id = payload.address_id
	/** Parámetros de la decisión, tal cual los armó el modal. */
	let params = payload.params ? payload.params : {}

	return axios.delete('/api/address/' + address_id, {
		params: params,
		skip_global_error_event: true,
		skip_global_validation_toast: true,
	})
	.then(res => {
		/** La API encoló el borrado (202): la sucursal sigue existiendo por ahora. */
		let en_segundo_plano = res.status === 202 || (res.data && res.data.queued)
		if (en_segundo_plano) {
			return res
		}

		// 200: ya no existe. La mutación `delete` del factory lee `state.delete.id`.
		commit('setDelete', { id: address_id })
		commit('delete')

		return dispatch('limpiar_referencias_locales', {
			address_id: address_id,
			usuarios_destino_id: params.usuarios_accion === 'reasignar' ? params.usuarios_destino_id : null,
		})
		.then(() => res)
	})
}

/**
 * Deja la SPA sin ninguna referencia a una sucursal que ya no existe.
 *
 * La sucursal elegida se recuerda en tres lugares además de la lista, y los tres seguían
 * apuntando al id muerto después de borrarla: la sucursal de Vender (`vender.address_id`), la
 * cookie `address_id` (3 años) y la sucursal del usuario (`auth.user.address_id`). Con eso Vender
 * seguía armando ventas contra una sucursal que no existe, que fue el origen de la misión (3DTisk:
 * el empleado seguía vendiendo con `address_id = 3` después de que se borró el depósito 3).
 *
 * Qué se hace con cada una:
 *
 *  - `auth.user.address_id`: si era la borrada, pasa al destino de los empleados (si el modal los
 *    reasignó) o a null (si se los dejó sin sucursal). Es lo mismo que va a leer la API en el
 *    próximo login, así que la sesión actual y la siguiente coinciden.
 *  - `vender.address_id` y la cookie: si eran la borrada, toman la sucursal NUEVA del usuario
 *    (misma regla que `init_vender_address_id` al loguearse: primero la del usuario). Si el usuario
 *    no tiene ninguna, Vender vuelve a 0 y la cookie se borra: Vender pide "Indique la SUCURSAL"
 *    en vez de seguir usando el id viejo. Vender y cookie se mantienen siempre iguales porque
 *    mixins/vender/cajas.js elige la caja por defecto leyendo la COOKIE, no el store.
 *  - Si Vender o la cookie apuntaban a OTRA sucursal (válida), no se tocan.
 *  - `employee`: se vuelve a pedir, porque la API les cambió el `address_id` a los empleados que
 *    tenían esta sucursal y la lista del store seguía con el viejo. No bloquea ni rechaza: si falla
 *    la recarga, el próximo arranque la corrige.
 *
 * @param {Object} contexto Contexto de Vuex (rootState, commit, dispatch).
 * @param {Object} payload
 * @param {Number} payload.address_id Sucursal borrada.
 * @param {Number|null} payload.usuarios_destino_id Sucursal a la que se pasaron los empleados, o
 *   null si se los dejó sin sucursal (o no había).
 * @returns {Promise}
 */
address_store.actions.limpiar_referencias_locales = function ({ rootState, commit, dispatch }, payload) {
	/** Sucursal borrada. */
	let address_id = payload.address_id
	/** Usuario logueado (puede ser null si la sesión se cayó justo ahora). */
	let user = rootState.auth ? rootState.auth.user : null
	/** Sucursal que le queda al usuario logueado, o null. */
	let address_id_del_usuario = user ? user.address_id : null

	if (user && user.address_id == address_id) {
		address_id_del_usuario = payload.usuarios_destino_id ? payload.usuarios_destino_id : null
		// Se reemplaza el objeto entero (mismo patrón que auth/setDarkMode): no hace falta
		// una mutación nueva en el store de auth.
		commit('auth/setUser', Object.assign({}, user, { address_id: address_id_del_usuario }), { root: true })
	}

	/** Sucursal con la que tienen que quedar Vender y la cookie si apuntaban a la borrada. */
	let address_id_de_reemplazo = address_id_del_usuario ? address_id_del_usuario : 0

	if (rootState.vender && rootState.vender.address_id == address_id) {
		commit('vender/setAddressId', address_id_de_reemplazo, { root: true })
	}

	if (VueCookies.get('address_id') == address_id) {
		if (address_id_de_reemplazo) {
			// -1 = igual que init_vender_address_id cuando la sucursal sale del usuario.
			VueCookies.set('address_id', address_id_de_reemplazo, -1)
		} else {
			VueCookies.remove('address_id')
		}
	}

	return Promise.resolve(dispatch('employee/getModels', null, { root: true }))
	.catch(err => {
		console.log(err)
	})
}

export default address_store

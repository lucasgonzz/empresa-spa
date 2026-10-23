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
/**
 * ¿Esta marca de la API está prendida? Un 1 / true real: el "0" en texto es truthy en JS y no cuenta.
 *
 * @param {*} valor Valor crudo de la columna (default_address, es_deposito_madre).
 * @returns {Boolean}
 */
function marca_prendida(valor) {
	return !!valor && valor != '0'
}

/**
 * Las sucursales del negocio que hay en `models`.
 *
 * Misión sucursal-siempre (23/10/2026): la tabla `addresses` también guarda domicilios de
 * compradores de la tienda vieja (`buyer_id`). La API de empresa ya filtra por dueño, pero el conteo
 * de sucursales decide qué interfaz se ve, así que se descarta defensivamente cualquier fila que
 * traiga un comprador: contar uno de más le mostraría a un negocio con UNA sucursal todo lo de dos.
 *
 * @param {Object} state Estado del módulo.
 * @returns {Array}
 */
function sucursales_del_negocio(state) {
	if (!Array.isArray(state.models)) {
		return []
	}
	return state.models.filter(sucursal => sucursal && !sucursal.buyer_id)
}

let address_store = __base_store({
	/** Estado propio del modelo `address`. */
	state: {
		model_name: 'address',
	},
	/**
	 * Misión sucursal-siempre (23/10/2026, decisión D1 del plan): todo negocio trabaja con al menos
	 * una sucursal, pero la INTERFAZ de sucursales (selector de Vender, columnas por depósito,
	 * movimientos entre depósitos, filtros por sucursal…) aparece recién desde la SEGUNDA. Con una
	 * sola, la pantalla se comporta exactamente como la de un negocio sin sucursales y la API dirige
	 * a la principal todo lo que llega sin sucursal (D3 y D15 de empresa-api).
	 *
	 * Antes cada componente decidía con `address.models.length >= 1`; ahora todos le preguntan a
	 * estos getters (y al computed global `muestra_sucursales` de mixins/generals.js, que los lee),
	 * así el criterio vive en un solo lugar.
	 */
	getters: {
		/**
		 * Sucursales del negocio (sin domicilios de compradores).
		 *
		 * @param {Object} state
		 * @returns {Array}
		 */
		sucursales(state) {
			return sucursales_del_negocio(state)
		},
		/**
		 * ¿Se muestra la interfaz de sucursales? Solo con dos o más.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @returns {Boolean}
		 */
		muestra_sucursales(state, getters) {
			return getters.sucursales.length >= 2
		},
		/**
		 * La sucursal principal (D2): la que tiene `default_address`, que empresa-api garantiza
		 * única por dueño. Si por algún motivo no viene ninguna marcada (una API vieja, o el dato
		 * todavía sin migrar), la madre; y si tampoco, la de menor id, que es el mismo orden de
		 * respaldo que usa la migración de datos de la API. null si el negocio no tiene sucursales
		 * (o todavía no cargaron).
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @returns {Object|null}
		 */
		principal(state, getters) {
			let sucursales = getters.sucursales
			if (!sucursales.length) {
				return null
			}

			let principal = sucursales.find(sucursal => marca_prendida(sucursal.default_address))
			if (principal) {
				return principal
			}

			principal = sucursales.find(sucursal => marca_prendida(sucursal.es_deposito_madre))
			if (principal) {
				return principal
			}

			return sucursales.reduce((menor, sucursal) => Number(sucursal.id) < Number(menor.id) ? sucursal : menor)
		},
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

	if (!value) {
		return
	}

	// Defensivo contra un "0" en texto (truthy en JS): solo cuenta como madre un 1 / true real.
	if (marca_prendida(value.es_deposito_madre)) {
		apagar_marca_en_las_demas(state, value, 'es_deposito_madre')
	}

	/*
		Misión sucursal-siempre (23/10/2026, D2): la sucursal principal (`default_address`) también es
		UNA sola por dueño y la API desmarca las demás al guardar. Mismo problema que el madre: sin
		esto el ABM seguía mostrando dos sucursales "principales" hasta recargar, y el getter
		`principal` podía elegir la vieja.
	*/
	if (marca_prendida(value.default_address)) {
		apagar_marca_en_las_demas(state, value, 'default_address')
	}
}

/**
 * Apaga una marca única (depósito madre, sucursal principal) en todas las copias en memoria de las
 * sucursales que no son la que se acaba de guardar.
 *
 * @param {Object} state Estado del módulo.
 * @param {Object} value Sucursal que se acaba de guardar y quedó con la marca.
 * @param {String} columna 'es_deposito_madre' o 'default_address'.
 * @returns {void}
 */
function apagar_marca_en_las_demas(state, value, columna) {
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
		if (sucursal.id != value.id && marca_prendida(sucursal[columna])) {
			sucursal[columna] = 0
		}
	})
}

/**
 * ¿Este error es el 404 "la sucursal no existe" de la API nueva?
 *
 * Misión eliminar-sucursal-con-stock (5/10/2026): `GET address/{id}/eliminar-resumen` y
 * `DELETE address/{id}` responden 404 con `{message: "La sucursal no existe o no es de este
 * comercio."}` cuando el id ya no está (otra sesión la borró, o un borrado en segundo plano
 * terminó y nadie se enteró por el broadcast).
 *
 * 🔴 Hay que distinguirlo del 404 de una API VIEJA: para ella `eliminar-resumen` es una ruta que no
 * existe y también responde 404, pero con el mensaje del router de Laravel ("The route … could not
 * be found." o vacío), y eso significa "usá el borrado de siempre", no "ya se borró". La diferencia
 * es que el mensaje de la API nueva nombra la sucursal.
 *
 * @param {Object} err Error de axios.
 * @returns {Boolean}
 */
export function es_error_de_sucursal_inexistente(err) {
	let datos = err && err.response && err.response.status === 404 ? err.response.data : null

	return !!(datos && typeof datos === 'object' && typeof datos.message === 'string' && /sucursal/i.test(datos.message))
}

/**
 * Misión eliminar-sucursal-con-stock (5/10/2026): borra una sucursal con la decisión que tomó el
 * usuario en el modal de ABM → Sucursales (components/abm/eliminar-sucursal/Index.vue).
 *
 * Por qué una acción propia y no la `delete` del factory: la `delete` base hace un DELETE pelado,
 * sin parámetros, y espera un 200 vacío. Acá el DELETE lleva la decisión (qué hacer con el stock,
 * con los empleados y con lo que la sucursal tenía configurado) y la API puede contestar de tres
 * maneras distintas que el factory no distingue:
 *
 *  - 200 `{eliminada: true, resumen}`: la sucursal ya no existe. Se saca de la memoria y se limpia
 *    todo lo que la SPA recordaba de ella (ver `dar_por_eliminada`).
 *  - 202 `{queued: true, ...}`: eran tantos artículos que la API lo encoló. La sucursal TODAVÍA
 *    existe y el stock se está moviendo: sacarla de la lista (o limpiar la cookie) acá mostraría
 *    algo que todavía no pasó, y si el proceso falla la sucursal seguiría ahí sin que se la pueda
 *    ver. No se toca nada; el panel de procesos en segundo plano muestra el avance. Cuando el
 *    proceso termina, la sucursal sale de `address.models` por el broadcast (o por una recarga) y
 *    el watcher de mixins/start_methods.js limpia Vender, la cookie y el usuario.
 *  - 404 "la sucursal no existe": un 202 anterior ya la borró y el broadcast nunca llegó, así que
 *    la SPA la seguía mostrando. Se trata como "ya eliminada": el mismo camino que un 200, y se
 *    resuelve con `ya_eliminada: true` para que el modal avise en vez de mostrar un error.
 *
 * Los demás errores (422 con el motivo, 5xx, sin conexión) NO los muestra el interceptor global:
 * van con `skip_global_error_event` y `skip_global_validation_toast` y los muestra el modal adentro
 * de sí mismo, que es donde está mirando el usuario. Sin las banderas aparecía además un toast de
 * 10 segundos con el mismo texto. Mismo criterio que components/abm/disenos-de-vender.
 *
 * @param {Object} contexto Contexto de Vuex (dispatch).
 * @param {Object} payload
 * @param {Number} payload.address_id Sucursal a eliminar.
 * @param {Object} [payload.params] Parámetros del contrato (stock_accion, stock_destino_id,
 *   usuarios_accion, usuarios_destino_id, reemplazo_id). Vacío = el DELETE de siempre.
 * @param {Boolean} [payload.recargar_configuracion] true si la sucursal tenía cajas, puntos de
 *   venta, clientes o marcas que la API pasó a otra sucursal (ver `dar_por_eliminada`).
 * @returns {Promise<Object>} La respuesta de axios (o `{status: 404, data, ya_eliminada: true}`).
 *   Rechaza con el error de axios si la API no aceptó el borrado.
 */
address_store.actions.eliminar_con_decision = function ({ dispatch }, payload) {
	/** Sucursal que se está borrando. */
	let address_id = payload.address_id
	/** Parámetros de la decisión, tal cual los armó el modal. */
	let params = payload.params ? payload.params : {}
	/** Sucursal a la que pasaron los empleados (para actualizar al usuario logueado), o null. */
	let usuarios_destino_id = params.usuarios_accion === 'reasignar' ? params.usuarios_destino_id : null

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

		// 200: ya no existe.
		dispatch('dar_por_eliminada', {
			address_id: address_id,
			usuarios_destino_id: usuarios_destino_id,
			recargar_configuracion: !!payload.recargar_configuracion,
		})

		return res
	}, err => {
		if (!es_error_de_sucursal_inexistente(err)) {
			return Promise.reject(err)
		}

		// 404: ya la había borrado un proceso en segundo plano. No se sabe qué heredaron las cajas,
		// los puntos de venta y las marcas, así que se vuelven a pedir.
		dispatch('dar_por_eliminada', {
			address_id: address_id,
			usuarios_destino_id: usuarios_destino_id,
			recargar_configuracion: true,
		})

		return { status: 404, data: err.response.data, ya_eliminada: true }
	})
}

/**
 * La sucursal ya no existe en el servidor: la saca de la memoria y limpia todo lo que la SPA
 * recordaba de ella. Es el final común de un 200, de un 404 "ya no existe" al borrarla, y de un
 * 404 al consultar su resumen.
 *
 * Es síncrona a propósito (devuelve undefined): lo que sigue --recargar stores-- sale sin
 * esperarse y sin que un error suyo moleste, porque el borrado ya está hecho.
 *
 * @param {Object} contexto Contexto de Vuex (commit, dispatch).
 * @param {Object} payload
 * @param {Number} payload.address_id Sucursal que ya no existe.
 * @param {Number|null} [payload.usuarios_destino_id] Sucursal a la que se pasaron los empleados.
 * @param {Boolean} [payload.recargar_configuracion] Ver `recargar_configuracion_de_sucursales`.
 * @returns {void}
 */
address_store.actions.dar_por_eliminada = function ({ commit, dispatch }, payload) {
	// La mutación `delete` del factory lee `state.delete.id`.
	commit('setDelete', { id: payload.address_id })
	commit('delete')

	dispatch('limpiar_referencias_locales', {
		address_id: payload.address_id,
		usuarios_destino_id: payload.usuarios_destino_id ? payload.usuarios_destino_id : null,
	})

	if (payload.recargar_configuracion) {
		dispatch('recargar_configuracion_de_sucursales')
	}
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
 *    no tiene ninguna, Vender vuelve a 0 y la cookie se borra en vez de seguir usando el id viejo;
 *    desde la misión sucursal-siempre (23/10/2026, D6) el watcher de `address.models` de
 *    mixins/start_methods.js le pone después la única sucursal si quedó una sola. Vender y cookie se mantienen siempre iguales porque
 *    mixins/vender/cajas.js elige la caja por defecto leyendo la COOKIE, no el store.
 *  - Si Vender o la cookie apuntaban a OTRA sucursal (válida), no se tocan.
 *  - `employee`: se vuelve a pedir, porque la API les cambió el `address_id` a los empleados que
 *    tenían esta sucursal y la lista del store seguía con el viejo. SIN esperar y sin que un
 *    fallo moleste: si el store no tiene empleados cargados (el usuario no tiene permiso para
 *    listarlos) no se pide, porque un 403 dispararía el toast global de error justo después de un
 *    borrado exitoso; y si falla la recarga, el próximo arranque la corrige.
 *
 * Esto no cubre el caso en que la sucursal desaparece SIN pasar por acá (un 202 que termina, o el
 * broadcast `deleted_model` de otra sesión): ese lo cubre el watcher de `address.models` de
 * mixins/start_methods.js.
 *
 * @param {Object} contexto Contexto de Vuex (rootState, commit, dispatch).
 * @param {Object} payload
 * @param {Number} payload.address_id Sucursal borrada.
 * @param {Number|null} payload.usuarios_destino_id Sucursal a la que se pasaron los empleados, o
 *   null si se los dejó sin sucursal (o no había).
 * @returns {void}
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

	if (rootState.employee && Array.isArray(rootState.employee.models) && rootState.employee.models.length) {
		Promise.resolve(dispatch('employee/getModels', null, { root: true }))
		.catch(err => {
			console.log(err)
		})
	}
}

/**
 * Vuelve a pedir lo que la API tocó al pasar las cajas, los puntos de venta ARCA, los clientes y
 * las marcas de una sucursal eliminada a otra sucursal (o a "todas").
 *
 * Sin esto, después del borrado esos stores seguían con el `address_id` viejo: lo que más duele
 * son las cajas, porque `get_caja_options` (mixins/generals.js) descarta las que apuntan a una
 * sucursal que no es la de Vender, y una caja que quedó apuntando a la sucursal muerta
 * desaparecía de Vender hasta recargar la página con F5. Los puntos de venta (`afip_information`)
 * y los métodos de pago por defecto de cada caja (`default_payment_method_caja`) tienen el mismo
 * problema; las marcas (depósito por defecto / madre / de origen) están en la propia `address`.
 * No se pide `client`: no se baja al arrancar, lo pide cada pantalla que lo usa.
 *
 * Todo SIN esperar y con el error mudo: el borrado ya salió bien, y si una recarga falla no hay
 * nada que hacerle saber al usuario (el próximo arranque lo corrige).
 *
 * `address/getModels` y no `_getModels`: el primero es el pedido de siempre del store y también
 * limpia el filtro y la selección del listado de sucursales del ABM, que es lo que se espera
 * después de un borrado. La sucursal eliminada ya no viene en la respuesta de la API, así que no
 * reaparece.
 *
 * @param {Object} contexto Contexto de Vuex (dispatch).
 * @returns {void}
 */
address_store.actions.recargar_configuracion_de_sucursales = function ({ dispatch }) {
	let stores = ['address', 'caja', 'afip_information', 'default_payment_method_caja']

	stores.forEach(store => {
		// dispatch devuelve undefined (no una promesa) si la acción no existe: Promise.resolve lo cubre
		Promise.resolve(dispatch(store + '/getModels', null, { root: true }))
		.catch(err => {
			console.log(err)
		})
	})
}

export default address_store

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
		// Solo se apagan las que hoy tienen el tilde: la clave ya existe en el objeto y la
		// asignación directa es reactiva (no hace falta Vue.set).
		if (sucursal && sucursal.id != value.id && sucursal.es_deposito_madre) {
			sucursal.es_deposito_madre = 0
		}
	})
}

export default address_store

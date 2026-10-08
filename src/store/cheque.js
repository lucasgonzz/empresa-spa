import Vue from 'vue'
import axios from 'axios'
import __base_store from '@/store/__base_store'

/**
 * Store de cheques (modelo `cheque`) construido desde el factory común.
 *
 * Misión cheques-solapa-endosados (2/10/2026): se agregan tres piezas propias que el factory no
 * trae, todas para que un filtro u orden de columna se aplique SOBRE la solapa en la que está
 * parado el usuario (Recibido / Emitido / Endosado + su estado) y no sobre todos los cheques:
 *
 *   - mutación `limpiar_orden_de_columnas`: apaga la flecha de orden de todas las columnas.
 *   - acción `reiniciar_busqueda_de_columnas`: deja la búsqueda en cero (criterios, orden y
 *     resultados), para "Limpiar filtros" y para cuando se cambia de solapa.
 *   - acción `restringir_a_ids`: escribe en `extra_filters_de_barra` el filtro `in` con los ids
 *     de la solapa, que `runGlobalSearch` agrega a CADA request.
 *
 * El módulo que las usa es components/cheques/Index.vue (ver ahí cómo se orquestan).
 */
export default __base_store({
	state: {
		model_name: 'cheque',
	},
	mutations: {
		/**
		 * Pisa la mutación `add` del factory con un no-op.
		 *
		 * Misión cheque-edicion-acotada (8/10/2026): al guardar el formulario del cheque, el
		 * modal genérico hace `commit('cheque/add', model)`. La `add` del factory hace
		 * `state.models.findIndex(...)`, pero en este store `state.models` NO es un array: es el
		 * objeto agrupado `{recibido: {...}, emitido: {...}}` que devuelve `GET cheque`. Con eso
		 * tiraba un TypeError dentro del `.then` del guardado, que caía al `.catch` y le mostraba
		 * un error a alguien cuyo guardado había salido bien.
		 *
		 * No-op a propósito: la lista se refresca con la acción `cheque/getModels`, que las vistas
		 * le pasan al modal en `actions_after_save` (views/Cheques.vue y views/Reportes.vue). Así,
		 * además, un cheque al que le cambiaron la fecha de pago cambia de solapa.
		 *
		 * @returns {void}
		 */
		add() {},
		/**
		 * Apaga el orden de TODAS las columnas (deja `ordenar_de` en null), sin tocar los
		 * criterios de valor ni sacar ningún filtro del array.
		 *
		 * Es la pieza que le faltaba a `limpiar_criterios_de_columna` del factory, que por
		 * diseño NO toca el orden ("ordenar no es filtrar", ver su documentación). Acá sí hace
		 * falta: al limpiar la búsqueda o cambiar de solapa la flecha de orden no puede quedar
		 * prendida, porque el próximo filtro reenviaría ese orden viejo en silencio.
		 *
		 * 🔴 Va con `Vue.set` y no con `filter.ordenar_de = null`, por precaución.
		 * `build_table_filters_from_props` (common-vue/mixins/generals.js) NO declara
		 * `ordenar_de` al construir los filtros: la propiedad nace recién cuando el usuario
		 * ordena (Ordenar.vue) y, según cómo haya llegado el filtro al array, puede existir
		 * como propiedad reactiva o no existir. Una asignación directa solo notifica en el
		 * primer caso; `Vue.set` cubre los dos (la define reactiva si faltaba y, si ya
		 * existía, es una asignación común) y deja la flecha de la columna apagándose siempre.
		 *
		 * @param {Object} state Estado del módulo.
		 * @returns {void}
		 */
		limpiar_orden_de_columnas(state) {
			state.filters.forEach(filter => {
				Vue.set(filter, 'ordenar_de', null)
			})
		},
	},
	actions: {
		/**
		 * Pisa la acción `delete` del factory: borra el cheque y recarga la lista agrupada.
		 *
		 * Misión cheque-edicion-acotada (8/10/2026): el botón Eliminar del modal del cheque llega
		 * acá (Confirm.vue → `cheque/delete`). La del factory, tras el DELETE, hace
		 * `commit('delete')`, cuya mutación busca el cheque con `state.models.findIndex(...)`: con el
		 * objeto agrupado `{recibido: {...}, emitido: {...}}` eso es un TypeError. El cheque ya estaba
		 * borrado en el servidor, pero el usuario ve "Error al ejecutar la acción", el modal queda
		 * abierto y la tabla sigue mostrando el cheque. Misma raíz que la mutación `add` de arriba.
		 *
		 * Lee `state.delete`, que deja puesto la mutación `setDelete` del factory, igual que la base.
		 *
		 * @param {Object} context state, dispatch
		 * @returns {Promise}
		 */
		delete({ state, dispatch }) {
			return axios.delete('/api/cheque/' + state.delete.id)
			.then(() => {
				return dispatch('getModels')
			})
			.catch((err) => {
				console.log(err)
				return Promise.reject(err)
			})
		},
		/**
		 * Deja la búsqueda de columnas en cero: sin criterios de valor, sin orden y sin
		 * resultados. La tabla vuelve a mostrar la lista de la solapa tal cual viene de
		 * GET cheque.
		 *
		 * La usan "Limpiar filtros" (NavFiltrados.vue) y el cambio de solapa o de módulo
		 * (components/cheques/Index.vue, views/Cheques.vue).
		 *
		 * 🔴 NO toca `extra_filters_de_barra`. Ese filtro es la restricción a los ids de la
		 * solapa y lo mantiene sincronizado components/cheques/Index.vue: sacarlo acá dejaría
		 * al próximo orden o filtro de columna buscando en TODOS los cheques, que es justo el
		 * defecto que esta misión arregla.
		 *
		 * 🔴 Incrementa `consulta_vigente_token` (la guarda de carrera del factory, que no se
		 * modifica) antes de limpiar. Sin eso, una búsqueda que ya salió hacia la API cuando el
		 * usuario cambió de solapa o apretó "Limpiar filtros" llega después y vuelve a poner
		 * `is_filtered = true` con resultados de la solapa anterior. El incremento hace que esa
		 * respuesta se descarte al llegar. Es lo mismo que hace `getModels` del factory.
		 *
		 * @param {Object} context commit
		 * @returns {void}
		 */
		reiniciar_busqueda_de_columnas({commit}) {
			// Cualquier búsqueda en vuelo deja de ser la intención vigente.
			commit('incrementar_consulta_vigente_token')

			// Criterios de valor y orden de todas las columnas (en el lugar, sin sacar filtros:
			// si no, se caería el resaltado de las lupas y se reconstruirían las plantillas).
			commit('limpiar_criterios_de_columna')
			commit('limpiar_orden_de_columnas')

			// Resultados y paginación de la búsqueda: la tabla vuelve a la lista de la solapa.
			//
			// 🔴 NO se vuelve a la página 1 (`setFilterPage`). Ese número lo lee la barra de
			// paginación de la tabla con un watcher que, al cambiar, lanza una búsqueda nueva: con el
			// usuario parado en la página 2 o más, "Limpiar filtros" o cambiar de solapa dispararía
			// una búsqueda fantasma que vuelve a prender el filtro con los resultados recortados.
			// No hace falta resetearla: toda búsqueda nueva (`filtrar` de la tabla, o la que
			// re-ejecuta components/cheques/Index.vue) pide explícitamente `page: 1`.
			commit('setIsFiltered', false)
			commit('setFiltered', [])
			commit('setTotalFilterPages', null)
			commit('setTotalFilterResults', 0)
		},
		/**
		 * Restringe toda búsqueda de columna a una lista de ids, escribiendo el filtro extra
		 * `{ key: 'id', operator: 'in', value: ids }` en `extra_filters_de_barra`.
		 *
		 * `runGlobalSearch` (factory) lee ese state en cada request y lo suma a los
		 * `extra_filters` que manda a `POST global-search/cheque`, así que un filtro o un orden
		 * de columna se aplica solo sobre esos cheques. El operador `in` lo resuelve
		 * `ExtraFiltersHelper` de empresa-api: con una lista vacía devuelve 0 filas (una solapa
		 * vacía filtrada muestra la tabla vacía, no todos los cheques).
		 *
		 * Reemplaza y no acumula: la solapa es la única fuente de verdad de esta restricción.
		 *
		 * @param {Object} context commit
		 * @param {Object} payload
		 * @param {Array<Number>} payload.ids Ids de los cheques de la solapa vigente. Cualquier
		 *   cosa que no sea un array se toma como lista vacía.
		 * @returns {void}
		 */
		restringir_a_ids({commit}, payload) {
			/** Ids a los que se acota la búsqueda (copia, para no compartir el array del que llama). */
			let ids = (payload && Array.isArray(payload.ids)) ? payload.ids.slice() : []
			commit('set_extra_filters_de_barra', [
				{key: 'id', operator: 'in', value: ids},
			])
		},
	},
})

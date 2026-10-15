import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/**
 * Edición del stock por depósito desde la fila del listado (botón verde de la columna Stock).
 *
 * 🔴 Lo que el usuario tipea vive ACÁ, no en `article.addresses` de la fila (misión
 * stock-sucursal-desde-listado, 14/10/2026). Antes los inputs hacían v-model directo al pivot del
 * artículo de la fila, así que:
 *   - al guardar se mandaban TODAS las sucursales con lo que había en pantalla (aunque fuera de hace
 *     horas), y eso deshacía un traslado que otro empleado había hecho en el medio;
 *   - al cancelar, lo tipeado quedaba escrito en la fila y la celda mostraba un stock que nunca se
 *     guardó.
 * Con el estado acá, la fila muestra siempre lo real y al guardar se comparan los renglones contra
 * `originales` para mandar solo lo que el usuario cambió.
 */
export default {
	namespaced: true,
	state: {
		/*
			Artículo de la fila que está en edición (o null). Se compara SIEMPRE por id: la fila puede
			re-renderizarse con otro objeto (un loadModel, un reload del listado) sin que eso cierre la
			edición. StockBtn.vue lo lee para deshabilitar el botón azul mientras se edita.
		*/
		article: null,

		/*
			Un renglón por sucursal del comercio (store `address`), con la misma forma que espera
			`PUT article-update-addresses`: { id, pivot: { amount, stock_min, stock_max } }.
			Los inputs de EditAddressStock.vue hacen v-model contra estos renglones.
		*/
		addresses: [],

		/*
			Lo que había en cada sucursal al ABRIR la edición, por id de sucursal:
			{ amount, stock_min, stock_max }. `amount` es null si el artículo no tenía fila en esa
			sucursal. Se usa para saber qué cambió y para mandar `pivot.amount_original`.
		*/
		originales: {},

		/*
			Id del artículo cuyo stock se está trayendo para abrir la edición (o null). Mientras está
			seteado, el botón de entrar de esa fila no se muestra: así un segundo click no dispara un
			segundo pedido.
		*/
		trayendo_article_id: null,

		/*
			Prendido mientras viaja el PUT de guardar. Un segundo click en "Guardar stock" con el
			primero en vuelo se ignora: si salía igual, llegaba después de que el primero ya había
			escrito y la API le contestaba 409 "No se guardó ningún cambio" sobre algo que sí se
			guardó.
		*/
		guardando: false,
	},
	mutations: {
		set_article(state, value) {
			state.article = value 
		},
		/**
		 * Abre la edición de un artículo con sus renglones y lo que había al abrir.
		 *
		 * @param {Object} state
		 * @param {Object} value { article, addresses, originales }
		 */
		iniciar_edicion(state, value) {
			state.addresses = value.addresses
			state.originales = value.originales
			state.article = value.article
		},
		/**
		 * Cierra la edición y descarta lo tipeado. La fila vuelve a mostrar su stock real porque
		 * nunca se escribió nada en ella.
		 *
		 * También la llama views/Listado.vue al salir de la vista: sin eso, al volver horas
		 * después la fila seguía en edición con originales viejos y el botón azul de ese
		 * artículo quedaba deshabilitado (también en el modal del artículo). Por eso borra
		 * además la marca de "trayendo": un GET de apertura que vuelva después de salir no abre
		 * nada.
		 *
		 * @param {Object} state
		 */
		limpiar_edicion(state) {
			state.article = null
			state.addresses = []
			state.originales = {}
			state.guardando = false
			state.trayendo_article_id = null
		},
		set_trayendo_article_id(state, value) {
			state.trayendo_article_id = value
		},
		set_guardando(state, value) {
			state.guardando = value
		},
		setLoading(state, value) {
			state.loading = value 
		},
	},
	actions: {
		getModels({state, commit}, article) {
			commit('setLoading', true)
			return axios.get('api/stock-movement/'+article.id)
			.then(res => {
				commit('setLoading', false)
				commit('setModels', res.data.models) 
			})
			.catch(err => {
				commit('setLoading', false)
			})
		}
	}
}
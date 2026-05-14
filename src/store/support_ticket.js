import __base_store from '@/store/__base_store'
import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default __base_store({
	/**
	 * Estado principal del módulo de tickets de soporte.
	 */
	state: {
		model_name: 'support_ticket',
		use_per_page: false,
	},
	mutations: {
		/**
		 * Inserta o actualiza un ticket en la bandeja a partir de datos realtime o respuesta de API.
		 * Ordena por updated_at descendente para acercar lo último a lo primero.
		 */
		upsertFromBroadcast(state, ticket) {
			if (!ticket || !ticket.id) {
				return
			}
			const tid = ticket.id
			let idx = -1
			let i = 0
			for (i = 0; i < state.models.length; i = i + 1) {
				if (state.models[i].id == tid) {
					idx = i
					break
				}
			}
			if (idx >= 0) {
				state.models.splice(idx, 1, Object.assign({}, state.models[idx], ticket))
			} else {
				state.models.push(ticket)
			}
			const sorted = state.models.slice().sort(function (a, b) {
				const da = a.updated_at ? new Date(a.updated_at).getTime() : 0
				const db = b.updated_at ? new Date(b.updated_at).getTime() : 0
				return db - da
			})
			state.models = sorted
		},
	},
	actions: {
		/**
		 * Actualiza la lista lateral a partir de un SupportMessage (con relación ticket cargada vía Pusher/HTTP).
		 */
		applyTicketFromMessage({ commit }, message) {
			if (!message || !message.ticket) {
				return
			}
			commit('upsertFromBroadcast', message.ticket)
		},
		/**
		 * Cierra o reabre un ticket desde la UI de soporte.
		 */
		updateStatus({ dispatch, commit }, payload) {
			// Construye payload de actualización con nombre opcional.
			let request_payload = {
				status: payload.status,
				name: payload.name,
			}
			// Persiste cambios de ticket vía endpoint dedicado.
			return axios.put('/api/support-ticket/' + payload.id, request_payload)
				.then(response => {
					if (response.data && response.data.model) {
						commit('upsertFromBroadcast', response.data.model)
					} else {
						return dispatch('getModels')
					}
				})
				.catch(error => {
					console.log(error)
				})
		},
		/**
		 * Crea o reutiliza el ticket abierto del usuario (POST /api/support-ticket).
		 * Actualiza la bandeja local con upsertFromBroadcast.
		 *
		 * @returns {Promise<Object|null>} Modelo del ticket o null si falla la respuesta.
		 */
		createOpenTicket({ commit }) {
			return axios
				.post('/api/support-ticket')
				.then(function (response) {
					if (response.data && response.data.model) {
						commit('upsertFromBroadcast', response.data.model)
						return response.data.model
					}
					return null
				})
				.catch(function (error) {
					console.log(error)
					return null
				})
		},
	},
})


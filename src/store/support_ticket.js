import __base_store from '@/store/__base_store'
import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

function marca_de_mensaje(fecha) {
	return Date.parse(fecha) || 0
}

function fecha_mas_reciente(anterior, nueva) {
	return marca_de_mensaje(nueva) > marca_de_mensaje(anterior) ? nueva : anterior
}

function fecha_del_ultimo_mensaje(ticket) {
	if (ticket.last_message_at) return ticket.last_message_at
	let ultima = null
	for (const mensaje of ticket.messages || []) {
		ultima = fecha_mas_reciente(ultima, mensaje.created_at)
	}
	return ultima
}

function por_ultimo_mensaje(a, b) {
	return marca_de_mensaje(fecha_del_ultimo_mensaje(b)) - marca_de_mensaje(fecha_del_ultimo_mensaje(a)) || b.id - a.id
}

function conservar_fecha_y_numero(anterior, ticket) {
	if (!anterior) return ticket
	return Object.assign({}, ticket, {
		last_message_at: fecha_mas_reciente(fecha_del_ultimo_mensaje(anterior), fecha_del_ultimo_mensaje(ticket)),
		admin_ticket_id: ticket.admin_ticket_id || anterior.admin_ticket_id,
	})
}

export default __base_store({
	/**
	 * Estado principal del módulo de tickets de soporte.
	 */
	state: {
		model_name: 'support_ticket',
		use_per_page: false,
	},
	mutations: {
		setModels(state, tickets) {
			const anteriores = new Map(state.models.map(ticket => [String(ticket.id), ticket]))
			state.models = (tickets || [])
				.map(ticket => conservar_fecha_y_numero(anteriores.get(String(ticket.id)), ticket))
				.sort(por_ultimo_mensaje)
		},
		/**
		 * Inserta o actualiza un ticket en la bandeja a partir de datos realtime o respuesta de API.
		 * Solo un mensaje nuevo puede cambiar la posición de un ticket conocido.
		 */
		upsertFromBroadcast(state, ticket) {
			if (!ticket || !ticket.id) {
				return
			}
			const idx = state.models.findIndex(modelo => modelo.id == ticket.id)
			if (idx >= 0) {
				const anterior = state.models[idx]
				state.models.splice(idx, 1, Object.assign({}, anterior, conservar_fecha_y_numero(anterior, ticket)))
			} else {
				state.models.push(ticket)
			}
			state.models.sort(por_ultimo_mensaje)
		},
	},
	actions: {
		getAgentes({ commit, state, rootState }) {
			commit('incrementar_descarga_de_models_token')
			const token = state.descarga_de_models_token
			const usuario = rootState.auth.user
			const vigente = () => state.descarga_de_models_token === token && rootState.auth.user === usuario
			commit('setLoading', true)
			return axios.get('/api/support-ticket', { params: { agentes: 1 }, skip_navigation_cancel: true })
				.then(res => {
					if (vigente()) commit('setModels', res.data.models)
				})
				.catch(error => console.log(error))
				.finally(() => {
					if (state.descarga_de_models_token === token) commit('setLoading', false)
				})
		},
		/**
		 * Actualiza la lista lateral a partir de un SupportMessage (con relación ticket cargada vía Pusher/HTTP).
		 */
		applyTicketFromMessage({ commit }, message) {
			if (!message || !message.ticket) {
				return
			}
			const ticket = message.ticket
			const last_message_at = fecha_mas_reciente(fecha_del_ultimo_mensaje(ticket), message.created_at)
			commit('upsertFromBroadcast', Object.assign({}, ticket, { last_message_at }))
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


import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	/**
	 * Estado del panel de conversación de soporte.
	 */
	state: {
		active_ticket_id: null,
		models: [],
		sending: false,
	},
	mutations: {
		/**
		 * Define ticket seleccionado en el panel de soporte.
		 */
		setActiveTicketId(state, value) {
			state.active_ticket_id = value
		},
		/**
		 * Reemplaza mensajes visibles para ticket activo.
		 */
		setModels(state, value) {
			state.models = value || []
		},
		/**
		 * Agrega mensaje nuevo en tiempo real al final de la conversación.
		 */
		addModel(state, value) {
			state.models.push(value)
		},
		/**
		 * Marca estado de envío de mensaje.
		 */
		setSending(state, value) {
			state.sending = value
		},
	},
	actions: {
		/**
		 * Carga ticket y actualiza lista de mensajes visibles.
		 */
		loadTicketMessages({ commit }, ticket_id) {
			// Guarda ticket activo para posteriores envíos.
			commit('setActiveTicketId', ticket_id)
			// Consulta ticket con historial de mensajes embebido.
			return axios.get('/api/support-ticket/' + ticket_id)
			.then(response => {
				// Normaliza arreglo de mensajes para render.
				let messages = []
				if (response.data.model && response.data.model.messages) {
					messages = response.data.model.messages
				}
				commit('setModels', messages)
				// Marca como leídos los mensajes de admin aún no leídos.
				messages.forEach(message => {
					if (message.sender_type == 'admin' && !message.read_at) {
						axios.post('/api/support-message/' + message.id + '/mark-read')
					}
				})
			})
			.catch(error => {
				console.log(error)
			})
		},
		/**
		 * Envía un mensaje al ticket activo o abre ticket implícitamente.
		 */
		sendMessage({ commit, state }, payload) {
			// Activa estado visual de envío mientras responde backend.
			commit('setSending', true)
			// Construye request para endpoint de soporte.
			let form_data = new FormData()
			form_data.append('body', payload.body || '')
			form_data.append('kind', payload.kind || 'text')
			if (state.active_ticket_id) {
				form_data.append('support_ticket_id', state.active_ticket_id)
			}
			if (payload.attachment) {
				form_data.append('attachment', payload.attachment)
			}

			return axios.post('/api/support-message', form_data)
			.then(response => {
				commit('setSending', false)
				// Inserta mensaje recién creado en la conversación activa.
				commit('addModel', response.data.model)
			})
			.catch(error => {
				commit('setSending', false)
				console.log(error)
			})
		},
		/**
		 * Reporta estado de escritura del usuario en ticket activo.
		 */
		sendTyping({ state }) {
			if (!state.active_ticket_id) {
				return Promise.resolve()
			}
			return axios.post('/api/support-message/typing', {
				support_ticket_id: state.active_ticket_id,
			})
		},
	},
}


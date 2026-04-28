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
		/**
		 * GET conversación del ticket activo (spinner en Conversation).
		 */
		messages_loading: false,
	},
	mutations: {
		/**
		 * Define ticket seleccionado en el panel de soporte.
		 */
		setActiveTicketId(state, value) {
			state.active_ticket_id = value
		},
		/**
		 * Activa/desactiva spinner sobre la ventana de mensajes.
		 */
		setMessagesLoading(state, value) {
			state.messages_loading = value
		},
		/**
		 * Reemplaza mensajes visibles para ticket activo.
		 */
		setModels(state, value) {
			state.models = value || []
		},
		/**
		 * Cola visual de envío antes de confirmar por API.
		 */
		pushPendingMessage(state, value) {
			if (!value || !value._client_pending) {
				return
			}
			state.models.push(value)
		},
		/**
		 * Elimina fila optimista si falla el envío.
		 */
		removePendingMessage(state, client_key) {
			let i = state.models.length - 1
			while (i >= 0) {
				if (state.models[i]._client_pending === client_key) {
					state.models.splice(i, 1)
				}
				i = i - 1
			}
		},
		/**
		 * Sustituye la fila optimista por el modelo persistido.
		 */
		replacePendingWithModel(state, payload) {
			const client_key = payload.client_key
			const model = payload.model
			if (!model || model.id == null) {
				return
			}
			let idx = -1
			let j = 0
			for (j = 0; j < state.models.length; j = j + 1) {
				if (state.models[j]._client_pending === client_key) {
					idx = j
					break
				}
			}
			if (idx >= 0) {
				state.models.splice(idx, 1, model)
			} else {
				// El broadcast pudo llegar antes: deduplicar por id.
				let exists = false
				state.models.forEach(function (existing) {
					if (existing.id == model.id) {
						exists = true
					}
				})
				if (!exists) {
					state.models.push(model)
				}
			}
		},
		/**
		 * Actualiza read_at tras evento SupportMessageRead.
		 */
		patchMessageRead(state, incoming) {
			if (!incoming) {
				return
			}
			// id preferido; uuid como respaldo por si el payload llega sin id numérico.
			const target_id = incoming.id
			const target_uuid = incoming.uuid
			let k = 0
			for (k = 0; k < state.models.length; k = k + 1) {
				const row = state.models[k]
				const id_match = target_id != null && row.id == target_id
				const uuid_match = target_uuid && row.uuid == target_uuid
				if (id_match || uuid_match) {
					const cur = state.models[k]
					const merged = Object.assign({}, cur, {
						read_at: incoming.read_at,
					})
					if (incoming.id != null) {
						merged.id = incoming.id
					}
					if (incoming.uuid) {
						merged.uuid = incoming.uuid
					}
					state.models.splice(k, 1, merged)
					return
				}
			}
		},
		/**
		 * Agrega mensaje nuevo en tiempo real al final de la conversación.
		 * Ignora duplicados por id: al enviar desde la SPA el POST ya inserta
		 * el modelo y el broadcast SupportMessageReceived vuelve a disparar addModel.
		 */
		addModel(state, value) {
			if (!value || value.id == null) {
				return
			}
			// Llegó el registro real: quita optimista del mismo cuerpo en el mismo ticket.
			if (value.support_ticket_id) {
				let n = state.models.length - 1
				while (n >= 0) {
					const m = state.models[n]
					if (m._client_pending && m.support_ticket_id == value.support_ticket_id && m.body == value.body) {
						state.models.splice(n, 1)
					}
					n = n - 1
				}
			}
			let merge_idx = -1
			let idx_check = 0
			for (idx_check = 0; idx_check < state.models.length; idx_check = idx_check + 1) {
				if (state.models[idx_check].id == value.id) {
					merge_idx = idx_check
					break
				}
			}
			if (merge_idx >= 0) {
				state.models.splice(merge_idx, 1, Object.assign({}, state.models[merge_idx], value))
				return
			}
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
		loadTicketMessages({ commit, dispatch }, ticket_id) {
			commit('setActiveTicketId', ticket_id)
			commit('setModels', [])
			commit('setMessagesLoading', true)
			return axios
				.get('/api/support-ticket/' + ticket_id)
				.then(function (response) {
					let messages = []
					if (response.data.model && response.data.model.messages) {
						messages = response.data.model.messages
					}
					commit('setModels', messages)
					commit('setMessagesLoading', false)
					// Tras marcar leído en API, se refresca la bandeja para alinear contadores (badge, sidebar).
					const marks = []
					messages.forEach(function (message) {
						if (message.sender_type == 'admin' && !message.read_at) {
							marks.push(axios.post('/api/support-message/' + message.id + '/mark-read'))
						}
					})
					if (marks.length) {
						return Promise.all(marks).then(function () {
							return dispatch('support_ticket/getModels', null, { root: true })
						})
					}
					return null
				})
				.catch(function (error) {
					commit('setMessagesLoading', false)
					console.log(error)
				})
		},
		/**
		 * Envía un mensaje al ticket activo o abre ticket implícitamente.
		 */
		sendMessage({ commit, state, dispatch }, payload) {
			commit('setSending', true)
			const client_key = 'c' + String(Date.now()) + '-' + String(Math.random()).slice(2, 8)
			const body_text = (payload.body && String(payload.body).trim()) || ''
			const kind_val = payload.kind || 'text'
			const opt_ticket = state.active_ticket_id
			commit('pushPendingMessage', {
				_client_pending: client_key,
				support_ticket_id: opt_ticket,
				sender_type: 'user',
				kind: kind_val,
				body: body_text,
				_attachment_pending: payload.attachment ? true : false,
			})
			let form_data = new FormData()
			form_data.append('body', payload.body || '')
			form_data.append('kind', kind_val)
			if (state.active_ticket_id) {
				form_data.append('support_ticket_id', state.active_ticket_id)
			}
			if (payload.attachment) {
				form_data.append('attachment', payload.attachment)
			}
			return axios
				.post('/api/support-message', form_data)
				.then(response => {
					commit('setSending', false)
					commit('replacePendingWithModel', { client_key: client_key, model: response.data.model })
					if (response.data && response.data.model) {
						dispatch('support_ticket/applyTicketFromMessage', response.data.model, { root: true })
					}
				})
				.catch(error => {
					commit('setSending', false)
					commit('removePendingMessage', client_key)
					console.log(error)
				})
		},
		/**
		 * Reporta estado de escritura del usuario en ticket activo.
		 */
		/**
		 * Typing desactivado: no se persiste ni se llama al API (requisito producto).
		 */
		sendTyping() {
			return Promise.resolve()
		},
	},
}

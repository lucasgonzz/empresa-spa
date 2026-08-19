import actualizar_lista_de_articulos from '@/mixins/listado/actualizar_lista_de_articulos'
export default {
	mixins: [
		actualizar_lista_de_articulos,
	],
	methods: {
		update_articles_after_import() {
			// this.$store.dispatch('article/getModels')
			this.$store.dispatch('category/getModels')
			this.$store.dispatch('sub_category/getModels')
			this.$store.dispatch('provider/getModels')
			this.get_ultimos_articulos_actualizados()
		},
		update_clients_after_import() {
			this.$store.dispatch('client/getModels')
		},
		update_provider_after_import() {
			this.$store.dispatch('provider/getModels')
		},
		recargar_pagina() {
			window.location.reload()
		},
		/**
		 * Abre el modal de historial de actualizaciones masivas (listado / artículos).
		 */
		open_masive_update_history() {
			this.$bvModal.show('masive-update-history')
		},
		/**
		 * Refresca el listado de artículos (filtrado o completo) tras actualización/reversión masiva.
		 */
		refresh_articles_after_masive_update() {
			if (!this.$store.state.article) {
				return
			}

			this.$store.commit('auth/setMessage', 'Actualizando listado de artículos')
			this.$store.commit('auth/setLoading', true)

			let refresh_promise
			if (this.$store.state.article.is_filtered) {
				refresh_promise = this.$store.dispatch('article/runFilter', { page: 1 })
			} else {
				refresh_promise = this.$store.dispatch('article/getModels')
			}

			let clear_loading = () => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			}

			if (refresh_promise && typeof refresh_promise.then === 'function') {
				refresh_promise.then(clear_loading).catch(clear_loading)
			} else {
				clear_loading()
			}
		},
		/**
		 * Abre el detalle de la sugerencia de stock que la notificacion global anuncia
		 * como lista (extension sugerencias_inteligentes). El id viaja en el
		 * info_to_show del payload: se acepta tanto una clave stock_suggestion_id
		 * explicita como un value numerico, y si no se encuentra ninguno se cae al
		 * listado, que siempre es un destino valido.
		 */
		ir_a_sugerencias_de_stock() {
			let id = null
			let info_to_show = this.$store.state.global_notification.info_to_show

			if (Array.isArray(info_to_show)) {
				info_to_show.forEach(info => {
					if (!id && info) {
						if (info.stock_suggestion_id) {
							id = info.stock_suggestion_id
						} else if (info.value && !isNaN(Number(info.value))) {
							id = Number(info.value)
						}
					}
				})
			}

			if (id) {
				// Si ya se esta mirando ese detalle, no hay adonde ir (y el push
				// duplicado tiraria NavigationDuplicated).
				if (this.$route.name == 'sugerencias_stock' && this.$route.params.id == '' + id) {
					return
				}
				this.$router.push({name: 'sugerencias_stock', params: {id: '' + id}})
			} else if (this.$route.name != 'sugerencias_stock' || this.$route.params.id) {
				this.$router.push({name: 'sugerencias_stock'})
			}
		},
		/**
		 * Boton "Charlar con la IA" de la notificacion de sugerencia lista (D21/D22).
		 * Lee de info_to_show los ids que ProcessStockSuggestionChunkJob suma cuando
		 * existe conversacion. La conversacion de una sugerencia se crea para el
		 * DUEÑO (D25): si quien mira la notificacion es otra persona, se cae a la
		 * vista de sugerencias sin pedirle nada al servidor (el indice del chat
		 * igual no se la devolveria: la tenencia es por persona).
		 */
		abrir_conversacion_de_sugerencia() {
			let conversation_id = null
			let auth_user_id = null
			let info_to_show = this.$store.state.global_notification.info_to_show

			if (Array.isArray(info_to_show)) {
				info_to_show.forEach(info => {
					if (info) {
						if (!conversation_id && info.ai_conversation_id) {
							conversation_id = info.ai_conversation_id
						}
						if (!auth_user_id && info.ai_conversation_auth_user_id) {
							auth_user_id = info.ai_conversation_auth_user_id
						}
					}
				})
			}

			if (!conversation_id || !this.user || Number(auth_user_id) !== Number(this.user.id)) {
				this.ir_a_sugerencias_de_stock()
				return
			}

			this.abrir_chat_ia(conversation_id)
		},
		/**
		 * Abre el detalle de la sugerencia de compra que la notificacion global anuncia
		 * como lista (extension sugerencias_compras). Mismo patron que
		 * ir_a_sugerencias_de_stock(): el id viaja en el info_to_show del payload, se
		 * acepta tanto la clave purchase_suggestion_id explicita como un value
		 * numerico, y si no se encuentra ninguno se cae al listado, que siempre es
		 * un destino valido.
		 */
		ir_a_sugerencias_de_compra() {
			let id = null
			let info_to_show = this.$store.state.global_notification.info_to_show

			if (Array.isArray(info_to_show)) {
				info_to_show.forEach(info => {
					if (!id && info) {
						if (info.purchase_suggestion_id) {
							id = info.purchase_suggestion_id
						} else if (info.value && !isNaN(Number(info.value))) {
							id = Number(info.value)
						}
					}
				})
			}

			if (id) {
				// Si ya se esta mirando ese detalle, no hay adonde ir (y el push
				// duplicado tiraria NavigationDuplicated).
				if (this.$route.name == 'sugerencias_compra' && this.$route.params.id == '' + id) {
					return
				}
				this.$router.push({name: 'sugerencias_compra', params: {id: '' + id}})
			} else if (this.$route.name != 'sugerencias_compra' || this.$route.params.id) {
				this.$router.push({name: 'sugerencias_compra'})
			}
		},
		/**
		 * Boton "Charlar con la IA" de la notificacion de sugerencia de compra lista
		 * (mismo D21/D22 que stock). Lee de info_to_show los ids que
		 * ProcessPurchaseSuggestionChunkJob suma cuando existe conversacion. La
		 * conversacion de una sugerencia se crea para el DUEÑO: si quien mira la
		 * notificacion es otra persona, se cae a la vista de sugerencias de compra
		 * sin pedirle nada al servidor (el indice del chat igual no se la
		 * devolveria: la tenencia es por persona).
		 */
		abrir_conversacion_de_sugerencia_compra() {
			let conversation_id = null
			let auth_user_id = null
			let info_to_show = this.$store.state.global_notification.info_to_show

			if (Array.isArray(info_to_show)) {
				info_to_show.forEach(info => {
					if (info) {
						if (!conversation_id && info.ai_conversation_id) {
							conversation_id = info.ai_conversation_id
						}
						if (!auth_user_id && info.ai_conversation_auth_user_id) {
							auth_user_id = info.ai_conversation_auth_user_id
						}
					}
				})
			}

			if (!conversation_id || !this.user || Number(auth_user_id) !== Number(this.user.id)) {
				this.ir_a_sugerencias_de_compra()
				return
			}

			this.abrir_chat_ia(conversation_id)
		},
		/**
		 * Abre el detalle de la corrida de ofertas que la notificacion anuncia como
		 * lista. Molde de ir_a_sugerencias_de_compra(): el id viaja en info_to_show
		 * (clave offer_suggestion_id o un value numerico) y sin id se cae al
		 * listado. El NOMBRE del metodo es el contrato con el backend: es el
		 * function_name que manda ProcessOfferSuggestionChunkJob, y renombrarlo aca
		 * deja el boton de la notificacion sin hacer nada.
		 */
		ir_a_ofertas() {
			let id = null
			let info_to_show = this.$store.state.global_notification.info_to_show
			if (Array.isArray(info_to_show)) {
				info_to_show.forEach(info => {
					if (!id && info) {
						if (info.offer_suggestion_id) {
							id = info.offer_suggestion_id
						} else if (info.value && !isNaN(Number(info.value))) {
							id = Number(info.value)
						}
					}
				})
			}
			if (id) {
				// Ya parado en ese detalle no hay adonde ir (el push duplicado tiraria NavigationDuplicated).
				if (this.$route.name == 'ofertas' && this.$route.params.id == '' + id) {
					return
				}
				this.$router.push({name: 'ofertas', params: {id: '' + id}})
			} else if (this.$route.name != 'ofertas' || this.$route.params.id) {
				this.$router.push({name: 'ofertas'})
			}
		},
		/**
		 * Boton "Charlar con la IA" de la notificacion de ofertas listas. La
		 * conversacion se crea para el DUEÑO: si la mira otra persona, se cae a la
		 * vista de ofertas sin pedirle nada al servidor (el indice del chat igual
		 * no se la devolveria: la tenencia es por persona).
		 */
		abrir_conversacion_de_oferta() {
			let conversation_id = null
			let auth_user_id = null
			let info_to_show = this.$store.state.global_notification.info_to_show
			if (Array.isArray(info_to_show)) {
				info_to_show.forEach(info => {
					if (info) {
						if (!conversation_id && info.ai_conversation_id) {
							conversation_id = info.ai_conversation_id
						}
						if (!auth_user_id && info.ai_conversation_auth_user_id) {
							auth_user_id = info.ai_conversation_auth_user_id
						}
					}
				})
			}
			if (!conversation_id || !this.user || Number(auth_user_id) !== Number(this.user.id)) {
				this.ir_a_ofertas()
				return
			}
			this.abrir_chat_ia(conversation_id)
		},
	}
}
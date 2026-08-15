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
	}
}
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
	}
}
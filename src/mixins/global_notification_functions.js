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
	}
}
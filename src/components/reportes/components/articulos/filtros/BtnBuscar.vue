<template>
	<b-button
	block
	@click="buscar"
	variant="primary"> 
		Buscar
	</b-button>
</template>
<script>
export default {
	computed: {
		client_id() {
			return this.$store.state.reportes.article_purchase.client_id
		},
		provider_id() {
			return this.$store.state.reportes.article_purchase.provider_id
		},
		category_id() {
			return this.$store.state.reportes.article_purchase.category_id
		},
		cantidad_resultados() {
			return this.$store.state.reportes.article_purchase.cantidad_resultados
		},
		orden() {
			return this.$store.state.reportes.article_purchase.orden
		},
		mes_inicio() {
			return this.$store.state.reportes.mes_inicio
		},
		mes_fin() {
			return this.$store.state.reportes.mes_fin
		},
	},
	methods: {
		buscar() {
			this.$store.commit('auth/setMessage', 'Buscando')
			this.$store.commit('auth/setLoading', true)
				this.$store.commit('reportes/article_purchase/set_loading', true)

			this.$api.post('article-purchase', {
				client_id: this.client_id,
				provider_id: this.provider_id,
				category_id: this.category_id,
				cantidad_resultados: this.cantidad_resultados,
				orden: this.orden,
				mes_inicio: this.mes_inicio,
				mes_fin: this.mes_fin,
			})
			.then(res => {
				this.$store.commit('reportes/article_purchase/set_articles', res.data.models)
				this.$store.commit('reportes/article_purchase/set_categories', res.data.categories)
				this.$store.commit('reportes/article_purchase/set_providers', res.data.providers)
				this.$store.commit('reportes/article_purchase/set_loading', true)
				this.$store.commit('auth/setLoading', false)
			})
			.catch(err => {
				this.$toast.error('Error al buscar')
				this.$store.commit('reportes/article_purchase/set_loading', true)
				this.$store.commit('auth/setLoading', false)
			})
		}
	}
}
</script>
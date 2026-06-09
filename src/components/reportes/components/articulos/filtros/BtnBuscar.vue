<template>
	<b-button
	block
	@click="buscar"
	:disabled="disabled"
	variant="primary">
		Buscar
	</b-button>
</template>
<script>
export default {
	computed: {
		/* Modo temporal del selector de fechas de reportes */
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},

		/* Rango inválido cuando la fecha de inicio es posterior a la de fin */
		fecha_invalida() {
			if (!this.mes_inicio || !this.mes_fin) {
				return false
			}
			return this.mes_inicio > this.mes_fin
		},

		/* Solo se puede buscar con rango de fechas completo y válido */
		disabled() {
			if (this.rango_temporal != 'rango-de-fechas') {
				return true
			}
			return !this.mes_inicio || !this.mes_fin || this.fecha_invalida
		},
		client_id() {
			return this.$store.state.reportes.article_purchase.client_id
		},
		provider_id() {
			return this.$store.state.reportes.article_purchase.provider_id
		},
		category_id() {
			return this.$store.state.reportes.article_purchase.category_id
		},
		address_id() {
			return this.$store.state.reportes.article_purchase.address_id
		},
		cantidad_resultados() {
			return this.$store.state.reportes.article_purchase.cantidad_resultados
		},
		orden() {
			return this.$store.state.reportes.article_purchase.orden
		},
		sale_channel_id() {
			return this.$store.state.reportes.article_purchase.sale_channel_id
		},
		mes_inicio() {
			return this.$store.state.reportes.mes_inicio
		},
		mes_fin() {
			return this.$store.state.reportes.mes_fin
		},
	},
	methods: {
		/**
		 * Dispara la búsqueda de artículos vendidos según filtros y rango de fechas del store.
		 */
		buscar() {
			if (this.disabled) {
				return
			}

			this.$store.commit('auth/setMessage', 'Buscando')
			this.$store.commit('auth/setLoading', true)
				this.$store.commit('reportes/article_purchase/set_loading', true)

			this.$api.post('article-purchase', {
				client_id: this.client_id,
				provider_id: this.provider_id,
				category_id: this.category_id,
				address_id: this.address_id,
				cantidad_resultados: this.cantidad_resultados,
				sale_channel_id: this.sale_channel_id,
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
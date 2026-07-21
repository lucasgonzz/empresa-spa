<template>
	<b-button
	v-if="variants_to_update.length"
	@click="actualizar"
	id="btn_actualizar_stock_variants"
	class="variant-grid__save-btn"
	variant="primary">
		Actualizar Stock
	</b-button>
</template>
<script>
export default {
	computed: {
		/** Articulo cuyas variantes se estan editando. */
		article() {
			return this.$store.state.article.model
		},
		/** Cola de variantes con cambios de stock/exhibicion pendientes de guardar por lote. */
		variants_to_update() {
			return this.$store.state.article.edit_variants_stock.variants_to_update
		},
	},
	methods: {
		/**
		 * Guarda por lote todos los cambios de stock/exhibicion encolados (mismo contrato de
		 * siempre: PUT article-update-varians-stock -> UpdateVariantsStockHelper -> StockMovement).
		 */
		actualizar() {
			this.$store.commit('auth/setMessage', 'Actualizando Stock')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('article-update-varians-stock', {
				article_id: this.article.id,
				variants_to_update: this.variants_to_update
			})
			.then(() => {
				this.$store.commit('article/edit_variants_stock/set_variants_to_update', [])
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.success('Actualizado correctamente')
				this.loadModel('article', this.article.id)
			})
			.catch(err => {
				this.$store.commit('article/edit_variants_stock/set_variants_to_update', [])
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.error('Error al actualizar')
			})
		}
	}
}
</script>
<style lang="sass">
.variant-grid__save-btn
	margin-top: 14px
</style>

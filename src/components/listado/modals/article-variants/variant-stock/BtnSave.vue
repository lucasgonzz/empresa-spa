<template>
	<b-button
	v-if="article.article_variants.length"
	@click="actualizar"
	variant="primary">
		Actualizar Stock
	</b-button>
</template>
<script>
export default {
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		variants_to_update() {
			return this.$store.state.article.edit_variants_stock.variants_to_update
		},
	},
	methods: {
		actualizar() {
			this.$store.commit('auth/setMessage', 'Actualizando Stock')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('article-update-varians-stock', {
				article_id: this.article.id,
				variants_to_update: this.variants_to_update
			})
			.then(res => {
				this.$store.commit('article/edit_variants_stock/set_variants_to_update', [])
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Actualizado correctamente')
				this.loadModel('article', this.article.id)
			})
			.catch(err => {
				this.$store.commit('article/edit_variants_stock/set_variants_to_update', [])
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al actualizar')
			})
		}
	}
}
</script>
export default {
	comptued: {
		filters() {
			return this.$store.state.article.filters 
		},
	},
	methods: {
		get_ultimos_articulos_actualizados() {
			// if (!this.filters.length) {

				this.$api.get('articles-ultimos-actualizados')
				.then(res => {
					this.$store.commit('article/addModels', res.data.models)
				})
				.catch(err => {
					this.$toast.error('error al cargar ultimos articulos actualizados')
				})
			// }

		},
	}
}
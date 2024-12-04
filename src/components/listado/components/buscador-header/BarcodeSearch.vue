<template>
	<div class="search-component bar-code-search s">
		<div class="cont-search-input-btn">
			<div class="cont-search">
				<div 
				class="icon">
					<i class="icon-search"></i>
				</div>
				<b-form-input
				@keyup.enter="search"
				v-model="bar_code"
				id="bar-code-search"
				placeholder="Codigo de barras"
				class="input-search"></b-form-input>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	data() {
		return {
			bar_code: '',
		}
	},
	computed: {
		articles() {
			return this.$store.state.article.models 
		},

		add_buscador_to_selected() {
			return this.$store.state.article.add_buscador_to_selected
		}
	},
	mounted() {
		this.$root.$on('article-modal-closed', this.modal_cerrado);
	},	
	beforeDestroy() {
		// Limpiar el oyente para evitar fugas de memoria
		this.$root.$off("article-modal-closed", this.modal_cerrado);
	},
	methods: {
		modal_cerrado() { 
			document.getElementById('bar-code-search').focus()
		},
		search() {

			this.$store.commit('article/setFiltered', [])

			if (this.download_articles) {

				let articles = this.articles.filter(article => {
					return article.bar_code == this.bar_code
				})

				this.$store.commit('article/setIsFiltered', true)
				this.$store.commit('article/setFilterPage', 1)
				this.$store.commit('article/setLoading', true)

				this.bar_code = ''
				setTimeout(() => {
					this.$store.commit('article/setLoading', false)
					this.$store.commit('article/setFiltered', articles)
					this.$store.commit('article/setTotalFilterPages', 1)
					this.$store.commit('article/setTotalFilterResults', 1)
					this.set_add_buscador_to_selected(articles[0])
				}, 500)

			} else {


				this.$store.commit('article/setFilterPage', 1)
				// this.$store.commit('article/setFilters', filters)
				this.$store.commit('article/setLoading', true)
				this.$store.commit('article/setFromDate', '')

				this.$api.get('vender/buscar-articulo-por-codido/'+this.bar_code)
				.then(res => {
					let article = res.data.article
					this.bar_code = ''
					this.$store.commit('article/setLoading', false)
					this.$store.commit('article/setIsFiltered', true) 
					this.$store.commit('article/setFiltered', [article])
					this.$store.commit('article/setTotalFilterPages', 1)
					this.$store.commit('article/setTotalFilterResults', 1)

					this.set_add_buscador_to_selected(article)
				})
				.catch(err => {
					this.$store.commit('article/setLoading', false)
					console.log(err)
					this.$toast.error('Error al buscar')
				})

			}
		},
		set_add_buscador_to_selected(article) {
			console.log('set_add_buscador_to_selected: ')
			console.log(this.add_buscador_to_selected)
			if (this.add_buscador_to_selected) {
				console.log('AGREGANDO')
				this.$store.commit('article/addSelected', article)
			} else {
				console.log('NO SE AGREGANDO')
			}
		}
	}
}
</script>
<style lang="sass">
.bar-code-search
	// margin-left: 15px
	width: 200px
</style>
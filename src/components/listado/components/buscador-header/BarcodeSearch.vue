<template>
	<div class="search-component bar-code-search s d-none d-lg-block">
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
				this.bar_code = ''
				setTimeout(() => {
					this.$store.commit('article/setFiltered', articles)
				}, 500)

			} else {


				this.$store.commit('article/setFilterPage', 1)
				// this.$store.commit('article/setFilters', filters)
				this.$store.commit('article/setLoading', true)
				this.$store.commit('article/setFromDate', '')

				this.$api.get('vender/buscar-articulo-por-codido/'+this.bar_code)
				.then(res => {
					let article = res.data.article
					console.log(article)
					this.bar_code = ''
					this.$store.commit('article/setLoading', false)
					this.$store.commit('article/setIsFiltered', true) 
					this.$store.commit('article/setFiltered', [article])
					this.$store.commit('article/setTotalFilterPages', 1)
					this.$store.commit('article/setTotalFilterResults', 1)

					this.$store.commit('article/add_filtered_from_buscador', article)
				})
				.catch(err => {
					this.$store.commit('article/setLoading', false)
					console.log(err)
					this.$toast.error('Error al buscar')
				})

			}
		}
	}
}
</script>
<style lang="sass">
.bar-code-search
	// margin-left: 15px
	width: 300px
</style>
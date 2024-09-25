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
	methods: {
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

				let filters = [
					{
						type: 'text',
						key: 'bar_code',
						text: 'Codigo de barras',
						value: this.bar_code,
					}
				]

				console.log('se va a buscar con esto:')
				console.log(filters)

				this.$store.commit('article/setFilterPage', 1)
				this.$store.commit('article/setFilters', filters)
				this.$store.commit('article/setLoading', true)
				this.$store.commit('article/setFromDate', '')

				this.$api.post('search/'+'article/null/1', {
					filters: filters,
				})
				.then(res => {
					console.log(res.data.data)
					this.$store.commit('article/setLoading', false)
					this.$store.commit('article/setIsFiltered', true) 
					this.$store.commit('article/setFiltered', res.data.data)
					this.$store.commit('article/setTotalFilterPages', res.data.last_page)
					this.$store.commit('article/setTotalFilterResults', res.data.total)
				})
				.catch(err => {
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
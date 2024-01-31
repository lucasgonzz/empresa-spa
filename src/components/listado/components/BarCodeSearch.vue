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
			let articles = this.articles.filter(article => {
				return article.bar_code == this.bar_code
			})
			this.$store.commit('article/setIsFiltered', true)
			this.$store.commit('article/setFiltered', articles)
			this.bar_code = ''
		}
	}
}
</script>
<style lang="sass">
.bar-code-search
	// margin-left: 15px
	width: 300px
</style>
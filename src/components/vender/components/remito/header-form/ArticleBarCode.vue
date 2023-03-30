<template>
	<b-col
	class="col-bar-code margin-bottom-since-lg d-none d-lg-flex"
	cols="12"
	:lg="col_header_lg">
		<b-form-input
		id="article-bar-code"
		v-model="article.bar_code"
		autocomplete="off" 
		ref="articleBarCode"
		@keydown.shift="callVender"
		@keydown.enter="setArticle"
		placeholder="Ingrese el codigo de barras"></b-form-input>

		<!-- <select-component
		id="article-bar-code"
		:model="article"
		:models="articles"
		:str_limint="2"
		prop_name="bar_code"
		placeholder="Buscar solo por codigo de barras"
		:props_to_show="['bar_code', 'price', 'provider_code', 'num']"
		auto_select
		@setSelected="setArticleForSale"></select-component> -->
	</b-col>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	computed: {
		article() {
			return this.$store.state.vender.article
		},
		articles() {
			return this.$store.state.article.models
		},
	},
	methods: {
		setArticle() {
			if (this.article.bar_code != '') {
				let article = this.articles.find(article => {
					return article.bar_code && article.bar_code == this.getBarCode(this.article.bar_code)
				})
				this.setVenderArticle(article)
			}
		},
	}
}
</script>
<style scoped lang="sass">
.col-bar-code 
	display: flex
	align-items: center
</style>
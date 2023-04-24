<template>
	<b-col
	class="col-bar-code margin-bottom-since-lg"
	cols="12"
	:lg="col_header_lg">
		<div
		class="d-flex w-100">
			<b-form-input
			id="article-bar-code"
			v-model="article.bar_code"
			autocomplete="off" 
			ref="articleBarCode"
			@keydown.shift="callVender"
			@keydown.enter="setArticle"
			placeholder="Ingrese el codigo de barras"></b-form-input>

			<bar-code-scanner
			class="m-l-10"
			v-if="hasExtencion('bar_code_scanner')"
			@setBarCode="setBarCode"></bar-code-scanner>
		</div>
	</b-col>
</template>
<script>
import vender from '@/mixins/vender' 
export default {
	mixins: [vender],
	components: {
		BarCodeScanner: () => import('@/common-vue/components/bar-code-scanner/Index'),
	},
	computed: {
		article() {
			return this.$store.state.vender.article
		},
		articles() {
			return this.$store.state.article.models
		},
	},
	methods: {
		setBarCode(bar_code) {
			let article = this.articles.find(article => {
				return article.bar_code && article.bar_code == bar_code
			})
			this.setVenderArticle(article, true) 
		},
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
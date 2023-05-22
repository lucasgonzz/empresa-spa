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
	data() {
		return {
			finded_article: undefined,
		}
	},
	methods: {
		async getArticleFromBarCode(bar_code) {
			let article
			bar_code = this.getBarCode(bar_code)
			if ((this.is_mobile && !this.downloadOnMobile('article')) || this.$store.state.article.loading) {
				console.log('se va a buscar del api')
				await this.getArticleFromApi(bar_code)
				console.log('siguio')
			} else {
				this.finded_article = this.articles.find(article => {
					return article.bar_code && article.bar_code == bar_code
				})
			}
		},
		async setBarCode(bar_code) {
			await this.getArticleFromBarCode(bar_code)
			this.setVenderArticle(this.finded_article, true) 
		},
		async setArticle() {
			if (this.article.bar_code != '') {
				await this.getArticleFromBarCode(this.article.bar_code)
				this.setVenderArticle(this.finded_article)
			}
		},
		getArticleFromApi(bar_code) {
			return this.$api.post('search-from-modal/article', {
				prop_to_filter: {key: 'bar_code'},
				query_value: bar_code,
			})
			.then(res => {
				console.log('termino api')
				console.log(res)
				if (res.data.models.length) {
					console.log('llego resultado')
					this.finded_article = res.data.models[0]
				} else {
					this.finded_article = undefined
				}
			})
			.catch(err => {
				console.log(err)
			})
		}
	}
}
</script>
<style scoped lang="sass">
.col-bar-code 
	display: flex
	align-items: center
</style>
<template>
	<b-col
	class="col-bar-code margin-bottom-since-lg"
	cols="12"
	:lg="col_header_lg">
		<div
		class="d-flex w-100">
			<b-form-input
			id="article-bar-code"
			v-model="article.codigo"
			autocomplete="off" 
			ref="articleBarCode"
			@keydown.shift="callVender"
			@keydown.enter="setArticle"
			:placeholder="placeholder"></b-form-input>

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
	created() {
		setTimeout(() => {
			document.getElementById('article-bar-code').focus()
		}, 500)
	},
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
		usar_codigo_proveedor() {
			return this.hasExtencion('codigo_proveedor_en_vender')
		},
		placeholder() {
			if (this.usar_codigo_proveedor) {
				return 'Ingrese el codigo de proveedor'
			}
			return 'Ingrese el codigo de barras'
		},
	},
	data() {
		return {
			finded_article: undefined,
		}
	},
	methods: {
		async getArticleFromCodigo(codigo) {
			let article
			codigo = this.getBarCode(codigo)
			if ((!this.download_articles && !this.articles.length) || (this.is_mobile && !this.downloadOnMobile('article') && !this.articles.length ) || this.$store.state.article.loading) {
				console.log('se va a buscar del api el codigo '+codigo)
				await this.getArticleFromApi(codigo)
				// alert('siguio')
			} else {
				this.finded_article = this.articles.find(article => {
					return this.check_article(article, codigo)
				})
				console.log('ENTRO 2')
				console.log(this.finded_article)
				// alert('Find in store: '+this.finded_article)
			}
		},
		check_article(article, codigo) {
			if (this.usar_codigo_proveedor) {
				// console.log('comparando '+article.provider_code+' con '+codigo)
				return article.provider_code && article.provider_code.toLowerCase() == codigo.toLowerCase()
			} else {
				return article.bar_code && article.bar_code == codigo
			} 
		},
		async setBarCode(bar_code) {
			await this.getArticleFromCodigo(bar_code)
			console.log('setVenderArticle')
			this.setVenderArticle(this.finded_article, true) 
		},
		async setArticle() {
			if (this.article.codigo != '') {
				await this.getArticleFromCodigo(this.article.codigo)
				if (typeof this.finded_article != 'undefined') {
					console.log('sigue con setVenderArticle')
					console.log(this.finded_article.name)
					this.setVenderArticle(this.finded_article)
				} else {
					this.$toast.error('No se encontro articulo')
				}
			}
		},
		getArticleFromApi(bar_code) {
			let prop_to_filter = {} 
			if (this.usar_codigo_proveedor) {
				prop_to_filter.key = 'provider_code'
			} else {
				prop_to_filter.key = 'bar_code'
			}
			return this.$api.post('search-from-modal/article', {
				prop_to_filter: prop_to_filter,
				query_value: bar_code,
			})
			.then(res => {
				if (res.data.models.length) {
					// alert('llego del api: '+res.data.models[0].name)
					this.finded_article = res.data.models[0]
				} else {
					// alert('No se encontro nada en api: '+res.data)
					this.finded_article = undefined
				}
			})
			.catch(err => {
				// alert('Error al buscar del api')
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
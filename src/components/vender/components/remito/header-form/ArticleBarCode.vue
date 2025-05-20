<template>
	<b-col
	class="col-bar-code margin-bottom-since-lg"
	cols="12"
	v-if="!hasExtencion('no_usar_codigos_de_barra')"
	:md="3">
		<div
		class="d-flex w-100">
			<b-form-input
			id="article-bar-code"
			dusk="article_bar_code"
			v-model="item_vender.codigo"
			autocomplete="off" 
			ref="articleBarCode"
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
import vender from '@/mixins/vender/index' 
import guardar_venta from '@/mixins/vender/guardar_venta/index' 
import sonido_error from '@/mixins/sonido_error' 
export default {
	mixins: [vender, guardar_venta, sonido_error],
	created() {
		setTimeout(() => {
			document.getElementById('article-bar-code').focus()
		}, 500)
	},
	components: {
		BarCodeScanner: () => import('@/common-vue/components/bar-code-scanner/Index'),
	},
	computed: {
		item() {
			return this.$store.state.vender.item
		},
		articles() {
			return this.$store.state.article.models
		},
		usar_codigo_proveedor() {
			return this.hasExtencion('codigo_proveedor_en_vender')
		},
		placeholder() {
			if (this.usar_codigo_proveedor) {
				return 'Cod proveedor'
			}
			return 'Cod barras'
		},
	},
	data() {
		return {
			finded_article: undefined,
		}
	},
	methods: {
		_callVender() {
			if (!this.usar_codigo_proveedor) {
				this.guardar_venta()
			}
		},
		async getArticleFromCodigo(codigo) {
			let article
			if (!this.usar_codigo_proveedor) {
				codigo = this.getBarCode(codigo)
			}
			if (!this.download_articles || (this.is_mobile && !this.downloadOnMobile('article') && !this.articles.length ) || this.$store.state.article.loading) {
				await this.getArticleFromApi(codigo)
				// alert('siguio')
			} else {
				this.finded_article = this.articles.find(article => {
					return this.check_article(article, codigo)
				})
				// alert('Find in store: '+this.finded_article)
			}
		},
		check_article(article, codigo) {
			if (this.usar_codigo_proveedor) {
				return article.provider_code && article.provider_code.toLowerCase() == codigo.toLowerCase()
			} else {
				return article.bar_code && article.bar_code == codigo
			} 
		},
		async setBarCode(bar_code) {
			await this.getArticleFromCodigo(bar_code)
			this.finded_article.is_article = true

			this.set_item_vender(this.finded_article, true) 
		},
		async setArticle() {
			if (this.item_vender.codigo != '') {
				await this.getArticleFromCodigo(this.item_vender.codigo)
				if (typeof this.finded_article != 'undefined') {

					this.set_nombre_en_input()

					this.finded_article.is_article = true
					this.set_item_vender(this.finded_article)
				} else {

                    // var audio = new Audio(error);
                    // audio.play()

                    // setTimeout(() => {
                    // 	audio.play()
                    // }, 1000)

					this.sonido_error()

					this.$toast.error('No se encontro articulo')

					let input = document.getElementById('article-bar-code')
					input.value = ''

				}
			}
		},
		set_nombre_en_input() {
			let input = document.getElementById('search-article')
			if (typeof input != 'undefined') {
				input.value = this.finded_article.name
			}
		},
		getArticleFromApi(bar_code) {
			this.$store.commit('auth/setMessage', 'Buscando articulo')
			this.$store.commit('auth/setLoading', true)
			
			return this.$api.get('vender/buscar-articulo-por-codido/'+bar_code)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				if (res.data.article) {
					this.finded_article = res.data.article

					if (res.data.variant_id) {
						this.finded_article.variant_id = res.data.variant_id
					}

				} else {
					this.finded_article = undefined
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al buscar articulo')
				alert(err)
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
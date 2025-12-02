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
			@keydown.enter="set_article_from_barcode"
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
import vender_set_total from '@/mixins/vender_set_total' 
export default {
	mixins: [vender, guardar_venta, sonido_error, vender_set_total],
	created() {
		setTimeout(() => {
			document.getElementById('article-bar-code').focus()
		}, 500)
	},
    mounted() {
        window.addEventListener("keydown", this.detectarTecla);
    },
    beforeDestroy() {
        window.removeEventListener("keydown", this.detectarTecla);
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
			from_balanza: false,
		}
	},
	methods: {
        detectarTecla(event) {
            // if (event.key === "Control") {
            	// document.getElementById('article-bar-code').focus()
            // }
        },
		_callVender() {
			if (!this.usar_codigo_proveedor) {
				this.guardar_venta()
			}
		},

		/*
			Todo empieza con este metodo
		*/
		async set_article_from_barcode() {
			if (this.item_vender.codigo != '') {
				
				this.from_balanza = false

				await this.set_finded_article(this.item_vender.codigo)

				console.log('from_balanza: '+this.from_balanza)

				if (
					typeof this.finded_article != 'undefined'
					&& !this.from_balanza
				) {

					this.set_nombre_en_input()

					this.finded_article.is_article = true
					this.set_item_vender(this.finded_article)

				} else if (!this.from_balanza) {

					this.sonido_error()

					this.$toast.error('No se encontro articulo')

					let input = document.getElementById('article-bar-code')
					input.value = ''

				}
			}
		},

		async set_finded_article(codigo) {
			let article

			if (!this.usar_codigo_proveedor) {
				codigo = this.getBarCode(codigo)
			}

			if (
				!this.$store.state.auth.online
				|| this.owner.usar_articles_cache
			) {

				console.log('Buscando offline')

				let articles = await this.get_articles_offline()

				this.finded_article = articles.find(article => {
					return this.check_article(article, codigo)
				})

			} else if (this.$store.state.auth.online) {

				await this.getArticleFromApi(codigo)

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
			this.from_balanza = false
			await this.getArticleFromCodigo(bar_code)

			if (!this.from_balanza) {

				console.log('*********************************************')
				console.log('*********************************************')
				console.log('SIGE DE LARGO con from_balanza: '+this.from_balanza)
				console.log('*********************************************')
				console.log('*********************************************')

				this.finded_article.is_article = true

				this.set_item_vender(this.finded_article, true) 
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
			
			console.log('getArticleFromApi')

			return this.$api.get('vender/buscar-articulo-por-codido/'+bar_code)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				if (res.data.article) {

					if (res.data.from_balanza) {
						console.log('entro a from_balanza')
						this.set_from_balanza(res)
						this.from_balanza = true
						console.log('from_balanza: '+this.from_balanza)
						return
					} 

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
				this.$toast.error('Error al buscar codigo de barras: '+err)
			})
		},
		set_from_balanza(res) {
			console.log('set_from_balanza')
			let article = res.data.article
			let vender_article_index = this.items.findIndex(item => {
				return item.is_article && item.id == article.id 
			})

			if (vender_article_index != -1) {
				this.items[vender_article_index].price_vender_personalizado = res.data.price_vender
				this.items[vender_article_index].price_vender = res.data.price_vender

				this.setTotal()

				document.getElementById('article-bar-code').value = ''
			}
		}
	}
}
</script>
<style scoped lang="sass">
.col-bar-code 
	display: flex
	align-items: center
</style>
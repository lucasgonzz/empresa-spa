import vender from '@/mixins/vender/index'
export default {
	mixins: [vender],
	computed: {
		items() {
			return this.$store.state.vender.items
		},
		loading_articles() {
			return this.$store.state.article.loading
		},
	},
	data() {
		return {
			intentos_volver_a_llamar_default_articles: 0,
			intentos_volver_a_llamar_default_payment_method: 0,
			intentos_volver_a_llamar_set_omitir_en_cuenta_corriente: 0,
		}
	},
	methods: {

		// Defautl Articles
		set_default_articles() {
			/*
				Guard: a una venta que se esta abriendo para editar no se le agregan los articulos
				por defecto del comercio. Corre en el created() de Vender.vue, o sea ANTES de que
				llegue la venta, y por eso el getter mira tambien el flag de "abriendo".
			*/
			if (this.$store.getters['vender/previus_sales/editando_venta_previa'] || !!this.$store.state.vender.budget) {
				return
			}
			if (
				this.authenticated
				&& this.hasExtencion('articles_default_in_vender')
				) {

				/*
				 * En cuentas download_articles los articulos por defecto viajan aparte, en
				 * article.default_models (ver start_methods.js y store/article.js): article.models ahi
				 * puede tardar minutos en poblarse con el catalogo completo, y no hace falta esperarlo
				 * para los pocos articulos marcados default_in_vender.
				 */
				let usa_catalogo_completo = !this.download_articles

				let articles = usa_catalogo_completo
					? this.$store.state.article.models
					: this.$store.state.article.default_models

				let disponible = usa_catalogo_completo
					? (articles.length && !this.loading_articles)
					: articles.length

				if (disponible) {

					let articles_por_defecto = usa_catalogo_completo
						? articles.filter(article => article.default_in_vender)
						: articles

					articles_por_defecto.forEach(article => {
						let article_to_add = {
							...article,
							amount: 1,
							// amount: '',
							price_vender: '',
							is_article: true,
						}
						if (!this.ya_esta_en_los_articulos_para_vender(article_to_add)) {
							
							this.$store.commit('vender/setItem', article_to_add)
							
							this.add_item_to_sale()
							console.log('Se agrego default article: '+article_to_add.name)
						} else {
						}
					})
				} else {
					this.volver_a_llamar_default_articles()
				}

			} else if (!this.authenticated) {

				this.volver_a_llamar_default_articles()
			
			} else if (this.hasExtencion('articles_default_in_vender')) {
				this.volver_a_llamar_default_articles()
			}
		},
		ya_esta_en_los_articulos_para_vender(article) {
			let index = this.items.findIndex(item => {
				return item.id == article.id 
			})
			return index != -1
		},
		volver_a_llamar_default_articles() {
			if (this.intentos_volver_a_llamar_default_articles < 5) {
				setTimeout(() => {
					this.intentos_volver_a_llamar_default_articles++
					this.set_default_articles()
				}, 2000)
			}
		},

	}
}
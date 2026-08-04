import moment from 'moment'
export default {
	computed: {
		provider_articles_per_page() {
			return this.$store.state.panel_control.provider_articles_per_page
		},
		stock_actual() {
			if (this.selected_article.article_id) {
				let store_article = this.$store.state.article.models.find(article => {
					return article.id == this.selected_article.article_id 
				})
				if (typeof store_article != 'undefined') {
					return store_article.stock 
				}
			}
			return null
		},
		articulos_vendidos() {
			return this.$store.state.panel_control.models
		},
		_providers() {
			// OJO: sigue en `.models`, no `.options`, a proposito. El chart de Acreedores
			// (rendimiento-general/acreedores/Chart.vue) necesita provider.saldo, que el
			// endpoint liviano /provider/options (solo id+name, grupo 332) no trae -- pasarlo
			// a options rompiria el chart en silencio (saldo undefined). Arreglar esto de raiz
			// requiere sumar saldo a /provider/options en empresa-api, fuera de alcance de
			// este prompt (grupo 342, 4/8/2026, ver hallazgo 20260804-acreedores-necesita-saldo-en-options).
			// Mientras tanto, proveedores/Index.vue dispara provider/getModels al entrar a
			// esta seccion para que este chart siga funcionando (misma limitacion de
			// paginacion que tenia antes, no es una regresion nueva).
			return this.$store.state.provider.models
		},
		provider_articles() {
			return this.$store.state.panel_control.provider_articles
		},
		unidades_vendidas() {
			return this.$store.state.panel_control.unidades_vendidas
		},
		selected_article() {
			return this.$store.state.panel_control.selected_article
		},
		selected_provider() {
			return this.$store.state.panel_control.selected_provider
		},
		providers_formated() {
			console.log('providers_formated')
			console.log(this.$store.state.panel_control.providers_formated)
			return this.$store.state.panel_control.providers_formated 
		}
	},
	methods: {
		/*
			provider_articles = Todos los articulos con sus ventas de Todos los meses
								Aca va a haber articulos repetidos

			unidades_vendidas = Todos los articulos con la suma de las ventas de todos los meses
								Aca NO va a haber articulos repetidos
		*/
		setProviderArticles(provider) {

			this.$store.commit('panel_control/setSelectedProvider', provider)
			
			if (provider) {

				let provider_articles = this.articulos_vendidos.filter(article_performance => {
					return article_performance.provider_id == this.selected_provider.id 
				})

				let unidades_vendidas = []
				provider_articles.forEach(provider_article => {
					if (unidades_vendidas[provider_article.article_id]) {
						unidades_vendidas[provider_article.article_id].amount += Number(provider_article.amount) 
					} else {
						unidades_vendidas[provider_article.article_id] = {
							...provider_article
						}
						unidades_vendidas[provider_article.article_id].amount = Number(provider_article.amount)
					}
				})


				unidades_vendidas = unidades_vendidas.filter(Boolean)

				this.$store.commit('panel_control/setProviderArticles', provider_articles)
				this.$store.commit('panel_control/setProviderArticlesUnidadesVendidas', unidades_vendidas)
			} else {
				this.$store.commit('panel_control/setProviderArticles', [])
				this.$store.commit('panel_control/setProviderArticlesUnidadesVendidas', [])
			}
		},
		setProvidersFormated() {
			/**
			 * Antes esto era un setTimeout recursivo de 1 segundo que esperaba a que el store
			 * tuviera proveedores. No tenia corte: cuando dejamos de descargar el catalogo al
			 * iniciar sesion (4/8/2026) habria girado para siempre. Ahora el calculo cuelga de
			 * la promesa de getOptions, que resuelve o falla una sola vez.
			 */
			this.$store.dispatch('provider/getOptions').then(() => {
				this.$store.commit('panel_control/setProvidersFormated', {
					providers: this.$store.state.provider.options,
				})
			})
		},
	}
}
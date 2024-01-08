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
			console.log('setProvidersFormated')
			let providers = this.$store.state.provider.models
			let loading = this.$store.state.provider.loading

			let article_performance = this.$store.state.panel_control.models
			let loading_article_performance = this.$store.state.panel_control.loading
			if (providers.length && !loading && article_performance.length && !loading_article_performance) {
				this.$store.commit('panel_control/setProvidersFormated')
			} else {
				console.log('Todavia no se descargaron los proveedores')
				setTimeout(() => {
					console.log('Volviendo a llamar')
					this.setProvidersFormated()
				}, 1000)
			}
		},
	}
}
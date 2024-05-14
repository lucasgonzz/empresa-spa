export default {
	computed: {
		client() {
			return this.$store.state.vender.client
		},
		budget() {
			return this.$store.state.vender.budget
		},
		observations() {
			return this.$store.state.vender.observations
		},
		discounts_id() {
			return this.$store.state.vender.discounts_id
		},
		discounts() {
			return this.$store.state.discount.models
		},
		surchages_id() {
			return this.$store.state.vender.surchages_id
		},
		surchages() {
			return this.$store.state.surchage.models
		},
		items() {
			return this.$store.state.vender.items 
		},
		articles() {
			return this.items.filter(item => item.is_article)
		},
	},
	methods: {
		guardar_presupuesto() {
			this.$store.commit('auth/setMessage', 'Guardando Presupuesto')
			this.$store.commit('auth/setLoading', true)
			if (this.budget) {
				this.actualizar()
			} else {
				this.crear()
			}
		},
		actualizar() {
			this.$api.put('budget/'+this.budget.id, {
				'client_id'                 : this.budget.client_id,
				'start_at'                  : this.budget.start_at,
				'finish_at'                 : this.budget.finish_at,
				'observations'              : this.observations,

				// Id 1 es el estado "sin confirmar"
				'budget_status_id'          : this.budget.budget_status_id,

				'discounts'					: this.get_discounts(),
				'surchages'					: this.get_surchages(),
				'articles'					: this.get_articles(),
			})
			.then(res => {
				this.$store.commit('auth/setMessage', '')
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Presupuesto actualizado')
				this.$store.commit('budget/add', res.data.model)
				this.limpiar_vender()
			})
			.catch(err => {
				this.$store.commit('auth/setMessage', '')
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al guardar Presupuesto')
			})
		},
		crear() {
			this.$api.post('budget', {
				'client_id'                 : this.client.id,
				'start_at'                  : null,
				'finish_at'                 : null,
				'observations'              : this.observations,

				// Id 1 es el estado "sin confirmar"
				'budget_status_id'          : 1, 

				'discounts'					: this.get_discounts(),
				'surchages'					: this.get_surchages(),
				'articles'					: this.get_articles(),
			})
			.then(res => {
				this.$store.commit('auth/setMessage', '')
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Presupuesto guardado')
				this.$store.commit('budget/add', res.data.model)
				this.limpiar_vender()
			})
			.catch(err => {
				this.$store.commit('auth/setMessage', '')
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al guardar Presupuesto')
			})
		},
		limpiar_vender() {
			this.$store.commit('vender/previus_sales/setIndex', 0)
			this.$store.commit('vender/previus_sales/setPreviusSale', {})
			this.$store.commit('vender/setToCheck', 0)
			this.$store.commit('vender/setChecked', 0)
			this.$store.commit('vender/setConfirmed', 0)
			this.$store.commit('vender/setItems', [])
			this.$store.commit('vender/setDiscountsId', [])
			this.$store.commit('vender/setSurchagesId', [])
			this.$store.commit('vender/setClient', null)
			this.$store.commit('vender/setReturnedItems', [])
			this.$store.commit('vender/setSaveNotaCredito', 0)
			this.$store.commit('vender/setNotaCreditoDescription', '')
			this.$store.commit('vender/setTotal')
			this.$store.commit('vender/setObservations', '')
			this.$store.commit('vender/setGuardarComoPresupuesto', 0)
			this.$store.commit('vender/setBudget', null)
			this.$store.commit('vender/setPriceType', null)
		},

		get_discounts() {
			let discounts = []
			let discount = null

			this.discounts_id.forEach(discount_id => {
				discount = this.discounts.find(_discount => {
					return _discount.id == discount_id
				})

				if (typeof discount != 'undefined') {
					discounts.push(discount)
				}
			})
			return discounts
		},
		get_surchages() {
			let surchages = []
			let surchage = null

			this.surchages_id.forEach(surchage_id => {
				surchage = this.surchages.find(_surchage => {
					return _surchage.id == surchage_id
				})

				if (typeof surchage != 'undefined') {
					surchages.push(surchage)
				}
			})
			return surchages
		},
		get_articles() {
			console.log('get_articles presupuesto')
			let articles = []
			this.articles.forEach(article => {
				articles.push({
					id: article.id,
					status: article.status,
					pivot: {
						amount: article.amount,
						price: article.price_vender,
						bonus: typeof article.discount != 'undefined' ? article.discount : null,
						location: null,
					}
				})
				console.log(articles)
			})
			return articles
		}
	}
}
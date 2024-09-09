export default {
	methods: {
		toProduccion() {
			if (this.user) {
				if (this.hasExtencion('production.order_production')) {
					this.$router.push({name: 'produccion', params: {view: 'ordenes'}})
				} else if (this.hasExtencion('production.production_movement')) {
					this.$router.push({name: 'produccion', params: {view: 'movimientos'}})
				}
			}
		},
		toSales() {
			if (this.user) {
				let from_dates = this.$store.state.sale.from_dates
				
				// Si entra, es porque se llamo el historico desde Deposito
				if (!from_dates) {

					this.$store.commit('sale/setFromDates', true)
				}
				
				this.$store.dispatch('sale/getModels')
				
				this.$router.push({name: 'sale', params: {view: 'todas', sub_view: 'todos'}})

			}
		}
	}
}
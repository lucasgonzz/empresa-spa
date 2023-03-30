export default {
	computed: {
		has_warnings() {
			return false
		},
		loading() {
			return this.$store.state.sale.afip.loading
		},
		selected_sales() {
			return this.$store.state.sale.selected
		},
		sale() {
			return this.$store.state.sale.afip_ticket
		},
		importes() {
			return this.$store.state.sale.afip.importes
		},
	},
	methods: {
		checkAfipTicket() {
			this.$store.commit('sale/setAfipTicket', this.selected_sales[0])
			if (this.has_warnings) {
				this.$bvModal.show('afip-ticket-warning')
			} else {
				this.$store.commit('auth/setMessage', 'Emitiendo Factura')
				this.$store.commit('auth/setLoading', true)
				this.$store.dispatch('sale/makeAfipTicket')
				.then(() => {
					this.$store.commit('auth/setMessage', '')
					this.$store.commit('auth/setLoading', false)
					this.printAfipTicket(this.selected_sales[0])
				})
			}
		},
		printAfipTicket(sale) {
			let link = process.env.VUE_APP_API_URL+'/sales/afip-ticket/pdf/'+sale.id
			window.open(link)
		},
	}
}
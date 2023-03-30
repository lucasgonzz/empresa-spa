export default {
	computed: {
		selected_sales() {
			return this.$store.state.sale.selected
		},
		sale_details() {
			return this.$store.state.sale.details
		},
	},
	methods: {
		salePdf(sale_id, with_prices) {
			if (this.user_configuration.limit_items_in_sale_per_page) {
				this.$bvModal.show('print-sales')
			} else {
	            let link = process.env.VUE_APP_API_URL+'/sale/pdf/'+sale_id+'/'+with_prices
	            window.open(link)
			}
		},
		ticketPdf(sale_id) {
            let link = process.env.VUE_APP_API_URL+'/sale/ticket-pdf/'+sale_id
            window.open(link)
		},
		afipTicketPdf(sale_id) {
            let link = process.env.VUE_APP_API_URL+'/sale/afip-ticket-pdf/'+sale_id
            window.open(link)
		},
	}
}
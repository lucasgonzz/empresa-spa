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
            let link = process.env.VUE_APP_API_URL+'/sale/pdf/'+sale_id+'/'+with_prices
            window.open(link)
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
export default {
	methods: {
		printTicket(sale) {
			let link = process.env.VUE_APP_API_URL+'/sales/tickets/pdf/'+sale.id
			if (sale.address_id) {
				link += '/'+sale.address_id
			} 
			window.open(link)
		},
	}
}
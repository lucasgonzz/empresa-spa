export default {
	computed: {
		sales() {
			return this.$store.state.sale.models 
		},
		sales_to_show() {

			let sale_status = this.$store.state.sale_status.models.find(m => m.name.toLowerCase() == this.view.replaceAll('-', ' '))
			
			if (typeof sale_status != 'undefined'){
				return this.get_sales_from_status(sale_status)
			}
			return []
		},
	},
	methods: {
		
		get_sales_from_status(sale_status) {

			return this.sales.filter(sale => {
				return sale.sale_status_id == sale_status.id  
			})

		}
	}
}
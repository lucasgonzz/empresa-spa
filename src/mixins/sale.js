export default {
	computed: {
		_sales() {
			return this.$store.state.sale.models 
		},
		filtered() {
			return this.$store.state.sale.filtered 
		},
		is_filtered() {
			return this.$store.state.sale.is_filtered 
		},
		sales() {
			if (this.is_filtered) {
				return this.filtered
			}
			return this.$store.state.sale.models.filter(sale => {
				return !sale.to_check && !sale.checked
			}) 
		},
		addresses() {
			return this.$store.state.address.models 
		},
		employees() {
			return this.$store.state.employee.models 
		},
		sales_to_show() {
			if (this.view == 'todas' && this.sub_view == 'todos') {
				return this.sales 
			} else {
				let sales = []
				if (this.view == 'todas') {
					sales = this.sales 
				} else {
					let address = this.addresses.find(model => {
						return model.street.toLowerCase() == this.view.replaceAll('-', ' ').toLowerCase()
					})
					sales = this.sales.filter(sale => {
						return sale.address_id == address.id 
					})
				}

				if (this.sub_view != 'todos') {
					let employee = this.employees.find(model => {
						// console.log('comparando '+model.name.toLowerCase()+' con '+this.sub_view.replaceAll('-', ' ').toLowerCase())
						return model.name.toLowerCase() == this.sub_view.replaceAll('-', ' ').toLowerCase()
					})
					if (typeof employee == 'undefined') {
						// console.log('dueño')
						sales = sales.filter(sale => {
							return !sale.employee_id
						})	
					} else {
						sales = sales.filter(sale => {
							return sale.employee_id == employee.id 
						})
					}
				}
				return sales 
			}
		}
	},
}
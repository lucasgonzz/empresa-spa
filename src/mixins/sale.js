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
		ventas_cobradas() {
			return this.$store.state.sale.ventas_cobradas_show_option
		},
		afip_ticket_show_option() {
			return this.$store.state.sale.afip_ticket_show_option
		},
		payment_method_show_option() {
			return this.$store.state.sale.payment_method_show_option
		},
		sales_to_show() {
			let sales = []
			if (this.view == 'todas' && this.sub_view == 'todos') {
				sales = this.sales 
			} else {
				// let sales = []
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
			}

			if (this.ventas_cobradas == 'solo-cobradas') {
				sales = sales.filter(sale => {
					return !sale.client_id || this.tiene_cuenta_corriente_cobrada(sale)
				})
				console.log('solo-cobradas')
			} else if (this.ventas_cobradas == 'solo-sin-cobrar') {
				sales = sales.filter(sale => {
					return sale.client_id && (!sale.current_acount || sale.current_acount.status != 'pagado')
				})
			}

			if (this.afip_ticket_show_option == 'solo-con-factura') {
				console.log('entro solo-con-factura')
				sales = sales.filter(sale => {
					return sale.afip_ticket 
				})
			} else if (this.afip_ticket_show_option == 'solo-sin-factura') {
				sales = sales.filter(sale => {
					return !sale.afip_ticket 
				})
			}

			if (this.payment_method_show_option != 'todos') {

				sales = sales.filter(sale => {
					let has_payment_method = false 

					let payment_method = sale.current_acount_payment_methods.find(_payment_method => {
						return _payment_method.id == this.payment_method_show_option
					}) 

					if (typeof payment_method != 'undefined') {

						return true 
					}
					return false
				})
			}

			return sales 
		}
	},
	methods: {
		tiene_cuenta_corriente_cobrada(sale) {
			return sale.current_acount && sale.current_acount.status == 'pagado'
		}
	}
}
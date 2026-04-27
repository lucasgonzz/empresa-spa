export default {
	/**
	 * Vuelve true si la fila de venta es contenedor de facturación consolidada.
	 * Usa comparación estricta: el string "0" en JS es truthy y rompía el filtro.
	 * @param {Object} sale
	 * @returns {boolean}
	 */
	methods: {
		esVentaContenedorConsolidacion(sale) {
			if (!sale || sale.is_consolidacion_facturacion == null) {
				return false
			}
			return Number(sale.is_consolidacion_facturacion) === 1
		},

		/**
		 * Fila consolidada mostrable aunque no tenga address_id (el backend no lo setea al crear el contenedor).
		 * @param {Object} sale
		 * @param {Object} address Modelo de sucursal (tab actual).
		 * @returns {boolean}
		 */
		_mostrarContenedorConSucursal(sale, address) {
			if (!this.$store.state.sale.mostrar_consolidadas) {
				return false
			}
			if (!this.esVentaContenedorConsolidacion(sale)) {
				return false
			}
			if (sale.address_id == null || sale.address_id === '') {
				return true
			}
			return address && Number(sale.address_id) === Number(address.id)
		},

		/**
		 * Misma lógica que con sucursal: contenedor creado sin empleado sigue en tabs "dueño".
		 * @param {Object} sale
		 * @param {Object|null} employee
		 * @returns {boolean}
		 */
		_mostrarContenedorConEmpleado(sale, employee) {
			if (!this.$store.state.sale.mostrar_consolidadas) {
				return false
			}
			if (!this.esVentaContenedorConsolidacion(sale)) {
				return false
			}
			if (typeof employee == 'undefined') {
				return !sale.employee_id
			}
			if (sale.employee_id == null) {
				return true
			}
			return Number(sale.employee_id) === Number(employee.id)
		},
	},

	computed: {
		selected_sale() {
			return this.$store.state.sale.model 
		},
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
			/**
			 * Misma lógica para resultados de búsqueda filtrada y listado crudo de modelos.
			 * @param {Object} sale
			 */
			const pasaFilaVenta = (sale) => {
				if (this.esVentaContenedorConsolidacion(sale) && !this.$store.state.sale.mostrar_consolidadas) {
					return false
				}
				return !sale.to_check && !sale.checked
			}

			if (this.is_filtered) {
				return this.filtered.filter(pasaFilaVenta)
			}
			return this.$store.state.sale.models.filter(pasaFilaVenta)
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
					/** Incluye ventas contenedoras aunque address_id venga nulo (no se asigna al consolidar en API). */
					sales = this.sales.filter(sale => {
						if (this._mostrarContenedorConSucursal(sale, address)) {
							return true
						}
						return address && sale.address_id == address.id
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
							if (this._mostrarContenedorConEmpleado(sale, undefined)) {
								return true
							}
							return !sale.employee_id
						})	
					} else {
						sales = sales.filter(sale => {
							if (this._mostrarContenedorConEmpleado(sale, employee)) {
								return true
							}
							return sale.employee_id == employee.id
						})
					}
				}
			}

			if (this.ventas_cobradas == 'solo-cobradas') {
				sales = sales.filter(sale => {
					return this.venta_cobrada(sale)
				})
				console.log('solo-cobradas')
			} else if (this.ventas_cobradas == 'solo-sin-cobrar') {
				sales = sales.filter(sale => {
					return sale.client_id && sale.current_acount && sale.current_acount.status != 'pagado'
				})
			}

			if (this.afip_ticket_show_option == 'solo-con-factura') {
				console.log('entro solo-con-factura')
				sales = sales.filter(sale => {
					return sale.afip_tickets.length  > 0
				})
			} else if (this.afip_ticket_show_option == 'solo-sin-factura') {
				sales = sales.filter(sale => {
					return sale.afip_tickets.length == 0
				})
			}

			if (this.payment_method_show_option != 'todos') {

				sales = sales.filter(sale => {
					/** Contenedores no tienen medios de pago como las ventas reales; con "ver consolidadas" se muestran igual. */
					if (this.esVentaContenedorConsolidacion(sale) && this.$store.state.sale.mostrar_consolidadas) {
						return true
					}
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
}
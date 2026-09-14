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

		/**
		 * Resuelve la pestaña actual (sucursal/empleado) igual que sales_to_show, a ids.
		 *
		 * Vivía en Total.vue (lo usa el cuerpo del export a Excel) y se mudó acá el 14/9/2026
		 * porque ahora también lo necesita Ventas.vue, para mandarle a la API el alcance de la
		 * pantalla en el modo paginado (`sale/set_alcance_de_pantalla`). Total.vue y Ventas.vue
		 * mezclan este mixin, así que los dos lo ven.
		 *
		 * `view` y `sub_view` llevan los mismos defaults que sales_to_show (`/ventas` a secas es
		 * una URL legal y los deja en undefined): ahora se llama desde created(), y un
		 * `undefined.replaceAll` ahí dejaba la vista sin montar.
		 *
		 * @returns {{address_id: (number|null), employee_id: (number|null), only_owner: boolean}}
		 */
		resolve_view_scope() {
			let view = this.view || 'todas'
			let sub_view = this.sub_view || 'todos'

			// Id de sucursal resuelto por nombre de calle (street), null si es "todas".
			let address_id = null
			// Id de empleado resuelto por nombre, null si es "todos" o si es el caso "dueño".
			let employee_id = null
			// True cuando la sub_view es una pestaña de empleado pero ninguna venta tiene employee_id (caso dueño).
			let only_owner = false

			if (view != 'todas') {
				let address = this.addresses.find(model => {
					return model.street.toLowerCase() == view.replaceAll('-', ' ').toLowerCase()
				})
				if (typeof address != 'undefined') {
					address_id = address.id
				}
			}

			if (sub_view != 'todos') {
				let employee = this.employees.find(model => {
					return model.name.toLowerCase() == sub_view.replaceAll('-', ' ').toLowerCase()
				})
				if (typeof employee == 'undefined') {
					// Caso "dueño": ventas sin empleado asignado.
					only_owner = true
				} else {
					employee_id = employee.id
				}
			}

			return { address_id, employee_id, only_owner }
		},

		/**
		 * Cantidad de ventas del día de una sucursal, según el servidor.
		 *
		 * Los tres conteos de abajo devuelven null cuando no hay totales del servidor (API vieja,
		 * modo filtrado, otro módulo) —ahí el que llama cuenta en el navegador como siempre— y 0
		 * cuando los hay pero esa solapa no tiene ventas. Se compara con `==` porque los ids
		 * pueden venir como número o como string según de dónde salgan.
		 *
		 * @param {Number|String} address_id
		 * @returns {Number|null}
		 */
		cantidad_del_dia_por_sucursal(address_id) {
			if (!this.totales_del_dia || !Array.isArray(this.totales_del_dia.por_sucursal)) {
				return null
			}
			let fila = this.totales_del_dia.por_sucursal.find(item => {
				return item.address_id == address_id
			})
			return fila ? Number(fila.cantidad) : 0
		},

		/**
		 * Cantidad de ventas del día de un empleado, según el servidor (ver arriba).
		 *
		 * @param {Number|String} employee_id
		 * @returns {Number|null}
		 */
		cantidad_del_dia_por_empleado(employee_id) {
			if (!this.totales_del_dia || !Array.isArray(this.totales_del_dia.por_empleado)) {
				return null
			}
			let fila = this.totales_del_dia.por_empleado.find(item => {
				return item.employee_id == employee_id
			})
			return fila ? Number(fila.cantidad) : 0
		},

		/**
		 * Cantidad de ventas del día sin empleado (las del dueño), según el servidor (ver arriba).
		 *
		 * @returns {Number|null}
		 */
		cantidad_del_dia_sin_empleado() {
			if (!this.totales_del_dia || typeof this.totales_del_dia.sin_empleado == 'undefined') {
				return null
			}
			return Number(this.totales_del_dia.sin_empleado)
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
		/**
		 * Totales del día completo calculados por la API (modo paginado por fecha), o null.
		 *
		 * null en modo filtrado aunque el store tenga totales guardados: con el buscador general o
		 * un filtro de columna lo que se ve es `filtered` (todas las fechas), y ahí los totales y
		 * los conteos de las solapas siguen calculándose en el navegador sobre lo que se ve, como
		 * hasta ahora. Los totales del servidor describen el día, no la búsqueda.
		 *
		 * @returns {Object|null}
		 */
		totales_del_dia() {
			let state = this.$store.state.sale
			if (state.paginado_por_fecha && !state.is_filtered) {
				return state.totales_del_dia
			}
			return null
		},
		sales_to_show() {
			/*
			 * 🔴 `view` y `sub_view` salen de `$route.params`, y la ruta los declara OPCIONALES
			 * (`/ventas/:view?/:sub_view?`). O sea que `/ventas` a secas es una URL legal y deja los
			 * dos en `undefined`.
			 *
			 * Hasta el 31/8/2026 este computed los usaba sin chequear y `this.view.replaceAll(...)`
			 * tiraba "Cannot read properties of undefined (reading 'replaceAll')" en pleno render:
			 * el listado quedaba VACIO --"No hay Ventas"-- con las ventas cargadas en el store, y el
			 * unico rastro era un Vue warn en la consola. Le pasa a cualquiera que entre por una URL
			 * armada a mano o un favorito; desde el menu no se ve porque el item navega con
			 * `params: { view: 'todas' }`.
			 *
			 * Los defaults de aca son justamente los que declara esa ruta.
			 */
			let view = this.view || 'todas'
			let sub_view = this.sub_view || 'todos'

			let sales = []
			if (view == 'todas' && sub_view == 'todos') {
				sales = this.sales 
			} else {
				// let sales = []
				if (view == 'todas') {
					sales = this.sales 
				} else {
					let address = this.addresses.find(model => {
						return model.street.toLowerCase() == view.replaceAll('-', ' ').toLowerCase()
					})
					/** Incluye ventas contenedoras aunque address_id venga nulo (no se asigna al consolidar en API). */
					sales = this.sales.filter(sale => {
						if (this._mostrarContenedorConSucursal(sale, address)) {
							return true
						}
						return address && sale.address_id == address.id
					})
				}

				if (sub_view != 'todos') {
					let employee = this.employees.find(model => {
						// console.log('comparando '+model.name.toLowerCase()+' con '+sub_view.replaceAll('-', ' ').toLowerCase())
						return model.name.toLowerCase() == sub_view.replaceAll('-', ' ').toLowerCase()
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
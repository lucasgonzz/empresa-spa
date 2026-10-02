import limpiar from '@/mixins/devoluciones/limpiar'
export default {
	mixins: [limpiar],
	computed: {
		num_sale() {
			return this.$store.state.devoluciones.num_sale
		},
	},
	methods: {
		/**
		 * Busca la venta por su NÚMERO (`num_sale` del store) y carga sus renglones para devolver.
		 *
		 * Si el módulo estaba en modo Compra (p. ej. el botón "Nota de crédito" del detalle de una
		 * venta, apretado después de haber dejado una devolución a proveedor a medias), primero
		 * limpia lo de compra y pasa a Venta: sin esto quedaba una venta cargada con el proveedor
		 * de antes y el guardado salía por el camino de compra.
		 */
		search_sale() {

			if (this.$store.state.devoluciones.tipo != 'venta') {
				let num_sale = this.num_sale
				this.limpiar_devolucion()
				this.$store.commit('devoluciones/set_tipo', 'venta')
				this.$store.commit('devoluciones/set_num_sale', num_sale)
			}

			this.$store.commit('auth/setMessage', 'Buscando venta')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('devoluciones/search-sale/'+this.num_sale)
			.then(res => {
				
				this.$store.commit('auth/setLoading', false)

				let sale = res.data.sale  

				if (sale) {

					this.$store.commit('devoluciones/set_sale', sale)

				// Siempre resetear el cliente al de la venta buscada.
				// Si no hay cliente (sale.client = null), se fuerza a null para
				// evitar que quede un cliente residual de una búsqueda anterior.
				this.$store.commit('devoluciones/set_client', sale.client || null)

					if (sale.address_id) {

						this.$store.commit('devoluciones/set_address_id', sale.address_id)
					}

					if (sale.afip_ticket) {

						this.$store.commit('devoluciones/set_facturar_nota_credito', 1)
					} else {

						this.$store.commit('devoluciones/set_facturar_nota_credito', 0)
					}

					this.set_discounts_store_with_pivot_percetage(sale.discounts)
					this.set_surchages_store_with_pivot_percetage(sale.surchages)

					let discounts = sale.discounts.map(discount => discount.id)
					this.$store.commit('devoluciones/set_discounts_id', discounts)

					let surchages = sale.surchages.map(surchage => surchage.id)
					this.$store.commit('devoluciones/set_surchages_id', surchages)

					if (
						sale.client 
						&& !sale.omitir_en_cuenta_corriente
					) {

						this.$store.commit('devoluciones/set_generar_current_acount', 1)
					} else {

						this.$store.commit('devoluciones/set_generar_current_acount', 0)
					}


					if (
						sale.aplicar_recargos_directo_a_items 
					) {

						this.$store.commit('devoluciones/set_aplicar_recargos_directo_a_items', 1)
					} else {

						this.$store.commit('devoluciones/set_aplicar_recargos_directo_a_items', 0)
					}

					this.$store.commit('devoluciones/format_items', sale)
				} else {

					this.$store.commit('devoluciones/set_sale', null)
					this.$toast.error('No se encontro venta')
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
			})
		},

		set_discounts_store_with_pivot_percetage(previus_discounts) {

			previus_discounts.forEach(previus_discount => {

				let store_discount = this.$store.state.discount.models.find(discount => {
					return discount.id == previus_discount.id 
				})

				if (typeof store_discount == 'undefined') {
					previus_discount.percentage = previus_discount.pivot.percentage
					this.$store.commit('discount/add', previus_discount)
				} else {

					if (previus_discount.pivot.percentage != store_discount.percentage) {

						store_discount.updated_percentage = store_discount.percentage
						store_discount.percentage = previus_discount.pivot.percentage

					}
				}
			})
		},
		set_surchages_store_with_pivot_percetage(previus_surchages) {

			previus_surchages.forEach(previus_surchage => {

				let store_surchage = this.$store.state.surchage.models.find(surchage => {
					return surchage.id == previus_surchage.id 
				})

				if (typeof store_surchage == 'undefined') {
					previus_surchage.percentage = previus_surchage.pivot.percentage
					this.$store.commit('surchage/add', previus_surchage)
				} else {

					if (previus_surchage.pivot.percentage != store_surchage.percentage) {

						store_surchage.updated_percentage = store_surchage.percentage
						store_surchage.percentage = previus_surchage.pivot.percentage

					}

				}

			})

		},
	}
}
export default {
	methods: {
		se_puede_actualizar_venta(sale = null) {

			if (!this.hasPermissionTo('sale.update')) {
				console.log('no puede 1')
				return false
			}
			
			if (sale) {

				if (sale.is_cerrada) {

					return false 
				}

				if (sale.afip_tickets.length) {
					console.log('no puede 2')

					return false 
				}

				if (sale.caja_id 
					&& sale.caja_id != 0) {
					console.log('no puede 3')

					return false
				}

				if (sale.current_acount_payment_methods
					&& sale.current_acount_payment_methods.length >= 1
					&& this.$store.state.caja.models.length 
				) {
					
					console.log('no puede 4')

					return false
				}
			}

			return true
		},

		/**
		 * Indica si la venta se cobro repartida en mas de un metodo de pago.
		 *
		 * @param {Object} sale
		 * @returns {boolean}
		 */
		tiene_multiples_metodos_de_pago(sale) {

			if (!sale || !sale.current_acount_payment_methods) {

				return false
			}

			return sale.current_acount_payment_methods.length > 1
		},

		/**
		 * Indica si se puede editar el CONTENIDO de la venta (articulos, precios, cliente).
		 *
		 * Es mas estricto que se_puede_actualizar_venta(): ademas de todo lo de aquel, exige que
		 * la venta no tenga un reparto en multiples metodos de pago.
		 *
		 * POR QUE ES UN METODO APARTE Y NO UNA CONDICION MAS ADENTRO DEL OTRO (no unificar):
		 * se_puede_actualizar_venta() tambien decide si se muestra el boton "Cerrar" en
		 * ventas/components/table-buttons/CerrarVenta.vue. Meterle esta condicion adentro haria
		 * desaparecer el boton Cerrar de toda venta con reparto, y en su lugar CerrarVenta.vue
		 * pinta un badge que dice "Cerrada" sobre una venta que no lo esta. Cerrar una venta y
		 * editar su contenido son dos permisos distintos y tienen que preguntarse distinto.
		 *
		 * @param {Object} sale
		 * @returns {boolean}
		 */
		se_puede_editar_venta(sale = null) {

			if (!this.se_puede_actualizar_venta(sale)) {

				return false
			}

			return !this.tiene_multiples_metodos_de_pago(sale)
		},
	}
}
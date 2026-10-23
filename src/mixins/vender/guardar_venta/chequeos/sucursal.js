export default {
	computed: {
		items() {
			return this.$store.state.vender.items
		},
		articulos_con_depositos() {

			return this.items.filter(item => {
				if (item.is_article) {
					if (item.addresses.length) {
						return true 
					}  
					if (item.article_variants.length) {

						let has_addresses = false
						item.article_variants.forEach(variant => {

							if (variant.addresses.length) {
								has_addresses = true 
							}
						})

						return has_addresses
					}
				}
				return false
			})
		},
		addresses() {
			return this.$store.state.address.models 
		},
	},
	methods: {
		/**
		 * Frena si la cuenta tiene sucursales y el comprobante no tiene ninguna elegida.
		 *
		 * @param {string} comprobante como se nombra el comprobante en el aviso: 'de la venta'
		 *                             (default, lo que siempre dijo) o 'del presupuesto', que
		 *                             es lo que manda BtnGuardar.check() cuando se guarda como
		 *                             presupuesto. Solo cambia el texto; la condicion es la
		 *                             misma para los dos, porque la sucursal del presupuesto es
		 *                             la que hereda la venta al confirmarlo (BudgetHelper::saveSale
		 *                             arrastra address_id tal cual, null incluido).
		 * @returns {boolean}
		 */
		check_sucursal(comprobante = 'de la venta') {

			/*
				Misión sucursal-siempre (23/10/2026, D1 y D6): se exige solo desde la SEGUNDA sucursal,
				que es cuando el selector está a la vista. Con una sola, Vender ya la eligió sola; y si
				justo no llegó a elegirla (las sucursales todavía no cargaron), la venta sale sin
				sucursal y la API la manda a la principal (D3), que es la única. Frenar acá con un
				selector escondido dejaría al vendedor sin salida.
			*/
			// if (this.address_id == 0 && this.articulos_con_depositos.length) {
			if (this.address_id == 0 && this.muestra_sucursales) {
				// this.$toast.error('Hay '+this.articulos_con_depositos.length+' articulos con stock en diferentes depositos')
				this.$toast.error('Indique la SUCURSAL ' + comprobante + ' para restar el stock en los depositos que correspondan')
				return false
			}

			return true
		}
	}
}
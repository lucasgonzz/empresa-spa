export default {
	computed: {
		afip_informations() {
			return this.$store.state.afip_information.models 
		},
		client() {
			return this.$store.state.vender.client 
		},
		afip_information_id() {
			return this.$store.state.vender.afip_information_id 
		},
	},
	methods: {
		set_afip_tipo_comprobante() {

			let tipo_compobante_id = this.get_afip_tipo_comprobante(this.afip_information_id, this.client)

			/*
				null es "no se pudo resolver" (el punto de venta no esta en el catalogo, ver
				abajo): se deja el tipo que haya en vez de pisarlo con 0 o reventar. Cuando el
				catalogo llegue, el proximo cambio de cliente o de punto de venta lo recalcula.
			*/
			if (tipo_compobante_id === null) {
				return
			}

			this.$store.commit('vender/set_afip_tipo_comprobante_id', tipo_compobante_id)
		},
		/**
		 * El tipo de comprobante que corresponde a un punto de venta y un cliente.
		 *
		 * @returns {number|null} 0 sin punto de venta; 1/2/3 resuelto; null si el punto de
		 *                        venta no se pudo resolver contra el catalogo afip_information.
		 */
		get_afip_tipo_comprobante(afip_information_id = 0, client = null) {

			let afip_tipo_comprobante = 0


			if (afip_information_id) {

				let punto_de_venta = Array.isArray(this.afip_informations)
					? this.afip_informations.find(model => model.id == afip_information_id)
					: undefined

				/*
					🔴 Guarda sobre el catalogo. Si el arranque todavia no trajo afip_information
					(o el id apunta a un punto de venta que ya no existe), `find` da undefined y
					la linea de abajo tiraba TypeError. En SelectClient.setSelected() esa llamada
					va ultima, DESPUES de commitear el cliente y resolver la lista: el cliente
					quedaba seteado y el tipo de comprobante no, y el error subia sin que nada lo
					atajara. Se loguea y se devuelve null para que el llamador no toque el tipo.
				*/
				if (typeof punto_de_venta == 'undefined' || !punto_de_venta.iva_condition) {
					console.log(
						'get_afip_tipo_comprobante: el punto de venta ' + afip_information_id
						+ ' no esta en el catalogo afip_information ('
						+ (Array.isArray(this.afip_informations) ? this.afip_informations.length : 'sin catalogo')
						+ ' cargados): no se resuelve el tipo de comprobante'
					)
					return null
				}

				if (
					punto_de_venta.iva_condition.name == 'Monotributista'
					|| punto_de_venta.iva_condition.name == 'Exento'
				) {

					afip_tipo_comprobante = 3

				} else {
					if (
						client
						&& (
							client.iva_condition_id == 1
							|| client.iva_condition_id == 2 
						)
					) {

						afip_tipo_comprobante = 1
					} else {

						afip_tipo_comprobante = 2
					}
				}
				
			} 

			return afip_tipo_comprobante
		}
	}
}
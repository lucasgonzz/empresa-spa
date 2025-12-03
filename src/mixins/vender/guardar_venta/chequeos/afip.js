export default {
	computed: {
		afip_information_id() {
			return this.$store.state.vender.afip_information_id
		},
		afip_tipo_comprobante_id() {
			return this.$store.state.vender.afip_tipo_comprobante_id
		},
		client() {
			return this.$store.state.vender.client
		},
		total() {
			return this.$store.state.vender.total
		},
	},
	methods: {
		check_afip() {

			if (this.afip_information_id) {

				// Esto es para Feito, si es efectivo, no pide que se indique el tipo de comprobante
				if (this.check_metodos_de_pago_para_facturar()) {
					return true
				}
				
				if (!this.afip_tipo_comprobante_id) {

					this.$toast.error('Indique el Tipo de Comprobante a Facturar')
					return false
				}

				if (this.afip_tipo_comprobante_id == 1 
					|| this.afip_tipo_comprobante_id == 4
					|| this.afip_tipo_comprobante_id == 5) {

					if (!this.client) {

						this.$toast.error('Para Factura A, debe indicar un Cliente')
						return false
					}

					if (!this.client.cuit) {

						this.$toast.error('Para Factura A, el Cliente debe tener asignado un CUIT')
						return false
					}
				}

				if (this.total >= 1000000) {
						

					if (!this.client) {

						this.$toast.error('Para montos mayores a $1.000.000, debe indicar el receptor')
						return false
					}			

					if (!this.client.dni && !this.client.cuit) {

						this.$toast.error('Para montos mayores a $1.000.000, el cliente debe tener asignado un CUIT o DNI')
						return false
					}					
				}
			
			}

			return true
		},

		check_metodos_de_pago_para_facturar() {
			let metodos_de_pago_para_facturar = this.$store.state.afip_selected_payment_method.models 

			let metodo_de_pago_se_factura = false

			if (this.current_acount_payment_method_id && metodos_de_pago_para_facturar.length) {

				metodos_de_pago_para_facturar.forEach(metodo_de_pago => {
					if (metodo_de_pago.id == this.current_acount_payment_method_id) {
						metodo_de_pago_se_factura = true
					}
				})
			}

			return metodo_de_pago_se_factura
		},	
	}
}
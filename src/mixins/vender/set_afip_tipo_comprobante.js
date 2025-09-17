export default {
	computed: {
		client() {
			return this.$store.state.vender.client 
		},
		afip_information_id: {
			get() {
				return this.$store.state.vender.afip_information_id 
			},
			set(value) {
				this.$store.commit('vender/setAfipInformationId', value) 
			}
		},
		afip_informations() {
			return this.$store.state.afip_information.models 
		},
	},
	methods: {
		set_afip_tipo_comprobante() {

			if (this.afip_information_id) {

				let punto_de_venta = this.afip_informations.find(model => model.id == this.afip_information_id)

				if (punto_de_venta.iva_condition.name == 'Monotributista') {

					this.$store.commit('vender/set_afip_tipo_comprobante_id', 3) 

				} else {
					if (
						this.client
						&& this.client.iva_condition_id == 1
					) {

						this.$store.commit('vender/set_afip_tipo_comprobante_id', 1) 
					} else {

						this.$store.commit('vender/set_afip_tipo_comprobante_id', 2) 
					}
				}
				
			} else {

				this.$store.commit('vender/set_afip_tipo_comprobante_id', 0) 
			}
		}
	}
}
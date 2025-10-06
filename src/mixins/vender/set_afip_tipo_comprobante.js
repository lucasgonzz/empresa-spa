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

			this.$store.commit('vender/set_afip_tipo_comprobante_id', tipo_compobante_id)
		},
		get_afip_tipo_comprobante(afip_information_id = 0, client = null) {

			let afip_tipo_comprobante = 0

			if (afip_information_id) {

				let punto_de_venta = this.afip_informations.find(model => model.id == afip_information_id)

				if (punto_de_venta.iva_condition.name == 'Monotributista') {

					afip_tipo_comprobante = 3

				} else {
					if (
						client
						&& client.iva_condition_id == 1
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
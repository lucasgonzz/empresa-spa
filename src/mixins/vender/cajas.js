export default {
	computed: {
		// cajas() {
		// 	return this.$store.state.caja.models 
		// },
		vender_address_id() {
			return this.$store.state.vender.address_id 
		},
		default_payment_method_cajas() {
			return this.$store.state.default_payment_method_caja.models 
		},
	},
	data() {
		return {
			cajas_habilitadas: 0,
			count_se_habilitaron_las_cajas: {
				payment_method_id: 0,
				address_id: 0,
				count: 0,
			},
		}
	},
	methods: {
		set_cajas_habilitadas(payment_method_id) {

			this.count_se_habilitaron_las_cajas.payment_method_id = payment_method_id
			
			this.count_se_habilitaron_las_cajas.address_id = this.vender_address_id

			this.count_se_habilitaron_las_cajas.count++

			this.cajas_habilitadas = this.cajas_abiertas.filter(caja => {

				if (caja.current_acount_payment_methods.length) {

					let payment_method_vender = caja.current_acount_payment_methods.find(payment_method => {
						
						return payment_method.id == payment_method_id
					})

					return typeof payment_method_vender != 'undefined'
				}

				return true
				
			})

			// Obtén la caja por defecto
			let caja_default = this.default_payment_method_cajas.find(caja_default => {
				return caja_default.current_acount_payment_method_id == payment_method_id 
					&& caja_default.address_id == this.vender_address_id
			})

			// Si existe una caja por defecto, ordénala primero
			if (caja_default) {




				this.$store.commit('vender/set_caja_id', caja_default.caja_id)
				
				this.cajas_habilitadas.sort((a, b) => {
					if (a.id === caja_default.caja_id) return -1
					if (b.id === caja_default.caja_id) return 1
					return 0
				})
			}

		},
		get_caja_options(payment_method_id) {

			let options = [{
				value: 0,
				text: 'Seleccione caja'
			}]


			if (this.count_se_habilitaron_las_cajas.count < 3) {
				
				this.set_cajas_habilitadas(payment_method_id)
			} else {

				if (this.count_se_habilitaron_las_cajas.payment_method_id != payment_method_id) {

					this.count_se_habilitaron_las_cajas.count = 0
					this.set_cajas_habilitadas(payment_method_id)
				}

				if (this.count_se_habilitaron_las_cajas.address_id != this.vender_address_id) {

					this.count_se_habilitaron_las_cajas.count = 0
					this.set_cajas_habilitadas(payment_method_id)
				}
			}


			this.cajas_habilitadas.forEach(caja => {

				options.push({
					value: caja.id,
					text: caja.name,
				})
			})

			return options
		},
	}
}
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
	methods: {
		get_cajas_habilitadas(payment_method_id) {

			// let cajas_abiertas = this.cajas.filter(caja => caja.abierta)

			let cajas_habilitadas = this.cajas_abiertas.filter(caja => {
				
				let payment_method_vender = caja.current_acount_payment_methods.find(payment_method => {
					
					return payment_method.id == payment_method_id
				})

				return typeof payment_method_vender != 'undefined'
			})

			// Obtén la caja por defecto
			let caja_default = this.default_payment_method_cajas.find(caja_default => {
				return caja_default.current_acount_payment_method_id == payment_method_id 
					&& caja_default.address_id == this.vender_address_id
			})

			console.log('caja_default')
			console.log(caja_default)
			// Si existe una caja por defecto, ordénala primero
			if (caja_default) {

				console.log('se va a poner caja por defecto id: '+caja_default.caja_id)

				this.$store.commit('vender/set_caja_id', caja_default.caja_id)
				
				cajas_habilitadas.sort((a, b) => {
					if (a.id === caja_default.caja_id) return -1
					if (b.id === caja_default.caja_id) return 1
					return 0
				})
			}

			return cajas_habilitadas
		},
		get_caja_options(payment_method_id) {
			let options = [{
				value: 0,
				text: 'Seleccione caja'
			}]

			this.get_cajas_habilitadas(payment_method_id).forEach(caja => {

				options.push({
					value: caja.id,
					text: caja.name,
				})
			})

			return options
		},
	}
}
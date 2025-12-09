export default {
	computed: {
		cajas() {
			return this.$store.state.caja.models 
		},
		default_payment_method_cajas() {
			return this.$store.state.default_payment_method_caja.models 
		},
		cajas_abiertas() {
			return this.cajas.filter(caja => {
				return !caja.closed
			})
		},
	},
	data() {
		return {
			cajas_habilitadas: 0,
		}
	},
	methods: {
		get_caja_options(payment_method_id) {

			let options = [{
				value: null,
				text: 'Seleccione caja'
			}]

			let cajas_habilitadas = this.cajas_abiertas.filter(caja => {
				if (caja.current_acount_payment_methods.length) {
					let payment_method_vender = caja.current_acount_payment_methods.find(payment_method => {
						return payment_method.id == payment_method_id
					})
					return typeof payment_method_vender != 'undefined'
				}
				return true
			})

			cajas_habilitadas.forEach(caja => {
				options.push({
					value: caja.id,
					text: caja.name,
				})
			})

			return options
		},
	}
}
export default {
	computed: {
		cuotas() {
			return this.$store.state.cuota.models 
		},
		cuotas_options() {
			let options = [{
				value: 0,
				text: 'Seleccione cuotas'
			}]

			this.cuotas.forEach(cuota => {

				options.push({
					value: cuota.id,
					text: this.cuota_text(cuota),
				})
			})

			return options
		},
	},
	methods: {
		cuota_text(cuota) {
			let text = cuota.cantidad_cuotas + ' cuotas'

			if (cuota.descuento) {
				text += ' (-'+cuota.descuento+'%)'
			}

			if (cuota.recargo) {
				text += ' (+'+cuota.recargo+'%)'
			}

			return text 
		}
	}
}
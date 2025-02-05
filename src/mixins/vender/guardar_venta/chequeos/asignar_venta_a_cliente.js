export default {
	computed: {
		client() {
			return this.$store.state.vender.client
		},
	},
	methods: {

		// Este modulo se usa para controlar que en COLMAN asignen si o si un cliente a las ventas
		check_guardar_ventas_con_cliente() {
			if (this.hasExtencion('check_guardar_ventas_con_cliente')) {


				if (!this.client) {

					if (!this.user.puede_guardar_ventas_sin_cliente
						&& !this.is_admin) {

						this.$toast.error('Asigne un cliente para esta venta')
						return false 
					}
				}
			}
			return true
		},
	}
}
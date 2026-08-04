export default {
	computed: {
		pagos_de_clientes() {
			return this.$store.state.pago_de_cliente.models 
		},
		address_route() {
			return this.$store.state.address.models.find(_address => this.routeString(_address.street) == this.sub_view)
		},
		models_to_show() {

			if (!this.hasExtencion('filtrar_clientes_por_sucursal_en_vender')) {
				return this.pagos_de_clientes
			}

			if (this.sub_view == 'todas') {
				return this.pagos_de_clientes
			}


			return this.pagos_de_clientes.filter(pago => {

				// Catalogo completo (options, incluye address_id), no el store paginado que ya
				// no se descarga entero al iniciar sesion (grupo 332/342, 4/8/2026).
				let client = this.$store.state.client.options.find(_client => _client.id == pago.client_id)

				if (typeof client != 'undefined') {

					return client.address_id == this.address_route.id 
				}
				return false
			})
		}
	}
}
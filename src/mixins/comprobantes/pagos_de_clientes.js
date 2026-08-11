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

					// Un cliente sin sucursal asignada aparece en TODAS las sucursales (regla
					// unica del sistema, decision de Lucas 11/8/2026 — la misma que aplica el
					// buscador de clientes de VENDER). En la base conviven null y 0 para "sin
					// sucursal" porque el select del formulario del cliente arranca en 0, y el
					// ! de abajo cubre los dos casos.
					if (!client.address_id) {
						return true
					}

					return client.address_id == this.address_route.id
				}
				return false
			})
		}
	}
}
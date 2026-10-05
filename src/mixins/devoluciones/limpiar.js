export default {
	methods: {
		/**
		 * Deja el módulo de devoluciones en blanco: lo de venta y lo de compra.
		 *
		 * 🔴 NO toca `tipo`. Lo usan "Cancelar", el guardado exitoso y el cambio de modo del
		 * selector Venta/Compra: en los dos primeros el usuario sigue en el modo en el que estaba,
		 * y en el tercero el selector pone el modo nuevo después de limpiar. Si esto volviera a
		 * 'venta', cancelar una nota de crédito a proveedor lo patearía a Venta sin pedirlo.
		 *
		 * Las descripciones se reinician con una fila vacía (la que dibuja la tarjeta de
		 * Descripciones al montarse): antes quedaban las de la nota anterior y viajaban de nuevo
		 * en la siguiente.
		 */
		limpiar_devolucion() {
			this.$store.commit('devoluciones/set_num_sale', '')
			this.$store.commit('devoluciones/set_client', null)
			this.$store.commit('devoluciones/set_sale', null)
			this.$store.commit('devoluciones/set_num_provider_order', '')
			this.$store.commit('devoluciones/set_provider', null)
			this.$store.commit('devoluciones/set_provider_order', null)
			this.$store.commit('devoluciones/set_total_devolucion_manual', 0)
			this.$store.commit('devoluciones/set_address_id', 0)
			this.$store.commit('devoluciones/set_items', [])
			this.$store.commit('devoluciones/set_generar_current_acount', 0)
			this.$store.commit('devoluciones/set_regresar_stock', 1)
			this.$store.commit('devoluciones/set_facturar_nota_credito', 0)
			this.$store.commit('devoluciones/set_update_unidades_devueltas', 0)
			this.$store.commit('devoluciones/set_discounts_id', [])
			this.$store.commit('devoluciones/set_surchages_id', [])
			this.$store.commit('devoluciones/set_descriptions', [])
			this.$store.commit('devoluciones/add_description')
		},
	}
}

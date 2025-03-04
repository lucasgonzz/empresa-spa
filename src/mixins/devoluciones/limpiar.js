export default {
	methods: {
		limpiar_devolucion() {
			this.$store.commit('devoluciones/set_num_sale', '')
			this.$store.commit('devoluciones/set_client', null)
			this.$store.commit('devoluciones/set_sale', null)
			this.$store.commit('devoluciones/set_total_devolucion', 0)
			this.$store.commit('devoluciones/set_address_id', 0)
			this.$store.commit('devoluciones/set_articles', [])
			this.$store.commit('devoluciones/set_generar_current_acount', 0)
			this.$store.commit('devoluciones/set_regresar_stock', 1)
			this.$store.commit('devoluciones/set_facturar_nota_credito', 0)
		},
	}
}
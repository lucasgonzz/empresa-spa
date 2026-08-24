export default {
	computed: {
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		/*
			Reemplaza al indice posicional del store, que era la posicion de la venta en el
			listado y no un id. Ver el getter: es true mientras se este editando una venta
			guardada, y tambien en el instante en que se la esta abriendo y todavia no llego.
		*/
		editando_venta_previa() {
			return this.$store.getters['vender/previus_sales/editando_venta_previa']
		},
		items() {
			return this.$store.state.vender.items
		},
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
		item_vender() {
			return this.$store.state.vender.item
		},
		budget() {
			return this.$store.state.vender.budget
		},
		client() {
			return this.$store.state.vender.client
		},
		fecha_entrega() {
			return this.$store.state.vender.fecha_entrega
		},
		preguntar_cantidad() {
			return this.user.ask_amount_in_vender
		},
		current_acount_payment_method_id: {
			get() {
				return this.$store.state.vender.current_acount_payment_method_id 
			},
			set(value) {
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', value)
			},
		},
	}
}
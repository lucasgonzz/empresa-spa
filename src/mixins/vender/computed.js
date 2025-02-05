export default {
	computed: {
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		index_previus_sales() {
			return this.$store.state.vender.previus_sales.index
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
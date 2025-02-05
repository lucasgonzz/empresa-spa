export default {
	methods: {
		check_sale_type() {

			if (this.$store.state.sale_type.models.length && this.sale_type_id == 0) {
				this.$toast.error('Indique el tipo de venta')
				return false 
			} 
			return true
		}
	}
}
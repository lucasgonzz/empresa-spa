export default {
	computed: {
		puede_usar_discount_surchages() {
			if (this.user) {

				return this.can('sale.discount_surchage.aplicar')
			}
		},
		puede_crear_discount_surchages() {
			if (this.user) {

				return this.can('sale.discount_surchage.crear')
			}
		},
	}
}
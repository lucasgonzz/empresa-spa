import computed from '@/mixins/vender/computed'
export default {
	mixins: [computed],
	methods: {
		_limpiar_actualizandose_por() {
			if (this.previus_sale
				&& this.previus_sale.id 
				&& !this.budget) {
				
				this.$api.put('sale-clear-actualizandose-por/'+this.previus_sale.id)
				.catch(err => {
					this.$toast.error('Error al limpiar venta')
				})
			}
		},
	}
}
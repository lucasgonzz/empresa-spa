<template>
	<b-button
	size="sm"
	@click="nota_credito"
	variant="outline-danger">
		<i class="bi bi-arrow-counterclockwise"></i>
		Nota de crédito
	</b-button>
</template>
<script>
import set_from_sale from '@/mixins/devoluciones/set_from_sale'
export default {
	mixins: [set_from_sale],
	computed: {
		/**
		 * Venta cargada en el store del modal de detalle.
		 *
		 * @returns {Object}
		 */
		sale_details() {
			return this.$store.state.sale.model 
		},
	},
	methods: {
		/**
		 * Redirige al módulo de devoluciones con la venta precargada.
		 */
		nota_credito() {
			this.$store.commit('devoluciones/set_num_sale', this.sale_details.num)
			this.$router.push({name: 'devoluciones'})

			this.search_sale()
		}
	}
}
</script>

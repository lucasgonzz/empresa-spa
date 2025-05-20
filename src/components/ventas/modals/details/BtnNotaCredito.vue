<template>
	<b-button
	class="m-l-15"
	@click="nota_credito"
	variant="outline-danger">
		Nota de credito
	</b-button>
</template>
<script>
import set_from_sale from '@/mixins/devoluciones/set_from_sale'
export default {
	mixins: [set_from_sale],
	computed: {
		sale_details() {
			return this.$store.state.sale.model 
		},
	},
	methods: {
		nota_credito() {
			this.$store.commit('devoluciones/set_num_sale', this.sale_details.num)
			this.$router.push({name: 'devoluciones'})

			this.search_sale()
		}
	}
}
</script>
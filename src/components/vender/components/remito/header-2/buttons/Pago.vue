<template>
	<b-button-group
	class="btn-pago"
	v-if="maked_sale && maked_sale.client">
		<b-button
		@click="pago"
		variant="primary">
			<i class="icon-dolar"></i>
			Anotar Pago
		</b-button>
	</b-button-group>
</template>
<script>
export default {
	computed: {
		maked_sale() {
			return this.$store.state.vender.sale 
		},
	},
	methods: {
		pago() {
			this.$store.commit('current_acount/setFromModelName', 'client')
			this.$store.commit('current_acount/setFromModel', this.maked_sale.client)
			this.$bvModal.show('current-acounts-pago')
		}
	}
}
</script>
<template>
	<b-button-group
	class="btn-pago"
	v-if="maked_sale && maked_sale.client">
		<b-button
		@click="pago"
		variant="primary">
			Anotar Pago
		</b-button>
		<b-button
		@click="pago(true)"
		variant="success">
			<i class="icon-dolar"></i>
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
		pago(with_total = false) {
			this.$store.commit('current_acount/setFromModelName', 'client')
			this.$store.commit('current_acount/setFromModel', this.maked_sale.client)
			this.$bvModal.show('current-acounts-pago')
			setTimeout(() => {
				if (with_total) {
					document.getElementById('monto-pago').value = this.totalSale(this.maked_sale, false)
				} else {
					document.getElementById('monto-pago').value = ''
				}
			}, 200)
		}
	}
}
</script>
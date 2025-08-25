<template>
	<div>
		<h3
		class="m-b-0"
		v-if="is_owner">
			<strong>Total: {{ price(total) }}</strong>
		</h3>
	</div>
</template>
<script>
export default {
	computed: {
		total() {
			let total = 0
			this.cajas.forEach(caja => {
				total += Number(caja.saldo)
			})
			return total
		},
		cajas() {
			return this.$store.state.caja.models 
		},
	},
}
</script>
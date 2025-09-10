<template>
	<div>
		<div
		class="j-center"
		v-if="is_owner">
			
			<h3
			class="m-b-0">
				<strong>Total: {{ price(total) }}</strong>
			</h3>
			<h3
			class="m-b-0"
			v-if="hasExtencion('ventas_en_dolares')">
				<strong>Total USD: {{ price(total_usd) }}</strong>
			</h3>
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		total() {
			let total = 0
			this.cajas.forEach(caja => {
				if (
					caja.moneda_id === null
					|| caja.moneda_id == 1
				)
				total += Number(caja.saldo)
			})
			return total
		},
		total_usd() {
			let total = 0
			this.cajas.forEach(caja => {
				if (caja.moneda_id == 2) {
					total += Number(caja.saldo)
				}
			})
			return total
		},
		cajas() {
			return this.$store.state.caja.models 
		},
	},
}
</script>
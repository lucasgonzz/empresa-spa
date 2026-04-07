<template>
	<div>
		<p
		class="m-t-15 m-b-0 m-l-15"
		v-if="filtered.length">
			Suma de los saldos en pesos: <strong>{{ suma_saldos_pesos }}</strong>
		</p>
		<p
		class="m-t-15 m-b-0 m-l-15"
		v-if="filtered.length && hasExtencion('ventas_en_dolares')">
			Suma de los saldos en dolares: <strong>{{ suma_saldos_dolares }}</strong>
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		filtered() {
			return this.$store.state.client.filtered
		},
		suma_saldos_pesos() {
			let total = 0
			this.filtered.forEach(client => {
				total += Number(client.saldo_pesos)
			})
			return this.price(total)
		},
		suma_saldos_dolares() {
			let total = 0
			this.filtered.forEach(client => {
				total += Number(client.saldo_dolares)
			})
			return this.price(total)
		},
	}
}
</script>
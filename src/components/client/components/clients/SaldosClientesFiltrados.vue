<template>
	<p
	class="m-t-15 m-b-0 m-l-15"
	v-if="filtered.length">
		Suma de los saldos: <strong>{{ suma_saldos }}</strong>
	</p>
</template>
<script>
export default {
	computed: {
		filtered() {
			return this.$store.state.client.filtered
		},
		suma_saldos() {
			let total = 0
			this.filtered.forEach(client => {
				total += Number(client.saldo)
			})
			return this.price(total)
		}
	}
}
</script>
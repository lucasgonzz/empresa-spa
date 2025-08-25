<template>
	<div
	class="custom-card card-payment-plan p-15 m-b-15"
	v-if="sale">
		<p>
			Venta N° {{ sale.num }}
		</p>
		<p>
			Total: <strong>{{ price(sale.total) }}</strong>
		</p>
		<p
		v-if="sale.client">
			Cliente: <strong>{{ sale.client.name }}</strong>
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		sale() {
			return this.$store.state.sale.model
		},
	},
}
</script>
<style lang="sass">
.card-payment-plan
	width: 200px !important
</style>
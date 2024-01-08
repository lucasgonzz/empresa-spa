<template>
	<b-dropdown-item
	@click="resetStock">
		<i class="icon-cancel"></i>
		Resetear Stock a 0
	</b-dropdown-item>
</template>
<script>
export default {
	methods: {
		resetStock() {
			this.$bvModal.show('confirm-reset-stock')
		}
	}
}
</script>
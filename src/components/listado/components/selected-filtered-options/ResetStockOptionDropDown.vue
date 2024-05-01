<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		
		<b-dropdown-item
		@click="resetStock">
			<i class="icon-cancel"></i>
			Resetear Stock a 0
		</b-dropdown-item>
	</div>
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
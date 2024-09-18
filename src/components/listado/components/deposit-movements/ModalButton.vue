<template>
	<b-button
	class="m-l-15"
	@click="show_modal">
		<i class="icon-refresh"></i>
		Mov. Depositos
	</b-button>
</template>
<script>
export default {
	methods: {
		show_modal() {
			this.$store.dispatch('deposit_movement/getModels')
			this.$bvModal.show('deposit-movements')
		}
	}
}
</script>
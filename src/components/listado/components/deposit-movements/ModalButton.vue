<template>
	<b-button
	class="m-l-15"
	dusk="btn_deposit_movements"
	@click="show_modal">
		<i class="icon-refresh"></i>
		Depositos
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
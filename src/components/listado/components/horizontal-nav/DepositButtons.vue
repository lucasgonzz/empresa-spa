<template>
	<b-dropdown
	right
	class="m-l-15"
	text="Depositos"
	variant="primary">
		<b-dropdown-item
		dusk="btn_deposit_movements"
		@click="show_modal_movements">
			<i class="bi bi-arrow-left-right m-r-5"></i>
			Movimientos
		</b-dropdown-item>
		<b-dropdown-item
		@click="show_modal_sugerencias">
			<i class="bi bi-lightbulb m-r-5"></i>
			Sugerencias
		</b-dropdown-item>
	</b-dropdown>
</template>
<script>
export default {
	methods: {
		show_modal_sugerencias() {
			this.$store.dispatch('stock_suggestion/getModels')
			this.$bvModal.show('stock-suggestions')
		},
		show_modal_movements() {
			this.$store.dispatch('deposit_movement/getModels')
			this.$bvModal.show('deposit-movements')
		}
	}
}
</script>
<template>
	<b-button
	class="m-l-15"
	@click="show_modal">
		<i class="icon-refresh"></i>
		Sugerencias
	</b-button>
</template>
<script>
export default {
	methods: {
		show_modal() {
			this.$store.dispatch('stock_suggestion/getModels')
			this.$bvModal.show('stock-suggestions')
		}
	}
}
</script>
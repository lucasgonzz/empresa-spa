<template>
	<b-button
	class="m-l-15"
	variant="success"
	@click="show_modal">
		<i class="icon-filter"></i>
		Combos
	</b-button>
</template>
<script>
export default {
	methods: {
		show_modal() {
			this.$store.dispatch('combo/getModels')
			this.$bvModal.show('combos')
		}
	}
}
</script>
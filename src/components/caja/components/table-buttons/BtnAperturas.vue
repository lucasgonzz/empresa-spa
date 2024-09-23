<template>
	<b-button
	class="m-r-10"
	@click.stop="show_aperturas"
	variant="outline-primary">
		Aperturas
	</b-button>
</template>
<script>
export default {
	props: {
		caja: Object,
	},
	methods: {
		show_aperturas() {

			this.$store.commit('apertura_caja/set_route_prefix', this.caja.id)
			this.$store.dispatch('apertura_caja/getModels')

			this.$bvModal.show('aperturas-caja')
		},
	}
}
</script>
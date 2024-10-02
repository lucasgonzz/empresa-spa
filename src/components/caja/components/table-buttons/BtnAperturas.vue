<template>
	<b-button
	class="m-l-10"
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

			this.$store.commit('caja/setModel', {
				model: this.caja,
				properties: [],
			})

			this.$store.commit('apertura_caja/set_route_prefix', this.caja.id)
			this.$store.dispatch('apertura_caja/getModels')

			this.$bvModal.show('aperturas-caja')
		},
	}
}
</script>
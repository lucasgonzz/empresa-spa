<template>
	<b-button
	v-if="caja.abierta"
	class="m-r-10"
	@click.stop="show_movimientos"
	variant="primary">
		Mov
	</b-button>
</template>
<script>
export default {
	props: {
		caja: Object,
	},
	methods: {
		show_movimientos() {

			this.$store.commit('caja/setModel', {model: this.caja, properties: []})

			this.set_apertura_caja()

			this.$store.commit('movimiento_caja/set_route_prefix', this.caja.current_apertura_caja_id)
			this.$store.dispatch('movimiento_caja/getModels')

			this.$bvModal.show('movimientos-caja')
		},
		set_apertura_caja() {

			this.$api.get('apertura-caja/show/'+this.caja.current_apertura_caja_id)
			.then(res => {

				this.$store.commit('apertura_caja/setModel', {model: res.data.model, properties: []})
			})
		}
	}
}
</script>
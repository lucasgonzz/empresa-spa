<template>
	<btn-accion
	icono="bi bi-clock-history"
	texto="Aperturas"
	@clicked="show_aperturas"></btn-accion>
</template>
<script>
export default {
	props: {
		caja: Object,
	},
	components: {
		BtnAccion: () => import('@/components/caja/components/table-buttons/BtnAccion'),
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

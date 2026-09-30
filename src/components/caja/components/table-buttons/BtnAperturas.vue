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
			// Siempre desde la primera página y sin filas de la caja anterior a la vista.
			this.$store.commit('apertura_caja/setModels', [])
			this.$store.commit('apertura_caja/set_paginacion_aperturas', {pagina: 1, total: 0, ultima_pagina: 1})
			this.$store.dispatch('apertura_caja/cargar_pagina', 1)

			this.$bvModal.show('aperturas-caja')
		},
	}
}
</script>

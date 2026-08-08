<template>
	<btn-accion
	icono="bi bi-percent"
	texto="Liquidación"
	@clicked="show_liquidacion_config"></btn-accion>
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
		/**
		 * Abre el modal de overrides de liquidación/comisión por método de pago para esta caja.
		 * Carga los overrides existentes filtrados por caja (route_prefix = caja.id, matchea
		 * la ruta del backend GET caja-liquidacion-config/{caja_id}).
		 *
		 * @returns {void}
		 */
		show_liquidacion_config() {

			this.$store.commit('caja/setModel', {
				model: this.caja,
				properties: [],
			})

			this.$store.commit('caja_liquidacion_config/set_route_prefix', this.caja.id)
			this.$store.dispatch('caja_liquidacion_config/getModels')

			this.$bvModal.show('liquidacion-config-caja')
		},
	}
}
</script>

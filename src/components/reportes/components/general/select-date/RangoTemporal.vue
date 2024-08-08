<template>
<div
class="cont-rango-de-fechas">
	<b-form-group
	v-if="rango_temporal == 'rango-de-fechas'"
	label="Desde">
		<b-form-input
		v-model="mes_inicio"
		type="month"></b-form-input>
	</b-form-group>

	<b-form-group
	v-if="rango_temporal == 'rango-de-fechas'"
	label="Hasta">
		<b-form-input
		v-model="mes_fin"
		type="month"></b-form-input>
	</b-form-group>
</div>
</template>
<script>
export default {
	computed: {
		rango_temporal: {
			get() {
				return this.$store.state.reportes.rango_temporal
			},
			set(value) {
				this.$store.commit('reportes/setRangoTemporal', value)
			}
		},
		mes_inicio: {
			get() {
				return this.$store.state.reportes.mes_inicio
			},
			set(value) {
				this.$store.commit('reportes/setMesInicio', value)
			}
		},
		mes_fin: {
			get() {
				return this.$store.state.reportes.mes_fin
			},
			set(value) {
				this.$store.commit('reportes/setMesFin', value)
			}
		},
	},
}
</script>
<style lang="sass">
.cont-rango-de-fechas
	display: flex 
	@media screen and (max-width: 825px)
		flex-direction: column 
		align-items: flex-start		
	@media screen and (min-width: 825px)
		flex-direction: row 
</style>

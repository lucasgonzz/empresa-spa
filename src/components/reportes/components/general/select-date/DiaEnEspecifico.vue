<template>
<div>
	<b-form-group
	v-if="rango_temporal == 'dia-en-especifico'"
	label="En la fecha">
		<b-form-input
		type="date"
		v-model="mes_inicio"></b-form-input>
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
	},
}
</script>
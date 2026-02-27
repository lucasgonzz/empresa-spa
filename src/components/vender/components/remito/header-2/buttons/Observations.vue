<template>
	<div
	class="cont-observations">
		
		<b-form-textarea
		v-model="observations"
		placeholder="Observaciones"></b-form-textarea>
		
		<!-- <b-form-textarea
		v-model="observations_ocultas"
		placeholder="Observaciones ocultas (no salen impresas para el cliente)"></b-form-textarea> -->
	</div>
</template>
<script>
export default {
	computed: {
		observations: {
			set(value) {
				this.$store.commit('vender/setObservations', value)
			}, 
			get() { 
				return this.$store.state.vender.observations 
			}
		},
		observations_ocultas: {
			set(value) {
				this.$store.commit('vender/setObservationsOcultas', value)
			}, 
			get() { 
				return this.$store.state.vender.observations_ocultas 
			}
		},
	},
}
</script>
<style lang="sass">
.cont-observations
	width: 100%
	display: flex
	flex-direction: row  
	justify-content: space-between
	textarea 
		width: 100%
		// width: 49%
</style>
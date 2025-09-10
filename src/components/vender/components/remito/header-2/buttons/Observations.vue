<template>
	<b-form-textarea
	v-model="observations"
	placeholder="Observaciones"></b-form-textarea>
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
	},
}
</script>
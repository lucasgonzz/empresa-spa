<template>
	<b-form-group
	label="Observaciones">
		<b-form-textarea
		v-model="observations"
		:rows="5"
		placeholder="Observaciones"></b-form-textarea>
	</b-form-group>
</template>
<script>
export default {
	computed: {
		observations: {
			get() {
				return this.$store.state.vender.observations
			},
			set(value) {
				this.$store.commit('vender/setObservations', value)
			}
		},
	},
}
</script>
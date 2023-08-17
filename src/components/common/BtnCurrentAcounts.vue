<template>
	<b-button
	class="m-l-15"
	@click.stop="showCurrentAcounts()"
	variant="success">
		C/C
	</b-button> 
</template>
<script>
export default {
	props: {
		model_name: String,
		model: Object,
	},
	methods: { 
		showCurrentAcounts() {
			this.$store.commit('current_acount/setFromModelName', this.model_name)
			this.$store.commit('current_acount/setFromModel', this.model)
			this.$store.dispatch('current_acount/getModels')
			this.$bvModal.show('current-acounts')
		},
	},
}
</script>
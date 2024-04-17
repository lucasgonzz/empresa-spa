<template>
	<b-button
	@click.stop="show"
	variant="primary">
		Mod
	</b-button>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		show() {
			this.setModel(this.model, 'sale', [], false, false) 
			this.$bvModal.show('sale-modifications')
		}
	}
}
</script>
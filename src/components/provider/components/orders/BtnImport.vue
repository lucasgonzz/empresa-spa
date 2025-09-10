<template>
	<b-button
	class="m-l-15"
	size="sm"
	variant="success"
	@click.stop="setImportModel"
	v-b-modal="">
		<i class="icon-download"></i>
		Importar excel
	</b-button>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		setImportModel() {
			this.$store.commit('provider_order/setModel', {
				model: this.model,
				properties: [],
			})
			this.$bvModal.show('import-provider_order')
		}
	}
}
</script>
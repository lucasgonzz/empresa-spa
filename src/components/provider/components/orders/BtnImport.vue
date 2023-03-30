<template>
	<b-button
	class="m-l-15"
	variant="outline-primary"
	@click="setImportModel"
	v-b-modal="">
		Importar articulos
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
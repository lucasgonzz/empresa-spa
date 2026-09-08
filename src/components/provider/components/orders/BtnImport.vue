<template>
	<!--
		El testid lleva el id de la compra porque este bloque de botones se repite en CADA fila de
		la tabla: sin el, un [data-testid="btn-importar-excel"] devolveria tantos elementos como
		compras haya en pantalla. Mismo criterio que `btn-stock-movements-<id>` del listado.
	-->
	<b-button
	:data-testid="'btn-importar-excel-'+model.id"
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
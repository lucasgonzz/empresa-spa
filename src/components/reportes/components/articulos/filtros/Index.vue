<template>
	<div>
		
		<b-row
		class="article-purchase-filtros">
			<b-col
			lg="3">
				<select-client></select-client>
			</b-col>
			<b-col
			lg="3">
				<select-provider></select-provider>
			</b-col>
			<b-col
			lg="3">
				<select-category></select-category>
			</b-col>
			<b-col
			lg="3">
				<select-address></select-address>
			</b-col>
		</b-row>

		<b-row>
			<b-col
			lg="3">
				<cantidad-resultados></cantidad-resultados>
			</b-col>
			<b-col
			lg="3">
				<orden></orden>
			</b-col>
			<b-col
			lg="3">
				<sale-channel></sale-channel>
			</b-col>
			<b-col
			lg="3">
				<btn-buscar></btn-buscar>
			</b-col>
		</b-row>
	</div>
</template>
<script>
export default {
	components: {
		SelectClient: () => import('@/components/reportes/components/articulos/filtros/SelectClient'),
		SelectProvider: () => import('@/components/reportes/components/articulos/filtros/SelectProvider'),
		SelectCategory: () => import('@/components/reportes/components/articulos/filtros/SelectCategory'),
		SelectAddress: () => import('@/components/reportes/components/articulos/filtros/SelectAddress'),
		CantidadResultados: () => import('@/components/reportes/components/articulos/filtros/CantidadResultados'),
		SaleChannel: () => import('@/components/reportes/components/articulos/filtros/SaleChannel'),
		Orden: () => import('@/components/reportes/components/articulos/filtros/Orden'),
		BtnBuscar: () => import('@/components/reportes/components/articulos/filtros/BtnBuscar'),
	},
	created() {
		this.limpiar_filtros()
	},
	methods: {
		limpiar_filtros() {
			this.$store.commit('reportes/article_purchase/set_category_id', null)
			this.$store.commit('reportes/article_purchase/set_client_id', null)
			this.$store.commit('reportes/article_purchase/set_provider_id', null)
		}
	}
}
</script>
<style lang="sass">
.article-purchase-filtros
	[class^='col-']
		margin-bottom: 10px
	.search-component
		// width: 300px
</style>
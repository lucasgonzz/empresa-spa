<template>
	<div>
		
		<b-row
		class="article-purchase-filtros">
			<b-col
			lg="4">
				<select-client></select-client>
			</b-col>
			<b-col
			lg="4">
				<select-provider></select-provider>
			</b-col>
			<b-col
			lg="4">
				<select-category></select-category>
			</b-col>
		</b-row>

		<b-row>
			<b-col
			lg="4">
				<cantidad-resultados></cantidad-resultados>
			</b-col>
			<b-col
			lg="4">
				<orden></orden>
			</b-col>
			<b-col
			lg="4">
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
		CantidadResultados: () => import('@/components/reportes/components/articulos/filtros/CantidadResultados'),
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
<template>
	<div
	class="m-t-10"
	v-if="view == 'articulos'">

		<!--
			En «Hoy» tambien se busca (hoy–hoy, como el resto de Reportes): hasta el 10/10/2026 esta
			solapa mostraba un aviso pidiendo pasar a «Rango de fechas» y no dejaba buscar.
		-->
		<filtros></filtros>

		<graficos></graficos>

		<totales></totales>

		<lista></lista>
	</div>
</template>
<script>
export default {
	components: {
		Filtros: () => import('@/components/reportes/components/articulos/filtros/Index'),
		Graficos: () => import('@/components/reportes/components/articulos/graficos/Index'),
		Totales: () => import('@/components/reportes/components/articulos/totales/Index'),
		Lista: () => import('@/components/reportes/components/articulos/lista/Index'),
	},
	computed: {
		/* Modo temporal activo en reportes (dia-actual | rango-de-fechas) */
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},
	},
	watch: {
		/*
			Al pasar de «Hoy» a «Rango de fechas» (o al reves) se vacia lo que se habia buscado: los
			numeros son de un periodo del otro modo y la pantalla nunca tiene que mostrarlos bajo
			este. Se vuelve a ver algo recien al apretar Buscar.
		*/
		rango_temporal() {
			this.$store.commit('reportes/article_purchase/set_articles', [])
			this.$store.commit('reportes/article_purchase/set_categories', [])
			this.$store.commit('reportes/article_purchase/set_providers', [])
			this.$store.commit('reportes/article_purchase/set_totales', null)
		},
	},
}
</script>

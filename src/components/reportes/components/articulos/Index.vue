<template>
	<div
	class="m-t-10"
	v-if="view == 'articulos'">
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
	}
}
</script>
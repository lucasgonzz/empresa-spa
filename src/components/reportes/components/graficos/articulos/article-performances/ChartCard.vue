<template>
	<div
	class="chart-card">
		<div class="header">
			<h4>Rendimiento por mes</h4>
		</div>

		<chart></chart>
	</div> 
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/graficos/articulos/article-performances/Chart'),
	},
}
</script>
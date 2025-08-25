<template>
	<b-modal
	size="lg"
	hide-footer
	title="Alerta de stock minimo"
	id="articles-stock-minimo">
		
    	<list-articles></list-articles>

	</b-modal>
</template>
<script>
export default {
	components: {
		ListArticles: () => import('@/components/alertas/components/lista-de-alertas-table/stock-minimo/ListArticles'),
	},
}
</script>
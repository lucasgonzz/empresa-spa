<template>
	<div>
		<div
		v-if="view == 'stock-minimo'">

    		<list-articles></list-articles>

		</div>
	</div>

</template>
<script>
export default {
	components: {
		ListArticles: () => import('@/components/alertas/components/lista-de-alertas-table/stock-minimo/ListArticles'),
	},
}
</script>
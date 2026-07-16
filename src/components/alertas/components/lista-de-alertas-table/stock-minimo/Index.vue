<template>
	<div>
		<div
		v-if="view == 'stock-minimo'">

    		<list-articles></list-articles>

		</div>
	</div>

</template>
<script>
import inventory_performance from '@/mixins/inventory_performance'
export default {
	mixins: [inventory_performance],
	components: {
		ListArticles: () => import('@/components/alertas/components/lista-de-alertas-table/stock-minimo/ListArticles'),
	},
	created() {
		// Dispara el pedido del reporte (contadores + flag `generating`) al entrar a la seccion
		// de Alertas: si el reporte vencio, esto tambien encola su regeneracion en background
		// (no solo se dispara desde el login).
		this.get_inventory_performance_models()
	},
}
</script>
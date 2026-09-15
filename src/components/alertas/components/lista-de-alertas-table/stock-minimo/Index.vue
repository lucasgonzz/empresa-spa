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
		// de Alertas. Desde la mision reporte-inventario-manual (15/9/2026) esto es de solo
		// lectura: no encola nada por si solo, ni aca ni en ningun otro lugar que lo pida (el
		// reporte se genera de noche o con el boton Actualizar).
		this.get_inventory_performance_models()
	},
}
</script>
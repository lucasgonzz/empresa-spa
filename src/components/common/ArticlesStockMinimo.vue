<template>
	<b-modal
	size="xl"
	hide-footer
	lazy
	title="Alerta de stock minimo"
	id="articles-stock-minimo"
	@show="resetear_filtro_stock_minimo"
	@hidden="resetear_filtro_stock_minimo">

		<list-articles></list-articles>

	</b-modal>
</template>

<script>
export default {
	components: {
		ListArticles: () => import('@/components/alertas/components/lista-de-alertas-table/stock-minimo/ListArticles'),
	},
	methods: {
		/**
		 * Al cerrar el modal, resetea busqueda y pagina en el store para que la proxima vez
		 * que se abra arranque limpio, sin el filtro de la sesion anterior aplicado.
		 * Como el modal usa `lazy`, el `list-articles` se destruye al cerrarlo y se vuelve a
		 * crear (con `created()` propio) la proxima vez que se abre, ya con estos valores reseteados.
		 */
		resetear_filtro_stock_minimo() {
			this.$store.commit('inventory_performance/set_address_id', null)
			this.$store.commit('inventory_performance/set_search', '')
			this.$store.commit('inventory_performance/set_page', 1)
			// Alertas puede seguir montada debajo del modal: no dejarla vacía al cerrar.
			this.$store.dispatch('inventory_performance/get_articles_stock_minimo')
		},
	},
}
</script>
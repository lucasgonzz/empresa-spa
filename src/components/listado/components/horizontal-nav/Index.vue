<template>
	
	<div class="j-end align-center w-100">
		
		<buscador-header></buscador-header>
	
		<btn-inventory-performance
		class="d-none d-md-block"></btn-inventory-performance>

		<stock-suggestion
		class="d-none d-md-block"></stock-suggestion>

		<deposit-movements
		class="d-none d-md-block"></deposit-movements>

		<deposit-buttons
		class="d-none d-md-block"></deposit-buttons>

		<promociones-vinoteca></promociones-vinoteca>

		<article-pdf-personalizado></article-pdf-personalizado>
	</div>
</template>
<script>
export default {
	components: {
		BtnInventoryPerformance: () => import('@/components/listado/components/horizontal-nav/BtnInventoryPerformance'),
		BuscadorHeader: () => import('@/components/listado/components/horizontal-nav/buscador-header/Index'),
		StockSuggestion: () => import('@/components/listado/components/horizontal-nav/stock-suggestion/Index'),
		DepositMovements: () => import('@/components/listado/components/horizontal-nav/deposit-movements/Index'),
		PromocionesVinoteca: () => import('@/components/listado/components/horizontal-nav/promociones-vinoteca/Index'),
		ArticlePdfPersonalizado: () => import('@/components/listado/components/horizontal-nav/ArticlePdfPersonalizado'),
		DepositButtons: () => import('@/components/listado/components/horizontal-nav/DepositButtons'),

	}
}
</script>
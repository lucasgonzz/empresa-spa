<template>
	
	<div class="j-end">
	
		<btn-inventory-performance></btn-inventory-performance>
		
		<buscador-header></buscador-header>

		<deposit-movements></deposit-movements>

		<promociones-vinoteca></promociones-vinoteca>

		<article-pdf-personalizado></article-pdf-personalizado>
	</div>
</template>
<script>
export default {
	components: {
		BtnInventoryPerformance: () => import('@/components/listado/components/horizontal-nav/BtnInventoryPerformance'),
		BuscadorHeader: () => import('@/components/listado/components/horizontal-nav/buscador-header/Index'),
		DepositMovements: () => import('@/components/listado/components/horizontal-nav/deposit-movements/Index'),
		PromocionesVinoteca: () => import('@/components/listado/components/horizontal-nav/promociones-vinoteca/Index'),
		ArticlePdfPersonalizado: () => import('@/components/listado/components/horizontal-nav/ArticlePdfPersonalizado'),

	}
}
</script>
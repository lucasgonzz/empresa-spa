<template> 
	<div>
		<nav-component></nav-component>
		<production-movements></production-movements>
		<cantidades-actuales></cantidades-actuales>
		<order-productions></order-productions>
		<recipes></recipes>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/produccion/components/NavComponent'),
		ProductionMovements: () => import('@/components/produccion/components/production-movements/Index'),
		CantidadesActuales: () => import('@/components/produccion/components/cantidades-actuales/Index'),
		OrderProductions: () => import('@/components/produccion/components/order-productions/Index'),
		Recipes: () => import('@/components/produccion/components/recipes/Index'),
	}
}
</script>
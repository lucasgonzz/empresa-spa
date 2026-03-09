<template> 
	<div>
		<nav-component></nav-component>
		<!-- <production-movements></production-movements> -->
		<!-- <cantidades-actuales></cantidades-actuales> -->
		<production-batches></production-batches>
		<recipes></recipes>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/produccionV2/components/NavComponent'),
		// ProductionMovements: () => import('@/components/produccion/components/production-movements/Index'),
		// CantidadesActuales: () => import('@/components/produccion/components/cantidades-actuales/Index'),
		ProductionBatches: () => import('@/components/produccionV2/components/production-batches/Index'),
		Recipes: () => import('@/components/produccionV2/components/recipes/Index'),
	}
}
</script> 
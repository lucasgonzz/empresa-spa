<template> 
	<div>
		<nav-component></nav-component>
		<!-- <production-movements></production-movements> -->
		<!-- <cantidades-actuales></cantidades-actuales> -->
		<production-batches></production-batches>
		<recipes></recipes>
		<insumos></insumos>
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
		Insumos: () => import('@/components/produccionV2/components/insumos/Index'),
	},
	created() {
		/*
			Las recetas ya no se descargan al iniciar sesion (mision 43, 12/8/2026): fuera de
			produccion no las usa nadie. Se piden al entrar al modulo, y solo si el store esta
			vacio (mismo patron que panel-control/proveedores/Index.vue).

			Va en la vista y no en recipes/Index.vue a proposito: el store de recetas tambien lo
			lee production-batches/RecipeRouteSelect.vue, y a los lotes se puede entrar sin pasar
			por la solapa de recetas.
		*/
		if (!this.$store.state.recipe.models.length) {
			this.$store.dispatch('recipe/getModels')
		}
	},
}
</script> 
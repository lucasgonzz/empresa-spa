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
	},
	created() {
		/*
			Las recetas ya no se descargan al iniciar sesion (mision 43, 12/8/2026): fuera de
			produccion no las usa nadie. Se piden al entrar al modulo, y solo si el store esta
			vacio (mismo patron que panel-control/proveedores/Index.vue).

			Va en la vista y no en recipes/Index.vue a proposito: el store de recetas tambien lo
			lee la seccion de lotes (produccionV2/production-batches/RecipeRouteSelect.vue) y
			mixins/model_functions.js, y a esas se puede entrar sin pasar por la solapa de recetas.
		*/
		if (!this.$store.state.recipe.models.length) {
			this.$store.dispatch('recipe/getModels')
		}
	},
}
</script>
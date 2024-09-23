<template>
	<div>

		<movimientos-entre-cajas></movimientos-entre-cajas>	

		<aperturas></aperturas>	

		<movimientos></movimientos>	

		<view-component
		model_name="caja">

			<template #horizontal_nav_center>
				
				<horizontal-nav-center></horizontal-nav-center>
			</template>

			<template #table_right_options="props">
				<table-buttons
				:caja="props.model"></table-buttons>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		HorizontalNavCenter: () => import('@/components/caja/components/horizontal-nav-center/Index'),
		TableButtons: () => import('@/components/caja/components/table-buttons/Index'),

		MovimientosEntreCajas: () => import('@/components/caja/modals/movimientos-entre-cajas/Index'),
		Aperturas: () => import('@/components/caja/modals/aperturas/Index'),
		Movimientos: () => import('@/components/caja/modals/movimientos/Index'),
	}
}
</script>
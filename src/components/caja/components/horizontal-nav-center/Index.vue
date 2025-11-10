<template>
	<div
	class="j-end align-center">

		<total></total>

		<btn-movimientos-entre-cajas></btn-movimientos-entre-cajas>

		<btn-resumen-caja></btn-resumen-caja>
	</div>
</template>
<script>
export default {
	components: {
		Total: () => import('@/components/caja/components/horizontal-nav-center/Total'),
		BtnMovimientosEntreCajas: () => import('@/components/caja/components/horizontal-nav-center/BtnMovimientosEntreCajas'),
		BtnResumenCaja: () => import('@/components/caja/components/horizontal-nav-center/BtnResumenCaja'), 
	},
}
</script>
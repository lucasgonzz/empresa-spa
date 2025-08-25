<template>
	<div
	class="j-end align-center">

		<total></total>

		<btn-movimientos-entre-cajas></btn-movimientos-entre-cajas>
	</div>
</template>
<script>
export default {
	components: {
		Total: () => import('@/components/caja/components/horizontal-nav-center/Total'),
		BtnMovimientosEntreCajas: () => import('@/components/caja/components/horizontal-nav-center/BtnMovimientosEntreCajas'),
	},
}
</script>
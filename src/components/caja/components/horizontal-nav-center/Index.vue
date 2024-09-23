<template>
	<div>
		<btn-movimientos-entre-cajas></btn-movimientos-entre-cajas>
	</div>
</template>
<script>
export default {
	components: {
		BtnMovimientosEntreCajas: () => import('@/components/caja/components/horizontal-nav-center/BtnMovimientosEntreCajas'),
	},
}
</script>
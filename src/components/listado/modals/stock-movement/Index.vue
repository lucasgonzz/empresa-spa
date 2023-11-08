<template>
<b-modal
title="Movimiento de Stock"
hide-footer
id="stock-movement">
	<stock-movement-form></stock-movement-form>
</b-modal>
</template>
<script>
export default {
	components: {
		StockMovementForm: () => import('@/components/listado/modals/stock-movement/Form'),
	}
}
</script>
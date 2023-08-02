<template>
	<div>
		<stock-0></stock-0>
		<stock-min></stock-min>
	</div>
</template>
<script>
import Stock0 from '@/components/listado/modals/stock-info/Stock0'
import StockMin from '@/components/listado/modals/stock-info/StockMin'
export default {
	components: {
		Stock0,
		StockMin,
	}
}
</script>
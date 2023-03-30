<template>
<div>
	<pago></pago>	
	<update-percentage></update-percentage>	
	<b-modal id="commissioners" size="lg" hide-footer title="Comisiones">
		<commissioners-nav></commissioners-nav>
		<weeks-ago-nav></weeks-ago-nav>
		<list></list>
		<btn-pago></btn-pago>
	</b-modal>
</div>
</template>
<script>
import Pago from '@/components/ventas/modals/commissioners/Pago'
import UpdatePercentage from '@/components/ventas/modals/commissioners/UpdatePercentage'
import WeeksAgoNav from '@/components/ventas/modals/commissioners/WeeksAgoNav'
import CommissionersNav from '@/components/ventas/modals/commissioners/CommissionersNav'
import List from '@/components/ventas/modals/commissioners/List'
import BtnPago from '@/components/ventas/modals/commissioners/BtnPago'
export default {
	name: 'CommissionersIndex',
	components: {
		Pago,
		UpdatePercentage,
		CommissionersNav,
		WeeksAgoNav,
		List,
		BtnPago,
	}
}
</script>
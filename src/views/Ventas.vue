<template>
<div id="ventas">	
	<!-- <sellers></sellers>
	<commissioners></commissioners>
	
	<sale-details></sale-details>
	<update-prices></update-prices>

	<print-sales></print-sales>  -->

<!-- COMPONENTS -->
	<!-- <previus-days></previus-days>

	<total-dropdown-print-info></total-dropdown-print-info>

	<address-nav></address-nav>
	<employee-nav></employee-nav>

	<table-sales 
	@selectAllSales="selectAllSales"></table-sales> -->
	
	<current-acounts></current-acounts>

	<view-component
	:models_to_show="sales_to_show"
	show_models_if_empty
	show_previus_days
	:show_btn_create="false"
	:show_modal="false"
	model_name="sale">
		<template v-slot:display_top>
			<address-nav></address-nav>
			<employee-nav></employee-nav>
			<total></total>	
		</template>
		<template v-slot:default="props">
			<budget-order-production-info
			:model="props.model" />
		</template>
	</view-component>
</div> 
</template>
<script>
import clients from '@/mixins/clients'
import print_sale from '@/mixins/print_sale'
import afip_ticket from '@/mixins/afip_ticket'
import sale from '@/mixins/sale'
export default {
	mixins: [clients, print_sale, afip_ticket, sale],
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		AddressNav: () => import('@/components/ventas/components/AddressNav'),
		EmployeeNav: () => import('@/components/ventas/components/EmployeeNav'),
		Total: () => import('@/components/ventas/components/Total'),
		BudgetOrderProductionInfo: () => import('@/components/ventas/components/BudgetOrderProductionInfo'),
	},
	beforeRouteLeave(to, from, next) {
		this.$store.commit('sale/setSelected', [])
		next()
	},
}
</script>
<style scoped>

.card-icon {
	font-size: 1.5rem
}
.spinner-border {
	margin-bottom: 3px;
}
.clients-results {
	position: absolute;
	top: 100%;
	width: 100%;
	z-index: 500;
}
</style>
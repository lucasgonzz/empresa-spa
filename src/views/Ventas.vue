<template>
<div id="ventas">	
	<current-acounts></current-acounts>

	<update-prices></update-prices>

	<make-afip-tickets></make-afip-tickets>

	<afip-ticket-show-errors></afip-ticket-show-errors>
	<afip-ticket-show-observations></afip-ticket-show-observations>

	<sale-modifications></sale-modifications>

	<view-component
	show_filter_modal
	ask_selectable
	:models_to_show="sales_to_show"
	show_models_if_empty
	:show_previus_days="show_previus_days"
	:show_btn_create="false"
	:show_modal="false"
    :not_show_delete_text="not_show_delete_text"
    mostrar_models_que_vinienen_por_prop_siempre
	model_name="sale">
		<template v-slot:display_top>
			<address-afip-ticket-ventas-cobradas-nav></address-afip-ticket-ventas-cobradas-nav>
			<employee-nav></employee-nav>
			<total></total>	
		</template>
		<template v-slot:table_right_options="props">
			<table-buttons
			:model="props.model" />

			<btn-sale-modifications
			:model="props.model"></btn-sale-modifications>
		</template> 
		<template #options_drop_down>
			<option-dropdown-afip-ticket></option-dropdown-afip-ticket>
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
		AddressAfipTicketVentasCobradasNav: () => import('@/components/ventas/components/address-afip-ticket-ventas-cobradas-nav/Index'),
		SaleModifications: () => import('@/components/ventas/modals/sale-modifications/Index'),
		BtnSaleModifications: () => import('@/components/ventas/components/BtnSaleModifications'),
		EmployeeNav: () => import('@/components/ventas/components/EmployeeNav'),
		Total: () => import('@/components/ventas/components/Total'),
		TableButtons: () => import('@/components/ventas/components/table-buttons/Index'),
		UpdatePrices: () => import('@/components/ventas/modals/update-prices/Index'),
		OptionDropdownAfipTicket: () => import('@/components/ventas/components/OptionDropdownAfipTicket'),
		MakeAfipTickets: () => import('@/components/ventas/modals/afip-ticket/MakeAfipTickets'),
		AfipTicketShowErrors: () => import('@/components/ventas/modals/afip-ticket/ShowErrors'),
		AfipTicketShowObservations: () => import('@/components/ventas/modals/afip-ticket/ShowObservations'),
	},
	created() {
		this.$store.commit('sale/setFromDates', true)
	},
	beforeRouteLeave(to, from, next) {
		this.$store.commit('sale/setSelected', [])
		next()
	},
	computed: {
		show_previus_days() {
			if (this.hasExtencion('sales.hide')) {
				console.log('ENTRO EN LA hasExtencion sales.hide')
				return this.$route.name == 'VentasAll'
			} else if (this.is_filtered) {
				return false
			}
			return true
		},
		is_filtered() {
			return this.$store.state.sale.is_filtered 
		},
		model_to_delete() {
			return this.$store.state.sale.delete 
		},
		not_show_delete_text() {
			return this.delete && this.delete.afip_ticket
		},
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
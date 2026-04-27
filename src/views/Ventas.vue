<template>
<div id="ventas">	
	<current-acounts></current-acounts>

	<!-- <update-prices></update-prices> -->


	<afip-ticket-show-errors></afip-ticket-show-errors>
	<afip-ticket-show-observations></afip-ticket-show-observations>

	<sale-modifications></sale-modifications>

	<payment-plan-modal></payment-plan-modal>

	<!-- Modal con el desglose del cálculo del precio final de la venta seleccionada -->
	<sale-price-description></sale-price-description>

	<!-- Modal de consolidación de ventas para facturación -->
	<consolidar-facturacion></consolidar-facturacion>

	<view-component
	show_filter_modal
	:models_to_show="sales_to_show"
	:show_actualizar_option="false"
	ask_selectable
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

			<!-- Mostrar u ocultar ventas contenedoras de facturación en el listado. -->
			<btn-show-consolidadas></btn-show-consolidadas>
		</template>
		<template v-slot:table_left_options="props">
			<div class="j-start align-center">
				<table-buttons
				:model="props.model" />

				<btn-sale-modifications
				:model="props.model"></btn-sale-modifications>

				<b-badge
				class="m-l-5"
				variant="danger"
				v-if="props.model.en_acopio">
					Acopio
				</b-badge>

				<b-badge
				class="m-l-5"
				variant="success"
				v-if="props.model.send_mail">
					<i class="icon-message"></i>
				</b-badge>

				<!-- Distintivo visual para ventas contenedoras de facturación -->
				<b-badge
				class="m-l-5"
				variant="warning"
				v-if="props.model.is_consolidacion_facturacion">
					<i class="icon-layers"></i>
					Consolidada
				</b-badge>

				<!-- Distintivo para ventas individuales ya incluidas en una consolidación -->
				<b-badge
				class="m-l-5"
				variant="info"
				v-if="props.model.consolidacion_facturacion_id">
					<i class="icon-clipboard"></i>
					Facturada en consolidación
				</b-badge>
			</div>
		</template> 
		<template #options_drop_down_seleccion>
			<option-dropdown-afip-ticket></option-dropdown-afip-ticket>
			<option-dropdown-consolidar-facturacion></option-dropdown-consolidar-facturacion>
		</template>

		<template #table-prop-client_id="props">
			<client-btn
			:sale="props.model"></client-btn>
		</template>
	</view-component>
</div>  
</template>
<script>
import clients from '@/mixins/clients'
import print_sale from '@/mixins/print_sale'
// import afip_ticket from '@/mixins/afip_ticket'
import sale from '@/mixins/sale'
export default {
	mixins: [clients, print_sale, sale],
	components: { 
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		AddressAfipTicketVentasCobradasNav: () => import('@/components/ventas/components/address-afip-ticket-ventas-cobradas-nav/Index'),
		SaleModifications: () => import('@/components/ventas/modals/sale-modifications/Index'),
		BtnSaleModifications: () => import('@/components/ventas/components/BtnSaleModifications'),
		EmployeeNav: () => import('@/components/ventas/components/EmployeeNav'),
		Total: () => import('@/components/ventas/components/Total'),
		TableButtons: () => import('@/components/ventas/components/table-buttons/Index'),
		// UpdatePrices: () => import('@/components/ventas/modals/update-prices/Index'),
		OptionDropdownAfipTicket: () => import('@/components/ventas/components/OptionDropdownAfipTicket'),
		OptionDropdownConsolidarFacturacion: () => import('@/components/ventas/components/OptionDropdownConsolidarFacturacion'),
		AfipTicketShowErrors: () => import('@/components/ventas/modals/afip-ticket/ShowErrors'),
		AfipTicketShowObservations: () => import('@/components/ventas/modals/afip-ticket/ShowObservations'),

		ClientBtn: () => import('@/components/ventas/components/ClientBtn'),

		PaymentPlanModal: () => import('@/components/common/payment-plan/Index'),
		// Modal con el desglose del cálculo del precio final de la venta
		SalePriceDescription: () => import('@/components/ventas/modals/SalePriceDescription'),
		// Modal de consolidación de ventas para facturación
		ConsolidarFacturacion: () => import('@/components/ventas/modals/consolidar-facturacion/Index'),
		BtnShowConsolidadas: () => import('@/components/ventas/components/BtnShowConsolidadas'),
	},
	created() {
		this.$store.commit('sale/setFromDates', true)
		
		this.$store.commit('sale/set_modulo', 'ventas')
		this.$store.dispatch('sale/getModels')

		this.reiniciar_filtros()
	},
	methods: {
		reiniciar_filtros() {
			this.$store.commit('sale/setVentasCobradasShowOption', 'cobradas-y-no-cobradas')
			this.$store.commit('sale/setAfipTicketShowOption', 'con-y-sin-factura')
			this.$store.commit('sale/set_payment_method_show_option', 'todos')
		},
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
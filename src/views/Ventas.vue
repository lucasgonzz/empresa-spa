<template>
<div
id="ventas"
data-tour="ventas.contenedor">	
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
			<!--
				El nav de empleados ya no se monta suelto acá: desde la misión 32 vive adentro de
				address-afip-ticket-ventas-cobradas-nav, compartiendo fila con los filtros de
				facturación, cobro y método de pago.
			-->
			<address-afip-ticket-ventas-cobradas-nav></address-afip-ticket-ventas-cobradas-nav>
			<total></total>

			<!-- Mostrar u ocultar ventas contenedoras de facturación en el listado. -->
			<btn-show-consolidadas></btn-show-consolidadas>
		</template>
		<template v-slot:table_left_options="props">
			<!--
				Ya no se usan acá las utilidades `j-start` y `align-center`: las dos declaran su
				propiedad con !important (common-vue/sass/_displays.sass), así que no había forma de
				ajustarles el envolvido ni la alineación desde el <style> de abajo sin pelearles.
				Lo que hacían está declarado ahí, sin !important.
			-->
			<div class="table-left-options-ventas">
				<table-buttons
				:model="props.model" />

				<!--
					El botón de modificaciones y los distintivos van agrupados a propósito. Sueltos,
					eran hermanos directos de <table-buttons>, que cuando su fila de botones se parte
					en dos líneas crece de alto: con la alineación centrada de antes quedaban a media
					altura, sin coincidir con ninguna de las dos líneas. Eso es lo que Lucas vio como
					el botón de Modificaciones "flotando separado del resto".
				-->
				<div class="table-left-options-ventas__extras">
					<btn-sale-modifications
					:model="props.model"></btn-sale-modifications>

					<b-badge
					variant="danger"
					v-if="props.model.en_acopio">
						<i class="bi bi-archive"></i>
						Acopio
					</b-badge>

					<b-badge
					variant="success"
					title="Correo enviado al cliente"
					v-if="props.model.send_mail">
						<i class="bi bi-envelope"></i>
					</b-badge>

					<!-- Distintivo visual para ventas contenedoras de facturación -->
					<b-badge
					variant="warning"
					v-if="props.model.is_consolidacion_facturacion">
						<i class="bi bi-layers"></i>
						Consolidada
					</b-badge>

					<!-- Distintivo para ventas individuales ya incluidas en una consolidación -->
					<b-badge
					variant="info"
					v-if="props.model.consolidacion_facturacion_id">
						<i class="bi bi-clipboard-check"></i>
						Facturada en consolidación
					</b-badge>
				</div>
			</div>
		</template>
		<template #options_drop_down_seleccion>
			<option-dropdown-afip-ticket></option-dropdown-afip-ticket>
			<option-dropdown-consolidar-facturacion></option-dropdown-consolidar-facturacion>
			<send-mail-option-dropdown></send-mail-option-dropdown>
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
		Total: () => import('@/components/ventas/components/Total'),
		TableButtons: () => import('@/components/ventas/components/table-buttons/Index'),
		// UpdatePrices: () => import('@/components/ventas/modals/update-prices/Index'),
		OptionDropdownAfipTicket: () => import('@/components/ventas/components/OptionDropdownAfipTicket'),
		OptionDropdownConsolidarFacturacion: () => import('@/components/ventas/components/OptionDropdownConsolidarFacturacion'),
		SendMailOptionDropdown: () => import('@/components/ventas/components/options-dropdown/SendMailOptionDropdown'),
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

/*
 * La celda de controles de cada venta del listado (7/9/2026, pedido de Lucas: "el botón de
 * Modificaciones aparece desorganizado, el de los Log también").
 *
 * La fila de botones de adentro (table-buttons) ya se había arreglado: separa por `gap` y envuelve
 * ordenada. Lo que seguía mal era este contenedor, que es el que la envuelve acá. No envolvía, y
 * alineaba a sus hijos al centro: cuando la barra de botones se parte en dos líneas —en ventas pasa
 * casi siempre, son seis o siete controles— este div crece de alto y el centro vertical cae en el
 * medio de las dos líneas. Ahí quedaba el "Mod", a media altura y sin alinearse con ninguna.
 *
 * Se alinea al tope para que los extras acompañen a la PRIMERA línea de botones, que es donde el
 * ojo los busca, y se envuelve con las mismas medidas que usa table-buttons por dentro para que las
 * dos separaciones se lean como una sola.
 */
.table-left-options-ventas {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: flex-start;
	align-items: flex-start;
	/* Las líneas se apilan desde arriba en vez de repartirse el sobrante de una celda más alta. */
	align-content: flex-start;
	/* 8px entre controles y 6px entre líneas: los mismos de table-buttons (--toolbar-btn-gap). */
	gap: 6px 8px;
}

/*
 * El "Mod" y los distintivos se centran ENTRE ELLOS —una pastilla es más baja que un botón— pero el
 * grupo entero se apoya arriba por el align-items del contenedor. Así el botón queda a la altura de
 * la primera línea de la barra y los distintivos a la altura del botón.
 */
.table-left-options-ventas__extras {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px 8px;
}

/*
 * Un `v-if` en falso deja un nodo comentario, y un <div> que sólo tiene comentarios SÍ matchea
 * :empty. Sin esto, una venta sin modificaciones y sin ningún distintivo —que son la mayoría—
 * dejaría igual el hueco de 8px del gap después de la barra de botones.
 */
.table-left-options-ventas__extras:empty {
	display: none;
}

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
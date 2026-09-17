<template>
	<div>
		<!-- <edit-article></edit-article> -->
		<import></import>

		<!-- Escaneo de facturas de compra con IA (mision escaneo-factura-compra):
		el modal de subida y el de revision viven aca, al lado del de importacion,
		porque los dos trabajan sobre la compra que dejo seleccionada la fila. -->
		<scan-invoice></scan-invoice>
		<scan-invoice-review></scan-invoice-review>

		<price-description></price-description>

		<view-component 
		v-if="view == 'compras'"
		data-tour="compras.contenedor"
		model_name="provider_order"
		show_btn_pdf
		show_models_if_empty
		order_list_by="provider_order_status"
		change_from_dates_option
		:models_to_show="provider_orders_to_show"
		:show_previus_days="show_previus_days"
		:props_to_send_on_save="props_to_send_on_save"
		show_filter_modal>

			<template #display_top>
				<nav-component></nav-component>
			</template>


		<template v-slot:table_left_options="props">
			<btn-export :model="props.model" />	
			<btn-import :model="props.model" />
			<btn-scan-invoice :model="props.model" />
			<btn-view-received-diff :model="props.model" />
		</template>

			<template #total="props">
				<total></total>	
			</template>

			<template #iva_breakdown="props">
				<iva-breakdown></iva-breakdown>
			</template>

			<!-- Prompt 611: reemplaza el checkbox generico de "precios_incluyen_iva" por un control
			con descripcion permanente debajo (ver PreciosIncluyenIva.vue) -->
			<template #precios_incluyen_iva="props">
				<precios-incluyen-iva></precios-incluyen-iva>
			</template>

			<!--
				Mision `compras-factura-manual-alicuotas` (17/9/2026): las alicuotas de IVA de una
				factura de compra, con los tres importes de calculo en vivo (Neto, Importe IVA,
				Bruto) y el bloqueo del modo de facturacion automatico.

				🔴 EL SLOT SE DECLARA ACA Y NO ADENTRO DEL FORMULARIO DE LA FACTURA, y no es una
				eleccion: un slot solo lo puede llenar un ANCESTRO. Las alicuotas son un has_many
				adentro de otro has_many (compra -> factura -> alicuota), y este es el punto mas
				cercano del arbol desde el que se puede alcanzar la prop de las alicuotas:

					view/Index -> model/Index -> ModelForm(compra) -> HasMany(facturas)
					-> model/Index -> ModelForm(factura) -> este slot

				El nombre (`has-many-prop-` + la key de la prop del hijo) es el que arma
				`has_many_slot_items()` en common-vue/mixins/model_functions.js, y cada eslabon ya
				lo reenvia solo. De ahi para abajo se encarga AlicuotasIva.vue.
			-->
			<template #has-many-prop-provider_order_afip_ticket_ivas>
				<alicuotas-iva></alicuotas-iva>
			</template>

		</view-component>
	</div>
</template>
<script>
import models_to_show from '@/mixins/provider_order/models_to_show'
export default {
	mixins: [models_to_show],
	components: {
		Import: () => import('@/components/provider/modals/orders/Import'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnExport: () => import('@/components/provider/components/orders/BtnExport'),
		BtnImport: () => import('@/components/provider/components/orders/BtnImport'),
		BtnViewReceivedDiff: () => import('@/components/provider/components/orders/BtnViewReceivedDiff'),
		// Escaneo de facturas de compra con IA (mision escaneo-factura-compra)
		BtnScanInvoice: () => import('@/components/provider/components/orders/BtnScanInvoice'),
		ScanInvoice: () => import('@/components/provider/modals/orders/ScanInvoice'),
		ScanInvoiceReview: () => import('@/components/provider/modals/orders/ScanInvoiceReview'),
		IvaBreakdown: () => import('@/components/provider/components/orders/IvaBreakdown'),
		NavComponent: () => import('@/components/provider/components/orders/nav/Index'),
		Total: () => import('@/components/provider/components/orders/Total'),
		PriceDescription: () => import('@/components/provider/modals/orders/PriceDescription'),
		// Prompt 611: control de costos brutos/netos de la compra ("precios_incluyen_iva"), con
		// descripcion permanente
		PreciosIncluyenIva: () => import('@/components/provider/components/orders/PreciosIncluyenIva'),
		// Mision `compras-factura-manual-alicuotas` (17/9/2026): las alicuotas de IVA de una
		// factura de compra (ver el comentario del slot en el template)
		AlicuotasIva: () => import('@/components/provider/components/orders/afip-ticket/AlicuotasIva'),
	},
	computed: {
		show_previus_days() {
			return this.$store.state.provider_order.from_dates
		},
		total() {
			return this.$store.state.provider_order.total
		},
		props_to_send_on_save() {
			return [
				{
					key: 'total',
					value: this.total
				}
			]
		},
	},
}
</script>
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
				Mision fecha-creacion-editable (22/9/2026): la fecha con la que queda registrada la
				compra ("created_at"). Reemplaza el date-picker generico de ModelForm por el mismo
				control pero con el default resuelto ACA, al renderizar.

				🔴 POR QUE NO ALCANZA CON EL `value` DEL MODELO. Un `value` de src/models/*.js se
				evalua una sola vez, cuando `require()` cachea el modelo: al cargar la pestaña.
				Ese "hoy" queda congelado para siempre, y en compras --a diferencia de Vender, que
				recommitea la fecha en cada venta nueva-- no hay nada que lo vuelva a calcular: una
				pestaña abierta tres dias le pone a todas las compras nuevas el dia en que se
				cargo la pagina. Silencioso: la compra existe, con la fecha equivocada.

				Por eso el modelo arranca en null y el dia lo pone este slot al renderizar (alta) o
				el servidor (si el usuario no toca nada, viaja null y `Carbon::now()` decide). El
				label "Fecha" y el popover de descripciones los sigue dibujando ModelForm: quedan
				AFUERA del slot.

				Editando una compra existente el modelo ya trae su `created_at` --el timestamp ISO
				de la API-- y se muestra ese, no hoy. Mismo criterio de parseo que
				common-vue/components/model/form/DatePicker.vue: el ISO se convierte entero a la
				zona del navegador, nunca se corta por la T (entre las 21:00 y la medianoche el dia
				UTC ya es el siguiente).
			-->
			<template #created_at="props">
				<b-form-input
				type="date"
				data-testid="provider_order-created_at"
				:value="created_at_de_la_compra"
				@change="set_created_at_de_la_compra"></b-form-input>
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
import moment from 'moment'
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
		/*
			El 'YYYY-MM-DD' que muestra el campo Fecha del formulario de la compra.

			Se lee derecho del store --mismo patron que Total.vue y PreciosIncluyenIva.vue de este
			mismo modulo-- en vez de depender del scope del slot de ModelForm.

			🔴 El fallback a hoy se calcula ACA, en el computed, y esa es toda la gracia: es el
			unico punto del camino que corre cuando se ABRE el formulario y no cuando se cargo la
			pestaña. El `value` del modelo (src/models/provider_order.js) lo evalua `require()` una
			sola vez y despues queda congelado en el dia en que se abrio la SPA -- una pestaña
			abierta desde el lunes fecharia el jueves como lunes, y nadie lo mira.

			Que el modelo quede en null mientras el usuario no elija nada NO es una fecha faltante:
			es lo que hace que la fecha real la ponga el servidor con Carbon::now() al guardar
			(SaleHelper::resolver_created_at), o sea el dia de verdad aunque el formulario haya
			quedado abierto desde ayer.
		*/
		created_at_de_la_compra() {
			let compra = this.$store.state.provider_order.model

			if (compra && compra.created_at) {
				/*
					Editando: la API serializa el timestamp como ISO en UTC
					('2026-09-23T01:30:00.000000Z'). Se parsea ENTERO --moment() lo pasa a la zona
					del navegador-- y nunca se corta por la T, que entre las 21:00 y la medianoche
					devuelve el dia SIGUIENTE. Es la misma trampa que ya documenta DatePicker.vue.
				*/
				if (compra.created_at.indexOf('T') != -1) {
					return moment(compra.created_at).format('YYYY-MM-DD')
				}

				return compra.created_at
			}

			return moment().format('YYYY-MM-DD')
		},
	},
	methods: {
		/**
		 * Guarda en la compra en edicion la fecha que el usuario eligio a mano.
		 *
		 * Con $set y no con una asignacion pelada por el mismo motivo que PreciosIncluyenIva.vue:
		 * el modelo del alta se arma con las claves del modelo, pero la reactividad de Vue 2 no
		 * perdona un descuido si alguna vez llega un objeto sin la clave.
		 *
		 * @param {String} value Fecha 'YYYY-MM-DD' que emite el <input type="date">.
		 */
		set_created_at_de_la_compra(value) {
			this.$set(this.$store.state.provider_order.model, 'created_at', value)
		},
	},
}
</script>
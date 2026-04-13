<template>
	<div
	class="j-start align-center">
		<text-info
		:model="model"></text-info>

		<afip-buttons
		:sale="model"></afip-buttons>

		<payment-plan-btn
		:sale="model"></payment-plan-btn>

		<etiqueta-envio
		:sale="model"></etiqueta-envio>

		<cerrar-venta
		:sale="model"></cerrar-venta>

		<!-- Botón para ver el desglose del cálculo del precio final de la venta -->
		<price-description-btn
		:sale="model"></price-description-btn>
	</div>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		ver() {
			this.$bvModal.show('payment_plan')
		},
	},
	components: {
		TextInfo: () => import('@/components/ventas/components/table-buttons/TextInfo'),
		AfipButtons: () => import('@/components/ventas/components/table-buttons/AfipButtons'),
		PaymentPlanBtn: () => import('@/components/ventas/components/table-buttons/PaymentPlanBtn'),
		EtiquetaEnvio: () => import('@/components/ventas/components/table-buttons/EtiquetaEnvio'),
		CerrarVenta: () => import('@/components/ventas/components/table-buttons/CerrarVenta'),
		// Botón que muestra el desglose del cálculo del precio final de la venta
		PriceDescriptionBtn: () => import('@/components/ventas/components/table-buttons/PriceDescriptionBtn'),
	}
}
</script>
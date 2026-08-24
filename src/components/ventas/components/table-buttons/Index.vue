<template>
	<div
	class="j-start align-center table-buttons-ventas">
		<text-info
		:model="model"></text-info>

		<!-- Grupo: gestión de la venta (plan de pago, etiqueta de envío, correo al cliente) -->
		<div class="j-start align-center m-l-10">
			<payment-plan-btn
			:sale="model"></payment-plan-btn>

			<etiqueta-envio
			:sale="model"></etiqueta-envio>

			<!-- Envío / reenvío del correo de notificación de venta (ComercioCityMailHelper::new_sale) -->
			<send-mail
			:sale="model"></send-mail>
		</div>

		<!-- Grupo: estado y auditoría de la venta -->
		<div class="j-start align-center m-l-10">
			<cerrar-venta
			:sale="model"></cerrar-venta>

			<!-- Botón para ver el desglose del cálculo del precio final de la venta -->
			<price-description-btn
			:sale="model"></price-description-btn>

			<!-- Botón para ver el log de auditoría completo de la venta -->
			<sale-log-btn
			:sale="model"></sale-log-btn>
		</div>

		<afip-buttons
		:sale="model"></afip-buttons>
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
		SendMail: () => import('@/components/ventas/components/table-buttons/SendMail'),
		CerrarVenta: () => import('@/components/ventas/components/table-buttons/CerrarVenta'),
		// Botón que muestra el desglose del cálculo del precio final de la venta
		PriceDescriptionBtn: () => import('@/components/ventas/components/table-buttons/PriceDescriptionBtn'),
		// Botón que muestra el log de auditoría detallado de la venta
		SaleLogBtn: () => import('@/components/ventas/components/table-buttons/SaleLogBtn'),
	}
}
</script>
<style scoped>
/* Permite que los clusters de botones bajen de línea en anchos intermedios (tablet) en vez de
   amontonarse; en teléfono la tabla ya scrollea horizontal por regla del sistema. */
.table-buttons-ventas {
	flex-wrap: wrap;
	row-gap: 8px;
}
</style>
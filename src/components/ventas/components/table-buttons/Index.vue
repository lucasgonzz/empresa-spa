<template>
	<div
	class="table-buttons-ventas">
		<text-info
		:model="model"></text-info>

		<!-- Grupo: gestión de la venta (plan de pago, etiqueta de envío, correo al cliente) -->
		<div class="table-buttons-ventas__grupo">
			<payment-plan-btn
			:sale="model"></payment-plan-btn>

			<etiqueta-envio
			:sale="model"></etiqueta-envio>

			<!-- Envío / reenvío del correo de notificación de venta (ComercioCityMailHelper::new_sale) -->
			<send-mail
			:sale="model"></send-mail>
		</div>

		<!-- Grupo: estado y auditoría de la venta -->
		<div class="table-buttons-ventas__grupo">
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
/*
 * La fila de botones de cada venta del listado (7/9/2026, pedido de Lucas: "el botón de
 * Modificaciones aparece desorganizado, el de los Log también").
 *
 * Qué estaba mal, y no era el wrap: la separación la ponían márgenes sueltos —`m-l-10` en cada
 * grupo, `m-l-5` en cada botón de adentro, `p-l-5` en los badges y en las facturas—. Mientras todo
 * entraba en una sola línea eso se leía parejo, pero apenas la fila envolvía (que en ventas pasa
 * siempre: son seis o siete controles) el grupo que bajaba arrancaba 10px corrido de la izquierda
 * y no quedaba alineado con la línea de arriba. Un margen izquierdo no se entera de que perdió al
 * vecino de la izquierda; un `gap` sí.
 *
 * Ahora la separación la pone SOLO el contenedor, con `gap`, y los márgenes propios de los hijos
 * se apagan acá abajo. Van con !important porque las utilidades m-l-5 / m-l-10 / m-b-10 / p-l-5 se
 * generan con !important en common-vue/sass/_helpers.scss, y un !important no se vence sin otro.
 *
 * Tampoco se usan ya `j-start` ni `align-center` en el template: las dos declaran su propiedad con
 * !important (common-vue/sass/_displays.sass), así que cualquier ajuste fino desde acá tendría que
 * pelearles. Lo que hacían se declara abajo, sin !important.
 */
.table-buttons-ventas {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	/* Todas las líneas arrancan pegadas al borde izquierdo de la celda. */
	justify-content: flex-start;
	/* Dentro de una línea, los controles se centran entre sí... */
	align-items: center;
	/* ...y las líneas se apilan desde arriba en vez de repartirse el sobrante vertical, que es lo
	   que dejaba las dos filas a alturas distintas cuando la celda era más alta que su contenido. */
	align-content: flex-start;
	/* 8px entre controles y 6px entre líneas: la misma familia que --toolbar-btn-gap. */
	gap: 6px 8px;
}

/* Los grupos son agrupación semántica (gestión / auditoría): mantienen juntos sus botones al
   envolver, pero no aportan separación propia. */
.table-buttons-ventas__grupo {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 8px;
}

/* Los componentes hijos envuelven su botón en un <div> propio (PaymentPlanBtn, SendMail,
   CerrarVenta, SaleLogBtn, TextInfo, AfipButtons). Se los pasa a flex para que sus botones también
   respiren por gap y no por márgenes. */
.table-buttons-ventas ::v-deep > div {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 8px;
}

/* Un `v-if` en falso deja un nodo comentario, y un <div> que sólo tiene comentarios SÍ matchea
   :empty. Sin esto, cada control apagado por extensión o por permiso (SendMail, CerrarVenta,
   TextInfo sin comprobante, AfipButtons sin facturas) seguiría contando como ítem del flex y
   dejaría un hueco de 8px en el medio de la fila. */
.table-buttons-ventas ::v-deep div:empty {
	display: none;
}

/* Márgenes legacy de los hijos que no son de esta misión (PaymentPlanBtn, EtiquetaEnvio, SendMail,
   CerrarVenta, AfipButtons): los apaga el contenedor en vez de tocar seis archivos ajenos. */
.table-buttons-ventas ::v-deep .m-l-5,
.table-buttons-ventas ::v-deep .m-l-10 {
	margin-left: 0 !important;
}

/* El m-b-10 de cada botón de factura empujaba su fila 10px hacia arriba respecto del resto: era la
   causa de que los iconos de AFIP no quedaran a la misma altura que los demás. */
.table-buttons-ventas ::v-deep .m-b-10 {
	margin-bottom: 0 !important;
}

.table-buttons-ventas ::v-deep .p-l-5 {
	padding-left: 0 !important;
}
</style>
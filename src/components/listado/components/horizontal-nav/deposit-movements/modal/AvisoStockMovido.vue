<template>
	<!--
		Aviso arriba del formulario de un movimiento de deposito cuyo stock ya se movio (mision
		movimientos-deposito-auditoria, 3/10/2026): "Stock movido el dd/mm/aaaa hh:mm por Nombre".
		Lo monta el slot `#model_modal_header` del modal del listado y del de alertas. Con el stock
		sin mover no dibuja nada. "Movido" incluye el `recibido_at` del frente viejo (ver
		`deposit_movement_stock_movido` en src/mixins/model_functions.js).
	-->
	<b-alert
	v-if="deposit_movement_stock_movido(model)"
	show
	variant="success"
	data-testid="aviso-stock-movido-deposito">
		Stock movido {{ deposit_movement_stock_movido_texto(model) }}.
		Los artículos y los depósitos ya no se pueden cambiar.
	</b-alert>
</template>
<script>
export default {
	props: {
		/**
		 * El movimiento de deposito del formulario (el que reenvia el slot `#model_modal_header`).
		 */
		model: {
			type: Object,
			default: null,
		},
	},
}
</script>

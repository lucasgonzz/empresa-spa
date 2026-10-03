<template>
	<!--
		Boton "Modificaciones (N)" de la fila de un movimiento de deposito (mision
		movimientos-deposito-auditoria, 3/10/2026). Mismo criterio que el de ventas
		(ventas/components/BtnSaleModifications.vue): aparece solo si hubo alguna modificacion, con la
		cantidad adentro. Crear el movimiento no cuenta: la cuenta arranca en 0.

		No abre el modal por su cuenta: emite `ver` y la pantalla que monta la tabla abre el
		historial (ver acciones-de-fila/Index.vue). `@click.stop` para que el clic no abra ademas el
		formulario de la fila.
	-->
	<b-button
	v-if="cantidad > 0"
	size="sm"
	variant="outline-primary"
	:data-testid="'modificaciones-deposito-'+model.id"
	@click.stop="$emit('ver')">
		Modificaciones ({{ cantidad }})
	</b-button>
</template>
<script>
export default {
	props: {
		/**
		 * El movimiento de deposito de la fila. Trae `deposit_movement_modifications_count` del
		 * `withCount` del backend.
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * Cuantas veces se cambiaron los articulos del movimiento despues de crearlo. 0 si el
		 * backend no manda el dato.
		 *
		 * @returns {Number}
		 */
		cantidad() {
			return Number(this.model.deposit_movement_modifications_count) || 0
		},
	},
}
</script>

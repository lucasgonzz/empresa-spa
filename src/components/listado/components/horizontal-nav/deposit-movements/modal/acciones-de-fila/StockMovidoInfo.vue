<template>
	<!--
		Distintivo "Stock movido" de la fila de un movimiento de deposito (mision
		movimientos-deposito-auditoria, 3/10/2026): en verde, con cuando y quien lo movio. Ocupa el
		lugar del boton "Mover stock" una vez que el stock ya se movio, por el boton o por el frente
		viejo al pasarlo a "Recibido" (criterio unico en `deposit_movement_stock_movido`,
		src/mixins/model_functions.js).
	-->
	<div
	v-if="deposit_movement_stock_movido(model)"
	class="stock-movido-info"
	:data-testid="'stock-movido-deposito-'+model.id">
		<b-badge
		variant="success">
			Stock movido
		</b-badge>
		<small
		class="stock-movido-info__detalle text-muted">
			{{ deposit_movement_stock_movido_texto(model) }}
		</small>
	</div>
</template>
<script>
export default {
	props: {
		/**
		 * El movimiento de deposito de la fila. El texto de fecha y usuario lo arma
		 * `deposit_movement_stock_movido_texto()` (src/mixins/model_functions.js), el mismo que usan
		 * el aviso del formulario y la tabla de articulos de solo lectura.
		 */
		model: {
			type: Object,
			required: true,
		},
	},
}
</script>
<style scoped lang="sass">
// El distintivo arriba y el detalle abajo, chico y en gris: en una celda angosta, "Stock movido el
// 03/10/2026 14:35 por Juan" en una sola linea empujaria al resto de las columnas.
.stock-movido-info
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 2px

.stock-movido-info__detalle
	white-space: nowrap
</style>

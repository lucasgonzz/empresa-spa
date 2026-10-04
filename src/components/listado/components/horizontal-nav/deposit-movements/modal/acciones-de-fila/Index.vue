<template>
	<!--
		Acciones de cada fila de un movimiento de deposito (mision movimientos-deposito-auditoria,
		3/10/2026). Va en el slot `#table_left_options` de la tabla, en el modal del listado
		(deposit-movements/modal/Index.vue) y en el de alertas
		(alertas/components/lista-de-alertas-table/DepositMovements.vue).

		Cada pieza decide sola si se muestra:
		- "Mover stock": si el stock todavia no se movio y el usuario tiene el permiso.
		- "Stock movido": si ya se movio, con cuando y quien.
		- "Modificaciones (N)": si los articulos se cambiaron alguna vez despues de crear el
		movimiento. El historial NO se monta aca (seria un modal por fila, todos con el mismo id):
		este componente emite `ver-modificaciones` y la pantalla que lo usa abre el suyo.
	-->
	<div class="acciones-de-fila-deposito">
		<btn-mover-stock
		:model="model"></btn-mover-stock>

		<stock-movido-info
		:model="model"></stock-movido-info>

		<btn-modificaciones
		:model="model"
		@ver="ver_modificaciones"></btn-modificaciones>
	</div>
</template>
<script>
export default {
	components: {
		BtnMoverStock: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/acciones-de-fila/BtnMoverStock'),
		StockMovidoInfo: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/acciones-de-fila/StockMovidoInfo'),
		BtnModificaciones: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/acciones-de-fila/BtnModificaciones'),
	},
	props: {
		/**
		 * El movimiento de deposito de la fila (el mismo objeto de la lista del store).
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	methods: {
		/**
		 * Avisa a la pantalla que monta la tabla que el usuario quiere ver el historial de
		 * modificaciones de articulos de este movimiento. La pantalla es la duena del modal del
		 * historial (uno solo para toda la tabla).
		 *
		 * @returns {void}
		 */
		ver_modificaciones() {
			this.$emit('ver-modificaciones', this.model)
		},
	},
}
</script>
<style scoped lang="sass">
// En columna y alineado a la izquierda: la celda es angosta y los tres elementos tienen anchos
// muy distintos (un boton, un distintivo con fecha, otro boton). Con `gap` la separacion la da el
// contenedor, y un elemento que no se muestra no deja un margen suelto.
.acciones-de-fila-deposito
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 5px
</style>

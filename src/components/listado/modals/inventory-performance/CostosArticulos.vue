<template>
	<!--
		Cuantos articulos tienen el costo cargado (mision 31, 11/8/2026).
		Mismos tres datos que antes: con costos, sin costos y el porcentaje.
	-->
	<div
	v-if="model"
	class="inventario-panel">

		<h6 class="inventario-panel__titulo">Costos cargados</h6>

		<div class="inventario-panel__grafico">
			<grafico-dona
			:porcentaje="porcentaje"
			:height="128"
			token_color="--caja-abierta-acento"></grafico-dona>

			<div class="inventario-panel__centro">
				<span class="inventario-panel__centro-valor">{{ porcentaje_es(porcentaje) }}%</span>
				<span class="inventario-panel__centro-label">con costo</span>
			</div>
		</div>

		<dl class="inventario-panel__detalle">
			<div class="inventario-panel__fila">
				<dt>Con costos</dt>
				<dd>{{ numero_es(model.articulos_con_costos) }}</dd>
			</div>
			<div class="inventario-panel__fila">
				<dt>Sin costos</dt>
				<dd>{{ numero_es(model.articulos_sin_costos) }}</dd>
			</div>
		</dl>
	</div>
</template>
<script>
import inventory_performance from '@/mixins/inventory_performance'
export default {
	mixins: [inventory_performance],
	components: {
		GraficoDona: () => import('@/components/listado/modals/inventory-performance/GraficoDona'),
	},
	computed: {
		/**
		 * Reporte de inventario vigente, leido a traves del mixin comun (centraliza el
		 * filtrado de `models: [null]` cuando todavia no hay reporte generado para el owner).
		 */
		model() {
			return this.inventory_performance
		},
		/**
		 * Porcentaje con costos como numero, por el mismo motivo que en InventarioStockeado.vue.
		 *
		 * @returns {Number}
		 */
		porcentaje() {
			return Number(this.model.porcentaje_con_costos) || 0
		},
	},
}
</script>

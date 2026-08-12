<template>
	<!--
		Cuanto del inventario tiene el stock cargado (mision 31, 11/8/2026).
		Mismos cuatro datos que antes: cantidad de articulos --que ahora encabeza el reporte, ver
		ValorDelInventario.vue--, stockeados, sin stockear y el porcentaje.
	-->
	<div
	v-if="model"
	class="inventario-panel">

		<h6 class="inventario-panel__titulo">Stock cargado</h6>

		<div class="inventario-panel__grafico">
			<grafico-dona
			:porcentaje="porcentaje"
			:height="128"
			token_color="--color-primary"></grafico-dona>

			<!-- El numero va en HTML encima del canvas, no dibujado adentro: asi toma la
			tipografia y los tokens del sistema y lo lee un lector de pantalla. -->
			<div class="inventario-panel__centro">
				<span class="inventario-panel__centro-valor">{{ porcentaje }}%</span>
				<span class="inventario-panel__centro-label">stockeado</span>
			</div>
		</div>

		<dl class="inventario-panel__detalle">
			<div class="inventario-panel__fila">
				<dt>Stockeados</dt>
				<dd>{{ model.stockeados }}</dd>
			</div>
			<div class="inventario-panel__fila">
				<dt>Sin stockear</dt>
				<dd>{{ model.sin_stockear }}</dd>
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
		 * Porcentaje stockeado como numero. El backend lo manda como string en algunos casos
		 * --por eso la version anterior de este componente ya lo envolvia en Number()-- y la
		 * dona necesita un numero para repartir el anillo.
		 *
		 * @returns {Number}
		 */
		porcentaje() {
			return Number(this.model.porcentaje_stockeado) || 0
		},
	},
}
</script>

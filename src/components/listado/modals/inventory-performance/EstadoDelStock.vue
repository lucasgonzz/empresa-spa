<template>
	<!--
		Como esta repartido el stock (mision 31, 11/8/2026).
		Mismos dos datos que antes --sin stock y en stock minimo-- mas el boton de Excel, que sigue
		exportando exactamente lo mismo. El tercer tramo de la barra ("con stock suficiente") NO es
		un dato nuevo del backend: se despeja de la cantidad de articulos, que ya venia en el mismo
		reporte, y existe para que los otros dos se puedan leer en proporcion.
	-->
	<div
	v-if="model"
	class="inventario-panel">

		<h6 class="inventario-panel__titulo">Estado del stock</h6>

		<div class="inventario-panel__barra">
			<grafico-estado-stock
			:sin_stock="Number(model.sin_stock) || 0"
			:stock_minimo="Number(model.stock_minimo) || 0"
			:total="Number(model.cantidad_articulos) || 0"
			:height="26"></grafico-estado-stock>
		</div>

		<dl class="inventario-panel__detalle">
			<div class="inventario-panel__fila">
				<dt>
					<span class="inventario-panel__punto inventario-panel__punto--sin-stock"></span>
					Sin stock
				</dt>
				<dd>{{ model.sin_stock }}</dd>
			</div>
			<div class="inventario-panel__fila">
				<dt>
					<span class="inventario-panel__punto inventario-panel__punto--minimo"></span>
					En stock mínimo
				</dt>
				<dd>{{ model.stock_minimo }}</dd>
			</div>
		</dl>

		<!--
			El boton deja de ser un variant="success" suelto adentro de la tarjeta: pasa al
			vocabulario neutro de la barra de encabezado, con icono, porque descargar un Excel no
			es la accion principal de este panel.
		-->
		<b-button
		class="inventario-panel__excel"
		size="sm"
		@click="excel">
			<i class="bi bi-file-earmark-spreadsheet m-r-5" aria-hidden="true"></i>
			Excel de stock mínimo
		</b-button>
	</div>
</template>
<script>
import inventory_performance from '@/mixins/inventory_performance'
export default {
	mixins: [inventory_performance],
	components: {
		GraficoEstadoStock: () => import('@/components/listado/modals/inventory-performance/GraficoEstadoStock'),
	},
	computed: {
		/**
		 * Reporte de inventario vigente, leido a traves del mixin comun (centraliza el
		 * filtrado de `models: [null]` cuando todavia no hay reporte generado para el owner).
		 */
		model() {
			return this.inventory_performance
		},
	},
	methods: {
		excel() {
			let link = process.env.VUE_APP_API_URL+'/articles-stock-minimo/excel'
			window.open(link)

		}
	}
}
</script>

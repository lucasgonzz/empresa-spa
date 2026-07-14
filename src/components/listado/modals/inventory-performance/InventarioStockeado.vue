<template>
	<div 
	v-if="model"
	class="custom-card">
		<div class="header">
			Inventario Stockeado
		</div>

		<div class="body">
			
			<div class="info">
				
				<p
				class="nombre">
					Cantidad de artículos
				</p>

				<p 
				class="valor">
					{{ model.cantidad_articulos }}
				</p>
			</div>
			
			<div class="info">
				
				<p
				class="nombre">
					Stockeados
				</p>

				<p 
				class="valor">
					{{ model.stockeados }}
				</p>
			</div>
			
			<div class="info">
				
				<p
				class="nombre">
					Sin stockear
				</p>

				<p 
				class="valor">
					{{ model.sin_stockear }}
				</p>
			</div>
			
			<div class="info">
				
				<p
				class="nombre">
					Porcentaje stockeado
				</p>

				<p 
				class="valor">
					<circle-progress
					:size="80"
					:porcentaje="Number(model.porcentaje_stockeado)"></circle-progress>
				</p>
			</div>

		</div>
	</div>
</template>
<script>
import inventory_performance from '@/mixins/inventory_performance'
export default {
	mixins: [inventory_performance],
	components: {
		CircleProgress: () => import('@/components/listado/modals/inventory-performance/CircleProgress'),

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
}
</script>
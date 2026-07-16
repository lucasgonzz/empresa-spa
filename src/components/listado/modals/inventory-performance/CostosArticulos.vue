<template>
	<div 
	v-if="model"
	class="custom-card">
		<div class="header">
			Costos de los Artículos
		</div>

		<div class="body">
			
			<div class="info">
				
				<p
				class="nombre">
					Artículos con costos
				</p>

				<p 
				class="valor">
					{{ model.articulos_con_costos }}
				</p>
			</div>
			
			<div class="info">
				
				<p
				class="nombre">
					Artículos sin costos
				</p>

				<p 
				class="valor">
					{{ model.articulos_sin_costos }}
				</p>
			</div>
			
			<div class="info">
				
				<p
				class="nombre">
					Porcentaje con costos
				</p>

				<p 
				class="valor">
					<circle-progress
					:size="80"
					:porcentaje="model.porcentaje_con_costos"></circle-progress>
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
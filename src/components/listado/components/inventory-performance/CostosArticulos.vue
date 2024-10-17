<template>
	<div 
	v-if="model"
	class="inventario-card">
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
export default {
	components: {
		CircleProgress: () => import('@/components/listado/components/inventory-performance/CircleProgress'),

	},
	computed: {
		model() {
			return this.$store.state.inventory_performance.models[0]
		},
	},
}
</script>
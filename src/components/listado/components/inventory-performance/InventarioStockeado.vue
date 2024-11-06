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
					:porcentaje="model.porcentaje_stockeado"></circle-progress>
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
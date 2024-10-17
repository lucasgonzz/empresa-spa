<template>
	<div 
	v-if="model"
	class="inventario-card">
		<div class="header">
			Estado del Stock
		</div>

		<div class="body">
			
			<div class="info">
				
				<p
				class="nombre">
					Artículos sin stock
				</p>

				<p 
				class="valor">
					{{ model.sin_stock }}
				</p>
			</div>
			
			<div class="info">
				
				<p
				class="nombre">
					Artículos en stock mínimo
				</p>

				<p 
				class="valor">
					{{ model.stock_minimo }}
				</p>
			</div>
			
			<!-- <div class="info">
				
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
			</div> -->

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
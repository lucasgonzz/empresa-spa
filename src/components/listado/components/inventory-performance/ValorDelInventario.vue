<template>
	<div 
	v-if="model"
	class="custom-card">
		<div class="header">
			Valor del Inventario
		</div>

		<div class="body">
			
			<div class="info">
				
				<p
				class="nombre">
					Valor en costos
				</p>

				<p 
				class="valor">
					{{ price(model.valor_inventario_en_costos) }}
				</p>
			</div>
			
			<div class="info">
				
				<p
				class="nombre">
					Valor en precios
				</p>

				<p 
				class="valor">
					{{ price(model.valor_inventario_en_precios) }}
				</p>
			</div>
			
			<div class="info">
				<p
				class="aclaracion">
					Solo se tienen en cuenta los articulos que tienen indicado su stock (actualmente, el {{ model.porcentaje_stockeado }}% del inventario)
				</p>
			</div>
			
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.inventory_performance.models[0]
		},
	},
}
</script>
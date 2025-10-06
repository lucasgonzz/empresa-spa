<template>
	<div>

		<div
		v-if="can('article.edit_stock')">
			<p
			class="m-t-10"
			v-if="typeof model.id == 'undefined'">
				Primero cree el articulo para asignar el stock
			</p>
			
			<div 
			v-else
			class="j-start">
				Presione para editar stock ->
				<stock-btn
				:article="model"></stock-btn>
			</div>
		</div>

		<span
		v-else>
			{{ model.stock }}
		</span>
	</div>
</template>
<script>
export default {
	components: {
		StockBtn: () => import('@/components/listado/components/StockBtn'),
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
		addresses() {
			return this.$store.state.address.models 
		},
		disabled() {
			if (!this.model.id && this.model.stock) {
				return true 
			}
			return false
		},
	},
	methods: {
		stockMovement() {
			this.$bvModal.show('stock-movement')
			setTimeout(() => {
				document.getElementById('stock-movement-amount').focus()
			}, 500)	
		} 
	}
}
</script>
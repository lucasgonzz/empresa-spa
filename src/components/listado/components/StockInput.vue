<template>
	<div>
		<b-form-group
		placeholder="Stock">
			<b-form-input
			v-model="model.stock"
			disabled></b-form-input>
		</b-form-group>
		<b-button
		class="m-t-10"
		size="sm"
		@click="stockMovement"
		variant="primary">
			<span
			v-if="model.id">
				Modificar stock
			</span>
			<span
			v-else>
				Asignar stock
			</span>
		</b-button>
	</div>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.article.model 
		},
		addresses() {
			return this.$store.state.address.models 
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
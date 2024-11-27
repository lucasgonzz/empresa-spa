<template>
	<div>
		<b-form-group
		placeholder="Stock">
			<b-form-input
			v-model="model.stock"
			disabled></b-form-input>
		</b-form-group>
		<!-- <b-button
		v-if="model.id"
		class="m-t-10"
		size="sm"
		:disabled="disabled"
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
		</b-button> -->

		<p
		class="m-t-10"
		v-if="typeof model.id == 'undefined'">
			Primero cree el articulo para asignar el stock
		</p>
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
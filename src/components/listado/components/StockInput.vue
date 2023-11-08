<template>
	<div>
		<b-form-group
		placeholder="Stock">
			<b-form-input
			v-model="model.stock"
			:disabled="addresses.length > 0"></b-form-input>
		</b-form-group>
		<b-button
		v-if="addresses.length > 0"
		class="m-t-10"
		size="sm"
		v-b-modal="'stock-movement'"
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
}
</script>
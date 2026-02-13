<template>
	<div>
		<b-form-input
		:disabled="disabled"
		v-model="article.price"
		placeholder="Precio manual"></b-form-input>
		<p
		class="m-t-10"
		v-if="disabled">
			Elimine el margen de ganancia del articulo y desactive el margen de ganancia del proveedor para poder fijar el precio manualmente
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		disabled() {
			if (
				(
					this.article 
					&& typeof this.article.percentage_gain != 'undefined' 
					&& this.article.percentage_gain !== null 
					&& this.article.percentage_gain != ''
				)
				|| this.article.apply_provider_percentage_gain
			) {
				return true
			}
			return false
		}
	},
}
</script>
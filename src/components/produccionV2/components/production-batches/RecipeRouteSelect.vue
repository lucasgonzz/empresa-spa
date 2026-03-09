<template>
	<b-form-select
	:disabled="disabled"
	v-model="production_batch.recipe_route_id"
	:options="options"></b-form-select>
</template>
<script>
export default {
	computed: {
		production_batch() {
			return this.$store.state.production_batch.model 
		},
		disabled() {
			if (this.production_batch.id) {
				return true
			}
			return false
		},
		options() {
			let options = [{
				value: 0,
				text: 'Seleccione Ruta'
			}]
			if (this.production_batch) {
				let recipe = this.$store.state.recipe.models.find(r => r.id == this.production_batch.recipe_id)

				if (typeof recipe != 'undefined') {

					recipe.recipe_routes.forEach(route => {
						options.push({
							text: route.recipe_route_type.name,
							value: route.id 
						})
					})
				}
			}
			return options
		}
	}
}
</script>
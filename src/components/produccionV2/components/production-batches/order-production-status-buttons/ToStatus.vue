<template>
	<div>
		<b-form-select
		:disabled="!show_to"
		:options="options"
		v-model="model.to_order_production_status_id"></b-form-select>	
	</div>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.production_batch_movement.model 
		},
		/**
		 * Estados que se pueden elegir en el movimiento del lote.
		 *
		 * Si la ruta del lote tiene grupo, se muestran SOLO los estados de ese grupo. Si la
		 * ruta no tiene grupo (o el lote todavia no tiene ruta), se muestran todos los de la
		 * cuenta, que es como funcionaba hasta ahora.
		 *
		 * `production_batch.recipe_route` ya viene cargado desde la API: el scopeWithAll() del
		 * lote hace with('recipe_route'), asi que no hay que pedir nada extra.
		 *
		 * @returns {Array<{value: number, text: string}>}
		 */
		options() {
			let batch = this.$store.state.production_batch.model
			let group_id = batch && batch.recipe_route && batch.recipe_route.order_production_status_group_id
				? batch.recipe_route.order_production_status_group_id
				: null

			let options = [{ value: 0, text: 'Seleccione Estado' }]

			this.$store.state.order_production_status.models.forEach(status => {
				if (group_id && status.order_production_status_group_id != group_id) {
					return
				}
				options.push({ value: status.id, text: status.name })
			})

			return options
		},
		show_to() {
			if (this.model.id) {
				return false
			}
			return true
		}
 	}
}
</script>
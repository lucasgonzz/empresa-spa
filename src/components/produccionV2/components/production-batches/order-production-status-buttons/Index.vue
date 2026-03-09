<template>
	<div>
		
		<!-- FROM status -->
		<b-form-group
		label="Desde estado">
			
			<b-form-select
			:disabled="!show_from"
			:options="get_options_simple('order_production_status')"
			v-model="model.from_order_production_status_id"></b-form-select>	
		</b-form-group>

		<!-- TO status -->
		<b-form-group
		label="Hacia estado">
			
			<b-form-select
			:options="get_options_simple('order_production_status')"
			v-model="model.to_order_production_status_id"></b-form-select>	
		</b-form-group>
	</div>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.production_batch_movement.model 
		},
		show_from() {
			let movement_type = this.$store.state.production_batch_movement_type.models.find(m => m.id == this.model.production_batch_movement_type_id)


			if (typeof movement_type != 'undefined') {
				if (
					movement_type.slug == 'advance'
				) {
					return true
				} 
			}
			return false
		},
		order_production_statuses() {
			return this.$store.state.order_production_status.models 
		},
 	}
}
</script>
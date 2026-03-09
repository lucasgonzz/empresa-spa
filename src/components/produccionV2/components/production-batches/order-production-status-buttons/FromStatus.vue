<template>
	<div>
		
		<!-- FROM status -->
		<b-form-select
		:disabled="!show_from"
		:options="get_options_simple('order_production_status')"
		v-model="model.from_order_production_status_id"></b-form-select>	
	</div>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.production_batch_movement.model 
		},
		show_from() {
			
			if (this.model.id) {
				return false
			}

			let movement_type = this.$store.state.production_batch_movement_type.models.find(m => m.id == this.model.production_batch_movement_type_id)


			if (typeof movement_type != 'undefined') {
				if (
					movement_type.slug == 'advance'
					|| movement_type.slug == 'receive_from_provider'
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
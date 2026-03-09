<template>
	<div>
		<b-form-group
		:disabled="disabled">
			<b-form-select
			:options="get_options_simple('provider')"
			v-model="model.provider_id"></b-form-select>	
		</b-form-group>

	</div>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.production_batch_movement.model 
		},
		disabled() {
			if (this.model.id) {
				return true
			}

			let movement_type = this.$store.state.production_batch_movement_type.models.find(m => m.id == this.model.production_batch_movement_type_id)

			if (
				typeof movement_type != 'undefined' 
				&& (
					movement_type.slug == 'send_to_provider' 
					|| movement_type.slug == 'receive_from_provider' 
				)
			) {
				return false
			}
			return true
		},	
 	}
}
</script>
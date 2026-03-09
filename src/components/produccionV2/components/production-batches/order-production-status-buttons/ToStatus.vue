<template>
	<div>
		<b-form-select
		:disabled="!show_to"
		:options="get_options_simple('order_production_status')"
		v-model="model.to_order_production_status_id"></b-form-select>	
	</div>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.production_batch_movement.model 
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
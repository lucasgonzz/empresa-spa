<template>
	<div>
		<b-form-group
		:disabled="disabled"
		label="Deposito insumos">
			<b-form-select
			:options="get_options_simple('address', 'street')"
			v-model="model.address_id"></b-form-select>	
		</b-form-group>

		<b-form-group
		v-if="show_to"
		:disabled="disabled"
		label="Deposito producido">
			<b-form-select
			:options="get_options_simple('address', 'street')"
			v-model="model.to_address_id"></b-form-select>	
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
			return false
		},	
		show_to() {
			
			let estados = this.$store.state.order_production_status.models
			let ultimo_estado = estados[estados.length - 1]

			if (this.model.to_order_production_status_id == ultimo_estado.id) {
				return true
			}
			return false
		},
		order_production_statuses() {
			return this.$store.state.order_production_status.models 
		},
 	}
}
</script>
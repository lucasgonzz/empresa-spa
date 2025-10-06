<template>
	<b-form-select
	:disabled="disabled"
	v-if="addresses.length > 1"
	v-model="address_id" 
	dusk="address_id"
	:options="getOptions({key: 'address_id', text: 'Direccion'})"></b-form-select> 
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	computed: {
		addresses() {
			return this.$store.state.address.models
		},
		disabled() {
			if (this.index_previus_sales > 0) {
				return true
			}

			if (
				this.is_admin
				|| this.can('vender.cambiar_address_id')
			) {
				return false 
			}
			
			return true
		}
	}
}
</script>

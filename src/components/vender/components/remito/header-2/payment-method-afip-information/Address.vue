<template>
	<b-form-select
	:disabled="index_previus_sales > 0"
	v-if="addresses.length > 1"
	v-model="address_id" 
	:options="getOptions({key: 'address_id', text: 'Direccion'})"></b-form-select> 
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	computed: {
		addresses() {
			return this.$store.state.address.models
		}
	}
}
</script>

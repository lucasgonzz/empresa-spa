<template>
	<b-form-select
	v-if="sale_types.length > 1"
	v-model="sale_type_id" 
	:options="getOptions({key: 'sale_type_id', text: 'Tipo venta'})"></b-form-select> 
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	computed: {
		sale_types() {
			return this.$store.state.sale_type.models
		}
	}
}
</script>

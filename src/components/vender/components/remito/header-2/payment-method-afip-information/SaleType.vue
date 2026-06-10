<template>
	<b-input-group
	v-if="sale_types.length > 1"
	prepend="Tipo venta">
		<b-form-select
		v-model="sale_type_id"
		:options="getOptions({key: 'sale_type_id', text: 'Tipo venta'})"></b-form-select>
	</b-input-group> 
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

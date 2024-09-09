<template>
	<b-form-select
	class="input-discount"
	v-if="item.is_article"
	:class="item.price_type_personalizado_id ? 'verde' : ''"
	v-model="item.price_type_personalizado_id"
	@change="setTotal(null)"
	:options="getOptions({key: 'price_type_id', text: 'Lista de precios'}, null, null)"></b-form-select>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	props: { 
		item: Object,
	},
}
</script>
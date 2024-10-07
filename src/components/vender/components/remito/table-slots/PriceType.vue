<template>
	<b-form-select
	class="input-discount"
	:disabled="is_disabled"
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
	computed: {
		is_disabled() {
			if (this.ya_estaba_en_la_venta) {
				return true
			}
			return false
		},
		ya_estaba_en_la_venta() {
			return typeof this.item.pivot != 'undefined'
		}
	},
	props: { 
		item: Object,
	},
}
</script>
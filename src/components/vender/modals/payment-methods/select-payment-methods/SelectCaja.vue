<template>

	<b-form-select
	class="m-t-10"
	v-if="payment_method.amount"
	v-model="payment_method.caja_id" 
	:options="get_caja_options(payment_method.id)"></b-form-select> 

</template>
<script>
import cajas from '@/mixins/vender/cajas'
export default {
	props: {
		payment_method: Object,
	},
	mixins: [cajas],
}
</script>

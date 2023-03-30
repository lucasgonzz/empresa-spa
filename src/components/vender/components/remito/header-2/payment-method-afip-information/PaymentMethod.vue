<template>
	<b-form-select
	v-model="current_acount_payment_method_id"
	:options="getOptions({key: 'current_acount_payment_method_id', text: 'Metodo de pago'})"></b-form-select> 
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
}
</script>
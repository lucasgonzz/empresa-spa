<template>
	<b-form-select
	v-model="afip_information_id" 
	:options="getOptions({key: 'afip_information_id', text: 'Punto de Venta'})"></b-form-select> 
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
}
</script>

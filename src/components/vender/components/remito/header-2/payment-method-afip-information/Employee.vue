<template>
	<b-form-select
	v-if="can('vender.change_employee')"
	v-model="employee_id" 
	:options="getOptions({key: 'employee_id', text: 'Empleado'})"></b-form-select> 
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
}
</script>

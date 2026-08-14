<template>
	<b-input-group
	v-if="authenticated && hasExtencion('cambiar_empleado_en_vender') && can('vender.change_employee')"
	prepend="Empleado">
		<b-form-select
		:disabled="editando_venta_previa"
		v-model="employee_id"
		:options="getOptions({key: 'employee_id', text: 'Empleado'})"></b-form-select>
	</b-input-group> 
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
}
</script>

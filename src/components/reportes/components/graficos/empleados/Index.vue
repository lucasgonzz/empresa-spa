<template>
	<div
	v-if="sub_view == 'empleados'">

		<ingresos-por-empleado></ingresos-por-empleado>

	</div>
</template>
<script>
export default {
	components: {
		IngresosPorEmpleado: () => import('@/components/reportes/components/graficos/empleados/ingresos-por-empleado/Index'),
	},
	computed: {
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},
	},
}
</script>
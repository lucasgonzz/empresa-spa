<template>
	<div
	v-if="view == 'graficos'">
		
		<nav-component></nav-component>

		<!-- Si company-performance falló, los gráficos quedan sin datos (el store los limpia) y acá se explica por qué -->
		<aviso-error-reporte :mensaje="error"></aviso-error-reporte>

		<ingresos></ingresos>

		<sucursales></sucursales>	

		<empleados></empleados>	

		<gastos></gastos>	

		<clientes></clientes>	

		<articulos></articulos>	
	</div>
</template>
<script>
export default {
	components: {
		AvisoErrorReporte: () => import('@/components/reportes/components/AvisoErrorReporte'),
		NavComponent: () => import('@/components/reportes/components/graficos/nav-component/Index'),
		Ingresos: () => import('@/components/reportes/components/graficos/ingresos/Index'),
		Sucursales: () => import('@/components/reportes/components/graficos/sucursales/Index'),
		Empleados: () => import('@/components/reportes/components/graficos/empleados/Index'),
		Gastos: () => import('@/components/reportes/components/graficos/gastos/Index'),
		Clientes: () => import('@/components/reportes/components/graficos/clientes/Index'),
		Articulos: () => import('@/components/reportes/components/graficos/articulos/Index'),
	},
	computed: {
		/* Mensaje de error del último pedido de company-performance ('' = sin error) */
		error() {
			return this.$store.state.reportes.error_reportes
		},
	},
}
</script>
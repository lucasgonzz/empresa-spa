<template>
	<div>
		
		<ingresos></ingresos>

		<sucursales></sucursales>	

		<empleados></empleados>	

		<gastos></gastos>	

		<clientes></clientes>	

		<articulos></articulos>	

		<cheques></cheques>	
	</div>
</template>
<script>
export default {
	components: {
		Ingresos: () => import('@/components/reportes/components/graficos/ingresos/Index'),
		Sucursales: () => import('@/components/reportes/components/graficos/sucursales/Index'),
		Empleados: () => import('@/components/reportes/components/graficos/empleados/Index'),
		Gastos: () => import('@/components/reportes/components/graficos/gastos/Index'),
		Clientes: () => import('@/components/reportes/components/graficos/clientes/Index'),
		Articulos: () => import('@/components/reportes/components/graficos/articulos/Index'),
		Cheques: () => import('@/components/reportes/components/graficos/cheques/Index'),
	},
}
</script>
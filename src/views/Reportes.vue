<template>
	<div>
		<seleccionar-fecha></seleccionar-fecha>	
		
		<nav-component></nav-component>

		<general></general>	

		<graficos></graficos>	

		<articulos></articulos>	
	</div>
</template>
<script>
export default {
	components: {
		SeleccionarFecha: () => import('@/components/reportes/components/seleccionar-fecha/Index'),
		NavComponent: () => import('@/components/reportes/components/nav-component/Index'),
		General: () => import('@/components/reportes/components/general/Index'),
		Graficos: () => import('@/components/reportes/components/graficos/Index'),
		Articulos: () => import('@/components/reportes/components/articulos/Index'),
	},
}
</script>
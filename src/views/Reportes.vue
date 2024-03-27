<template>
	<div>
		<nav-component></nav-component>

		<general></general>	

		<clientes></clientes>	

		<cheques></cheques>	
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/reportes/components/Nav'),
		General: () => import('@/components/reportes/components/general/Index'),
		Clientes: () => import('@/components/reportes/components/clientes/Index'),
		Cheques: () => import('@/components/reportes/components/cheques/Index'),
	},
}
</script>
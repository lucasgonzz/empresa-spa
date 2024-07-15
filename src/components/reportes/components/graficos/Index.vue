<template>
	<div>
		
		<ingresos></ingresos>

		<gastos></gastos>	

		<clientes></clientes>	

		<cheques></cheques>	
	</div>
</template>
<script>
export default {
	components: {
		Ingresos: () => import('@/components/reportes/components/graficos/ingresos/Index'),
		Gastos: () => import('@/components/reportes/components/graficos/gastos/Index'),
		Clientes: () => import('@/components/reportes/components/graficos/clientes/Index'),
		Cheques: () => import('@/components/reportes/components/graficos/cheques/Index'),
	},
}
</script>
<template>
	<div
	v-if="view == 'clientes'">

		<grafico-deudas-de-clientes></grafico-deudas-de-clientes>

	</div>
</template>
<script>
export default {
	components: {
		GraficoDeudasDeClientes: () => import('@/components/reportes/components/clientes/grafico-deudas-de-clientes/Index'),
	},
}
</script>
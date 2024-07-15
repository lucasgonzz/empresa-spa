<template>
	<div
	v-if="view == 'clientes'">

		<div class="chart-card">
			<div class="header">
				<h4>Clientes deudores</h4>

				<chart-header-options
				module_name="client"
				:total_registros_text="total_registros_text"
				:registros_para_mostrar="clients"></chart-header-options>
			</div>
			<deudas-de-clientes></deudas-de-clientes>
		</div>

	</div>
</template>
<script>
export default {
	components: { 
		DeudasDeClientes: () => import('@/components/reportes/components/graficos/clientes/Chart'),
		ChartHeaderOptions: () => import('@/components/common/chart/HeaderOptions'),
	},
	computed: {
		total_registros_text() {
			return this.clients.length+' clientes'
		},
		clients() {
			return this.$store.state.client.models 
		},
	},
}
</script>
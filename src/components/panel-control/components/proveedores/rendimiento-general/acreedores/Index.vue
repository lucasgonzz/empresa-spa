<template>
	<div class="chart-card">
		<div class="header">
			<h4>Proveedores acreedores (a quienes se les debe)</h4>

			<chart-options
			store_name="acreedores"
			:total_registros_text="total_registros_text"
			:registros_para_mostrar="providers_formated"></chart-options>
		</div>
		<acreedores></acreedores>
	</div>
</template>
<script>
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	components: { 
		Acreedores: () => import('@/components/panel-control/components/proveedores/rendimiento-general/acreedores/Chart'),
		ChartOptions: () => import('@/components/panel-control/components/common/ChartOptions'),
	},
	computed: {
		total_registros_text() {
			return this.providers_formated.length+' proveedores'
		},
	},
}
</script>
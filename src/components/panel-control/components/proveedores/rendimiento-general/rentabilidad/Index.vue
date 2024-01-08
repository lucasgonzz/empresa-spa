<template>
	<div class="chart-card">
		<div class="header">
			<h4>Porcentaje de rentabilidad sobre el total vendido de cada proveedor</h4>

			<chart-options
			store_name="rentabilidad"
			:total_registros_text="total_registros_text"
			:registros_para_mostrar="providers_formated"></chart-options>
		</div>
		<total-vendido-y-rentabilidad></total-vendido-y-rentabilidad>
	</div>
</template>
<script>
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	components: { 
		TotalVendidoYRentabilidad: () => import('@/components/panel-control/components/proveedores/rendimiento-general/rentabilidad/Chart'),
		ChartOptions: () => import('@/components/panel-control/components/common/ChartOptions'),
	},
	computed: {
		total_registros_text() {
			return this.providers_formated.length+' proveedores'
		},
		current_page() {
			return this.$store.state.panel_control.provider.total_vendido_y_rentabilidad.current_page 
		},
		order_by() {
			return this.$store.state.panel_control.provider.total_vendido_y_rentabilidad.order_by 
		},
	},
	methods: {
		setOrderBy(order_by) {
			this.$store.commit('panel_control/provider/total_vendido_y_rentabilidad/setOrderBy', order_by)
		},
		incrementPage() {
			this.$store.commit('panel_control/provider/total_vendido_y_rentabilidad/incrementCurrentPage')
		},
		decrementPage() {
			this.$store.commit('panel_control/provider/total_vendido_y_rentabilidad/decrementCurrentPage')
		},
	}
}
</script>
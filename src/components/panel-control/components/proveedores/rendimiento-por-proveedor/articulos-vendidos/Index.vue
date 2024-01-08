<template>
	<div class="chart-card">
		<div class="header">
			<h4>
				Articulos vendidos desde hace un año
			</h4>

			<chart-options
			store_name="articulos_vendidos"
			:total_registros_text="total_registros_text"
			:registros_para_mostrar="unidades_vendidas"></chart-options>
		</div>
		<articulos-vendidos></articulos-vendidos>
	</div>
</template>
<script>
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	components: { 
		ArticulosVendidos: () => import('@/components/panel-control/components/proveedores/rendimiento-por-proveedor/articulos-vendidos/Chart'),
		ChartOptions: () => import('@/components/panel-control/components/common/ChartOptions'),
	},
	computed: {
		total_registros_text() {
			return this.unidades_vendidas.length+' articulos'
		}
	}
}
</script>
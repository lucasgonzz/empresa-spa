<template>
	<div
	v-if="sub_view == 'rendimiento-por-proveedor'">
		<provider-cards></provider-cards>
		<div
		v-if="selected_provider">
			<h3>
				Proveedor seleccionado: {{ selected_provider.name }}
			</h3>
			<articulos-vendidos></articulos-vendidos>

			<div 
			v-if="selected_article"
			class="chart-card">
				<div class="header">
					<h4>
						Ventas por mes de {{ selected_article.article_name }}
					</h4>
					<h5
					v-if="stock_actual">
						<strong>
							Stock actual: {{ stock_actual }}
						</strong>
					</h5>
				</div>
				<article-ventas-por-mes></article-ventas-por-mes>
			</div>
		</div>
	</div>
</template>
<script>
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	components: {
		ProviderCards: () => import('@/components/panel-control/components/proveedores/rendimiento-por-proveedor/ProviderCards'),
		ArticulosVendidos: () => import('@/components/panel-control/components/proveedores/rendimiento-por-proveedor/articulos-vendidos/Index'),
		ArticleVentasPorMes: () => import('@/components/panel-control/components/proveedores/rendimiento-por-proveedor/ArticleVentasPorMes'),
	},
	mounted() {
		this.setProviderArticles(null)
	}
}
</script>
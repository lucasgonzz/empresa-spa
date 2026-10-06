<template>
	<div>
		
		<cobros></cobros>

		<pedidos-proveedor></pedidos-proveedor>

		<pedidos-online></pedidos-online>

		<mensajes></mensajes>

		<deposit-movements></deposit-movements>

		<problemas-al-facturar></problemas-al-facturar>

		<stock-minimo></stock-minimo>

		<!--
			Catalogo: las busquedas de imagenes inteligentes (mision imagenes-catalogo-completo,
			27/9/2026) y los sistemas de categorias con IA (mision categorizacion-tres-modelos,
			5/10/2026), cada una en su sub-solapa.

			A diferencia de las otras secciones, el `v-if` va ACA y no adentro del componente:
			asi el chunk y sus pedidos (la tabla de busquedas, el refresco periodico mientras una
			corre, los sistemas de categorias) solo existen mientras la pestaña esta abierta. Las
			demas se montan siempre y se esconden solas, y por eso la de stock minimo pide su
			reporte apenas se entra a Alertas por cualquier pestaña.

			`view == 'imagenes'` es la URL de antes de esta solapa (/alertas/imagenes): Alertas.vue la
			lleva a /alertas/catalogo/imagenes con un `replace`, pero hasta que eso pasa tiene que
			verse lo mismo, asi que se monta igual.
		-->
		<catalogo
		v-if="view == 'catalogo' || view == 'imagenes'"></catalogo>

	</div>
</template>
<script>
export default {
	components: {
		Cobros: () => import('@/components/alertas/components/lista-de-alertas-table/Cobros'),
		PedidosProveedor: () => import('@/components/alertas/components/lista-de-alertas-table/PedidosProveedor'),
		PedidosOnline: () => import('@/components/alertas/components/lista-de-alertas-table/PedidosOnline'),
		Mensajes: () => import('@/components/alertas/components/lista-de-alertas-table/Mensajes'),
		DepositMovements: () => import('@/components/alertas/components/lista-de-alertas-table/DepositMovements'),
		ProblemasAlFacturar: () => import('@/components/alertas/components/lista-de-alertas-table/problemas-al-facturar/Index'),
		StockMinimo: () => import('@/components/alertas/components/lista-de-alertas-table/stock-minimo/Index'),
		Catalogo: () => import('@/components/alertas/components/lista-de-alertas-table/catalogo/Index'),
	}
}
</script>
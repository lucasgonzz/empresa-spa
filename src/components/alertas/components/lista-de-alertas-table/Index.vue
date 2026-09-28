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
			Busquedas de imagenes inteligentes (mision imagenes-catalogo-completo, 27/9/2026).

			A diferencia de las otras secciones, el `v-if` va ACA y no adentro del componente:
			asi el chunk y sus pedidos (la tabla de busquedas, el refresco periodico mientras una
			corre) solo existen mientras la pestaña esta abierta. Las demas se montan siempre y
			se esconden solas, y por eso la de stock minimo pide su reporte apenas se entra a
			Alertas por cualquier pestaña.
		-->
		<imagenes
		v-if="view == 'imagenes'"></imagenes>

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
		Imagenes: () => import('@/components/alertas/components/lista-de-alertas-table/imagenes/Index'),
	}
}
</script>
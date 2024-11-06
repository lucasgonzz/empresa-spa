<template>
	<div>
		
		<cobros></cobros>

		<pedidos-proveedor></pedidos-proveedor>

		<pedidos-online></pedidos-online>

		<mensajes></mensajes>

		<deposit-movements></deposit-movements>

		<problemas-al-facturar></problemas-al-facturar>

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
		ProblemasAlFacturar: () => import('@/components/alertas/components/lista-de-alertas-table/ProblemasAlFacturar'),
	}
}
</script>
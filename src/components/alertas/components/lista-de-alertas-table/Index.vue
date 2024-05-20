<template>
	<div>
		
		<cobros></cobros>

		<pedidos-proveedor></pedidos-proveedor>

	</div>
</template>
<script>
export default {
	components: {
		Cobros: () => import('@/components/alertas/components/lista-de-alertas-table/Cobros'),
		PedidosProveedor: () => import('@/components/alertas/components/lista-de-alertas-table/PedidosProveedor'),
	}
}
</script>
<template>
	<div>
		
		<!--
			Misión permisos-navegacion-empleados (decisión de Lucas, 9/10/2026): cada sección se
			monta solo si su solapa está en `solapas_permitidas`, que arma views/Alertas.vue con LA
			regla de las solapas (puede_ver_solapa_de_alertas, en mixins/alert_infos.js).

			Esconder la pestaña no alcanzaba: cada sección se muestra sola con su `v-if` de `view`,
			así que /alertas/stock-minimo dibujaba Stock mínimo para un empleado sin `article.index`.
			Y como todas se montaban siempre, Stock mínimo pedía su reporte en `created()` apenas se
			entraba a Alertas, aunque la persona no pudiera verlo.
			Con el `v-if` acá, lo que no se puede ver ni se monta ni pide nada.

			Los `v-if` de `view` de adentro de cada componente quedan como estaban: siguen
			eligiendo cuál de las montadas se ve.
		-->
		<cobros
		v-if="solapas_permitidas.indexOf('cobros') !== -1"></cobros>

		<pedidos-proveedor
		v-if="solapas_permitidas.indexOf('pedidos-proveedor') !== -1"></pedidos-proveedor>

		<pedidos-online
		v-if="solapas_permitidas.indexOf('pedidos-online') !== -1"></pedidos-online>

		<mensajes
		v-if="solapas_permitidas.indexOf('mensajes') !== -1"></mensajes>

		<deposit-movements
		v-if="solapas_permitidas.indexOf('movimientos-de-depositos') !== -1"></deposit-movements>

		<problemas-al-facturar
		v-if="solapas_permitidas.indexOf('facturacion') !== -1"></problemas-al-facturar>

		<stock-minimo
		v-if="solapas_permitidas.indexOf('stock-minimo') !== -1"></stock-minimo>

		<!--
			Catalogo: las busquedas de imagenes inteligentes (mision imagenes-catalogo-completo,
			27/9/2026) y los sistemas de categorias con IA (mision categorizacion-tres-modelos,
			5/10/2026), cada una en su sub-solapa.

			A diferencia de las otras secciones, el `v-if` va ACA y no adentro del componente:
			asi el chunk y sus pedidos (la tabla de busquedas, el refresco periodico mientras una
			corre, los sistemas de categorias) solo existen mientras la pestaña esta abierta. Las
			demas se montan solo si su solapa esta permitida (mision permisos-navegacion-empleados,
			9/10/2026); para quien la tiene se montan apenas se entra a Alertas y se esconden solas
			por `view`, como antes, y por eso la de stock minimo pide su reporte apenas se entra a
			Alertas por cualquier pestaña.

			`view == 'imagenes'` es la URL de antes de esta solapa (/alertas/imagenes): Alertas.vue la
			lleva a /alertas/catalogo/imagenes con un `replace`, pero hasta que eso pasa tiene que
			verse lo mismo, asi que se monta igual.

			Ademas pide que la solapa `catalogo` este permitida (mision
			permisos-navegacion-empleados, 9/10/2026: `article.index`). El alias viejo se mide
			contra el slug nuevo: en `solapas_permitidas` solo esta `catalogo`.
		-->
		<catalogo
		v-if="(view == 'catalogo' || view == 'imagenes') && solapas_permitidas.indexOf('catalogo') !== -1"></catalogo>

	</div>
</template>
<script>
export default {
	props: {
		/**
		 * Los slugs de URL de las solapas de Alertas que esta persona puede ver (`cobros`,
		 * `stock-minimo`, `catalogo`, ...), en el orden de las pestañas. Los arma views/Alertas.vue
		 * (`solapas_de_alertas_permitidas`) con puede_ver_solapa_de_alertas de
		 * mixins/alert_infos.js. Vacío (el default) = no se monta ninguna sección: ante la duda se
		 * muestra de menos, no de más.
		 */
		solapas_permitidas: {
			type: Array,
			default: () => [],
		},
	},
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
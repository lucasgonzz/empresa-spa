<template>
	<div>
		<current-acounts></current-acounts>

		<!--
			El modal de puntos se monta ACÁ, como hermano de <clients> y no adentro del slot de
			la tabla: adentro del slot se instanciaría una vez por fila. Lo abre el botón
			"Puntos" de la fila del cliente, por el bus de $root.

			El v-if es el mismo gate con el que el backend gatea las rutas del módulo
			(middleware `check_extencion_empresa:puntos_clientes`): sin la extensión, los
			endpoints contestan 403, así que la pantalla no se monta ni escucha el bus.
		-->
		<puntos-cliente v-if="hasExtencion('puntos_clientes')"></puntos-cliente>

		<nav-component></nav-component>

		<clients></clients>
		<payment-plan></payment-plan>
		<sellers></sellers>
	</div>
</template>
<script>
export default {
	components: {
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		NavComponent: () => import('@/components/client/components/NavComponent'),
		Clients: () => import('@/components/client/components/clients/Index'),
		PaymentPlan: () => import('@/components/client/components/payment-plan/Index'),
		Sellers: () => import('@/components/client/components/sellers/Index'),
		PuntosCliente: () => import('@/components/client/modals/puntos/Index'),
	}
}
</script>

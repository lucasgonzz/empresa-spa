<template>
	<div
	v-if="view == 'planes-de-pago'">

		<nav-component></nav-component>

		<cuotas-pendientes></cuotas-pendientes>
		<cuotas-pagas></cuotas-pagas>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/client/components/payment-plan/NavComponent'),
		CuotasPendientes: () => import('@/components/client/components/payment-plan/cuotas-pendientes/Index'),
		CuotasPagas: () => import('@/components/client/components/payment-plan/cuotas-pagas/Index'),
	},
}
</script>
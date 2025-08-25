<template> 
	<div>
		<current-acounts></current-acounts>
		
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
	}
}
</script>
<template>
	<div
	id="plans"
	class="plans">
		<div class="titles">
			<h4
			class="animate__animated animate__fadeIn">
				Conoce nuestros Planes
			</h4>
			<h5>
				Tenes 1 mes de prueba GRATIS.
			</h5>
			<h5>
				Sin tarjetas de credito.
			</h5>
			<h5>
				No cobramos ninguna instalacion.
			</h5>
		</div>
		<plans-wrapper></plans-wrapper>
	</div>
</template>
<script>
export default {
	components: {
		PlansWrapper: () => import('@/components/home/components/plans/PlansWrapper'),
	},
}
</script>

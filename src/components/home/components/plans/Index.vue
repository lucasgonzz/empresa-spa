<template>
	<div
	class="features">
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
		<div class="cont-features">
			<plan
			v-for="(plan, i) in plans"
			:key="i"
			:plan="plan">
			</plan>	
		</div>
	</div>
</template>
<script>
export default {
	components: {
		Plan: () => import('@/components/home/components/plans/Plan'),
	},
	computed: {
		plans() {
			return [
				{
					title: 'Para Minoristas',
					price: '$2.500',
					user_price: '$300',
					online_price: '$2.000',
					// Limites: hasta 100 clientes
				},
				{
					title: 'Para Mayoristas',
					price: '$4.000',
					user_price: '$500',
					online_price: '$3.000',
				},
			]
		}
	}
}
</script>

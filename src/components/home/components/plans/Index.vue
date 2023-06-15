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
					title: 'Plan Basico',
					price: '$2.500',
					user_price: '$300',
					online_price: '$2.000',
					limits: [
						{
							title: 'Ventas',
							text: 'Hasta 700/mes',	
						},
						{
							title: 'Facturacion electronica',
							text: 'Si',	
						},
						{
							title: 'Inventario',
							text: 'Hasta 3.500 articulos',	
						},
						{
							title: 'Sucursales',
							text: '1 maximo',	
						},
						{
							title: 'Clientes',
							text: '10 maximo',	
						},
						{
							title: 'Proveedores',
							text: '10 maximo',	
						},
					],
					// Limites: hasta 100 clientes
				},
				{
					title: 'Plan Premium',
					price: '$4.000',
					user_price: '$500',
					online_price: '$3.000',
					limits: [
						{
							title: 'Ventas',
							text: 'Ilimitadas',	
						},
						{
							title: 'Facturacion electronica',
							text: 'Si',	
						},
						{
							title: 'Inventario',
							text: 'Ilimitado',	
						},
						{
							title: 'Sucursales',
							text: 'Ilimitadas',	
						},
						{
							title: 'Clientes',
							text: 'Ilimitados',	
						},
						{
							title: 'Proveedores',
							text: 'Ilimitados',	
						},
					],
				},
			]
		}
	}
}
</script>

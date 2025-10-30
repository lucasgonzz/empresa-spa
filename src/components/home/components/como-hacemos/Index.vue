<template>
	<div class="como-hacemos">
		<h4>
			¿Como hacemos?
		</h4>

		<vue-horizontal-list 
		:items="cards" :options="options">
			<template v-slot:default="{ item }">
				<card
				:card="item"></card>
			</template>
		</vue-horizontal-list>
	</div>
</template>
<script>
export default {
	components: {
		VueHorizontalList: () => import('vue-horizontal-list'),
		Card: () => import('@/components/home/components/como-hacemos/Card'),
	},
	computed: {
		options() {
			return {
				responsive: [
					{ end: 576, size: 1 },
					{ start: 576, end: 992, size: 2 },
					{ start: 992, size: 4 },
				],
				list: {
					// 1200 because @media (min-width: 1200px) and therefore I want to switch to windowed mode
					windowed: 0,

					// Because: #app {padding: 80px 24px;}
					padding: 100,
				},
				position: {
					start: 0,
				},
				autoplay: { play: true, repeat: true, speed: 10000 },
			}
		},
		cards() {
			return [
				{
					num: 1,
					title: 'Entender la situación actual',
					time: '1 hora',
					items: [
						'Agendamos una reunion de consultoria gratuita, identifiamos las tareas del negocio automatizables y la información que la empresa necesita tener disponible.',
					],	
				},
				{
					num: 2,
					title: 'Instalación y configuración',
					time: '1 dia',
					items: [
						'Instalamos tu version del sistema y cargamos la información de tu negocio para que puedas empezar a trabajar desde el primer dia.',
					],	
				},
				{
					num: 3,
					title: 'Propuestas a implementar',
					time: '2 dias',
					items: [
						'Diseñar una propuesta para cada necesidad identificada en la reunion.',
						'Para luego analizar cada funcionalidad con la empresa y ver si es la mejor opción para ese problema en específico.',
					],	
				},
				{
					num: 4,
					title: 'Feedback y últimos ajustes',
					time: '1 a 8 semanas',
					items: [
						'En este punto, con el sistema ya en marcha, la empresa va a tomar conciencia de las posibilidades que tiene a la hora de automatizar y de entrecruzar la información dentro del sistema, por lo que van a identificar nuevos procesos para volcar dentro del sistema y nuevas funcionalidades para explotar mejor la información que ya están trabajando.',
					],	
				},
			]
		} 
	}
}
</script>
<style lang="sass">
.como-hacemos
	h4 
		font-size: 50px
		margin: 50px 0
	.cont-cards-como-hacemos
		display: flex 
		flex-direction: row 
		justify-content: center 
		align-items: center
		flex-wrap: wrap  
</style>
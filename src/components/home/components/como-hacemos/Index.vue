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
					{ start: 992, size: 3 },
				],
				list: {
					// 1200 because @media (min-width: 1200px) and therefore I want to switch to windowed mode
					windowed: 0,

					// Because: #app {padding: 80px 24px;}
					padding: 100,
				},
				position: {
					start: 1,
				},
				autoplay: { play: true, repeat: true, speed: 10000 },
			}
		},
		cards() {
			return [
				{
					num: 1,
					title: 'Entender la situación actual',
					time: '1 semana',
					items: [
						'Identificar las tareas del negocio automatizables y la información que la empresa necesita tener disponible.',
					],	
				},
				{
					num: 2,
					title: 'Propuestas a implementar',
					time: '1 semana',
					items: [
						'Diseñar una propuesta para cada necesidad identificada en el punto 1.',
						'Para luego analizar cada funcionalidad a implementar con la empresa y ver si es la mejor opción para ese problema en específico.',
					],	
				},
				{
					num: 3,
					title: 'Primera adaptación del sistema',
					time: '1 a 3 semanas',
					items: [
						'Desarrollar solo las funcionalidades indispensables para que la empresa pueda comenzar a trabajar con el sistema.',
					],	
				},
				{
					num: 4,
					title: 'Capacitación y puesta en marcha',
					time: '2 semanas',
					items: [
						'Capacitar a la empresa para que puedan ingresar la información al sistema y comenzar a utilizarlo.',
					],	
				},
				{
					num: 5,
					title: 'Seguimiento',
					time: 'Mientras se hace el seguimiento se ejecuta la 6ta etapa',
					items: [
						'Hacer un seguimiento de cómo están ingresando la información al sistema, para asegurar la máxima explotación de la misma y evitar problemas futuros.',
					],	
				},
				{
					num: 6,
					title: 'Segunda adaptación del sistema',
					time: '1 a 6 semanas',
					items: [
						'Comenzar a poner en marcha el resto de las funcionalidades acordadas en el punto 2, que no eran indispensables para que la empresa pueda comenzar a utilizar el sistema, pero que en este punto van a aportar gran valor a la hora de explotar la información.',
					],	
				},
				{
					num: 7,
					title: 'Feedback y últimos ajustes',
					time: '2 a 4 meses',
					items: [
						'En este punto la empresa va a tomar conciencia de las posibilidades que tiene a la hora de automatizar y de entrecruzar la información dentro del sistema, por lo que van a identificar nuevos procesos para volcar dentro del sistema y nuevas funcionalidades para explotar mejor la información que ya están trabajando.',
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
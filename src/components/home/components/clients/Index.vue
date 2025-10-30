<template>
	<div
	id="clients"
	class="m-b-50">
		<h2>
			Negocios que confian en ComercioCity
		</h2>
		<h4>
			Nuestros clientes 
		</h4>

		<div class="clients">
			<div class="cont-clients">
				<client
				v-for="client in clients"
				:_client="client"></client>	
			</div>
		</div>
		
		
		<!-- <vue-horizontal-list 
		:items="clients" :options="options">
			<template v-slot:default="{ item }">
				<client
				:client="item"></client>	
			</template>
		</vue-horizontal-list> -->
	</div>
</template>
<script>
export default {
	components: {
		Client: () => import('@/components/home/components/clients/Client'),
		VueHorizontalList: () => import('vue-horizontal-list'),
	},
	data() {
		return {
			clients: [],
			options: {
				responsive: [
					{ start: 0, end: 768, size: 1 },
					{ start: 768, end: 992, size: 3 },
					{ start: 992, size: 5 },
				],
				item: {
					// css class to inject into each individual item
					class: "",
					// padding between each item
					padding: 100,
				},
				navigation: {
					// when to show navigation
					start: 2000,
					color: "#000",
				},
				list: { 
					// 1200 because @media (min-width: 1200px) and therefore I want to switch to windowed mode
					windowed: 0,

					// Because: #app {padding: 80px 24px;}
					padding: 100,
				},
				position: {
					start: 1,
				},
				autoplay: { play: true, repeat: true, speed: 2000 },
			},
		}
	},
	created() {
		this.getClients()
	},
	methods: {
		getClients() {
			this.$axios.get('home/clients')
			.then(res => {
				this.clients = res.data.models 
			})
			.catch(err => {
				console.log(err)
			})
		}
	}
}
</script>
<style lang="sass">
#clients
	h2 
		font-size: 50px
		margin: 100px 0


.clients 
	overflow-x: auto
	width: 100%

	.cont-clients 
		display: flex 
		@media screen and (max-width: 768px) 
			// width: 4000px
			padding-bottom: 15px
			flex-direction: column
			flex-wrap: wrap
			justify-content: flex-start
			align-items: space-between
			overflow-x: auto
			height: 1000px
		@media screen and (min-width: 768px) 
			flex-wrap: wrap 
			flex-direction: row
			justify-content: flex-start
</style>
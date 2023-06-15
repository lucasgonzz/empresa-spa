<template>
	<div
	class="m-b-50">
		<div class="titles">
			<h6>
				Algunos de nuestros clientes
			</h6>
		</div>
		
		<vue-horizontal-list 
		:items="clients" :options="options">
			<template v-slot:default="{ item }">
				<client
				:client="item"></client>	
			</template>
		</vue-horizontal-list>
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
					{ end: 768, size: 3 },
					{ start: 768, size: 5 },
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
.clients 
	display: flex 
	flex-direction: row 
</style>
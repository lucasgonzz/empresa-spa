<template>
	<div class="casos-de-exito-card">
		<img :src="image">

		<div class="name">
			{{ client.name }}
		</div>
		<p 
		class="empleados">
			<i class="icon-users p-r-10"></i>
			{{ client.empleados }} empleados
		</p>

		<div 
		class="descriptions">
			<p
			v-for="description in client.descriptions">
				<i class="icon-right"></i>
				{{ description }}
			</p>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		client: Object,
	},
	computed: {
		image() {
			return require('@/assets/clientes/'+this.client.img) 
		}
	}
}
</script>
<style lang="sass">
.casos-de-exito-card
	width: 500px
	display: flex 
	flex-direction: column
	justify-content: center 
	align-items: center 
	padding: 20px
	border-radius: 10px
	border: 2px solid #DDDDDD
	background: #FFF
	margin: auto

	img 
		width: 300px

	.name 
		font-size: 30px 
		font-weight: bold 
		margin: 15px 0

	.empleados 
		text-align: left 
		width: 100% 
		margin: 15px 0
		font-weight: bold 

	.descriptions 
		p 
			text-align: left 

</style>
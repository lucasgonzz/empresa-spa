<template>
	<div 
	@click="toClient"
	class="client">
		<img 
		v-if="client.image_url"
		:src="client.image_url">
		<p
		v-else>
			{{ client.company_name }}
		</p>
	</div>
</template>
<script>
export default {
	props: {
		client: Object,
	},
	methods: {
		toClient() {
			window.open(this.client.online)
		}
	}
}
</script>
<style lang="sass">
.client 
	background: #FFF
	border-radius: 50%
	width: 150px
	height: 150px
	// margin: 15px
	display: flex 
	flex-direction: row 
	justify-content: center 
	align-items: center
	box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px 
	cursor: pointer
	&:hover 
		transform: scale(1.07)
		transition: all .2s
	img
		width: 68% 
		height: auto
	p 
		margin-bottom: 0
		font-size: 20px
		font-weight: bold
</style>
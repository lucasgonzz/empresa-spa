<template>
	<div class="como-hacemos-card">
		<div class="num">
			{{ card.num }}
		</div>
		<div class="title">
			{{ card.title }}
		</div>
		<div class="time">
			{{ card.time }}
		</div>
		<div 
		v-for="item in card.items"
		class="item">
			{{ item }}
		</div>
	</div>
</template>
<script>
export default {
	props: {
		card: Object,
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.como-hacemos-card
	width: 300px
	display: flex 
	flex-direction: column
	justify-content: center 
	align-items: center 
	padding: 20px
	border-radius: 10px
	border: 2px solid #DDDDDD
	background: #FFF
	margin: 15px

	.num 
		width: 50px
		height: 50px
		background: darken($blue, 30)
		color: #FFF
		display: flex 
		justify-content: center 
		align-items: center
		border-radius: 50%
		font-size: 25px 
		font-weight: bold 

	.title 
		color: #333 
		font-size: 20px

	.time 
		font-weight: bold 
		font-size: 15px 
		margin-bottom: 10px

	.item 
		text-align: left 
</style>
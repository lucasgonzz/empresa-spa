<template>
	<div class="plan">
		<div class="name">
			{{ plan.name }}
		</div>
		<div class="price">
			{{ plan.price }}
		</div>
		<div 
		v-for="feature in plan.features"
		class="plan-feature">
			<p
			class="feature-title d-lg-none">
				{{ feature.title }}
			</p>
			<p>
				{{ feature.value }}
			</p>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		plan: Object,
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.plan 
	
	@media screen and (max-width: 992px)
		border: 1px solid lighten($blue, 30)
		border-radius: 7px
		padding: 25px
	@media screen and (min-width: 992px)
		padding: 0 25px
		border-right: 1px solid rgba(0, 0, 0, .4)
		&:last-child 
			border-right: none 
	
	p 
		margin-bottom: 0

	.name 
		font-size: 30px
		color: $blue 

	.price 
		font-weight: bold
		font-size: 50px
		line-height: 60px
		text-align: center
		letter-spacing: 2px
		color: $blue 
		background: lighten($blue, 40)
		border-radius: 15px
		padding: 10px
		margin: 20px 0

	.plan-feature
		text-align: center 
		font-weight: bold 

		font-size: 17px

		margin: 10px 0
		
		display: flex 
		flex-direction: row 
		justify-content: space-between
		align-items: center	
		@media screen and (max-width: 992px)
			border-bottom: 1px solid rgba(0,0,0,.3)
			padding-bottom: 10px
			font-weight: normal 

		@media screen and (min-width: 992px)
			border-bottom: 1px solid rgba(0,0,0,.3)

			.feature-title
				color: rgba(0,0,0,.3)

</style>
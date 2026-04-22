<template>
	<div class="feature">
		<img 
		:src="image" alt="">
		<p class="feature-title">
			{{ feature.title }}
		</p>
		<div 
		v-for="item in feature.items"
		class="items">
			<p>
				{{ item }}
			</p>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		feature: Object,
	},
	computed: {
		image() {
			return require('@/assets/'+this.feature.img) 
		}
	}
}
</script>
<style lang="sass">
.feature 
	@media screen and (max-width: 992px)
		width: 45%
	@media screen and (min-width: 992px)
		width: 30%
	img 
		width: 100px
	margin-bottom: 30px
	.feature-title
		font-size: 25px
		font-weight: bold 
		margin: 20px 0
	.items 
		p 
			@media screen and (max-width: 992px)
				font-size: 12px
			@media screen and (min-width: 992px)
				font-size: 14px
			color: rgb(68, 68, 68)
			line-height: 20px
			margin: 0px auto 8px
</style>
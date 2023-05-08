<template>
	<div class="feature">
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
}
</script>
<style lang="sass">
.feature 
	@media screen and (max-width: 992px)
		width: 45%
	@media screen and (min-width: 992px)
		width: 30%
	.feature-title
		font-size: 20px
		font-weight: bold 
		margin: 20px 0
	.items 
		p 
			font-size: 12px
			color: rgb(68, 68, 68)
			margin-bottom: 0
</style>
<template>
	<div class="plan s-1">
		<div class="cont-info">
			<div class="name">
				{{ plan.name }}
			</div>
			<div class="cont-price">
				<span class="price">
					{{ price(pago_anual, false, false) }}
				</span> 
				<span>
					por mes (Pago Anual)
				</span>
				<span class="price-mensual">
					{{ price(pago_mensual, false, false) }}
				</span>
				<span>
					por mes (Pago Mensual)
				</span>
			</div>
		</div>
		<div 
		v-for="feature in plan.plan_features"
		class="plan-feature">
			<p
			class="feature-title d-lg-none">
				{{ feature.name }}
			</p>
			<div>
				<div
				v-if="feature.pivot.value == 'Si'"
				class="text-success">
					<img src="@/assets/check.png" alt="">
					Si
				</div>
				<div
				v-else-if="feature.pivot.value == 'No'"
				class="text-danger">
					<img src="@/assets/cancel.png" alt="">
					No					
				</div>
				<span
				v-else>
					{{ feature.pivot.value }}
				</span>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		plan: Object,
	},
	computed: {
		dolar() {
			return this.$store.state.dolar.promedio
		},
		pago_anual() {
			return this.plan.price * this.dolar
		},
		pago_mensual() {
			return this.pago_anual + this.pago_anual * 10 / 100
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.plan 
	
	border-radius: 7px
	background: #FFF
	@media screen and (max-width: 992px)
		border: 2px solid lighten($blue, 30)
		padding: 25px
		box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px
	@media screen and (min-width: 992px)
		padding: 25px 25px 0
		// border-right: 1px solid rgba(0, 0, 0, .2)
		width: 23%
		margin: 0 1%
		&:hover 
			.cont-info
				transform: scale(1.1) translateY(-10px)
				transition: all .2s
		&:last-child 
			border-right: none 
	
	p 
		margin-bottom: 0

	.name 
		color: $blue 
		font-size: 30px

	.cont-price 
		background: lighten($blue, 40)
		border-radius: 15px
		padding: 10px
		margin: 20px 0
		display: flex 
		flex-direction: column 
		justify-content: center
		align-items: center
		.price
			font-weight: bold
			line-height: 60px
			text-align: center
			letter-spacing: 2px
			color: $blue 

			@media screen and (max-width: 1200px)
				font-size: 50px
			@media screen and (min-width: 1200px)
				font-size: 50px

		span 
			font-size: 12px

		.price-mensual 
			margin-top: 10px
			font-size: 30px


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

		img 
			width: 20px
			margin-top: -4px
			// padding-bottom: 3px

</style>
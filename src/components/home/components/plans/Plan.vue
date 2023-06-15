<template>
	<div
	class="w-100">
		<div class="plan animate__animated animate__fadeIn">
			<h2>
				{{ plan.title  }}
			</h2>
			<div class="cont-plan">
				<div class="plan-price">
					<img src="@/assets/access.png" alt="">
					<p
					class="plan-title">
						Acceso a todas las funciones
					</p>
					<p
					class="price">
						{{ plan.price }}
						<span>/mes</span>
					</p>
				</div>
				<div class="user-price">
					<img src="@/assets/userplus.png" alt="">
					<p
					class="plan-title">
						Cada usuario extra
					</p>
					<p
					class="price">
						{{ plan.user_price }}
						<span>/mes</span>
					</p>
				</div>
				<div class="online-price">
					<img src="@/assets/tienda3.png" alt="">
					<p
					class="plan-title">
						Tu propia Tienda Online
					</p>
					<p
					class="price">
						{{ plan.online_price }}
						<span>/mes</span>
					</p>
				</div>
			</div>
			<p class="alcance">
				Alcance
			</p>
			<div 
			class="limits">
				<div 
				v-for="limit in plan.limits"
				class="limit">
					<img src="@/assets/check.png" alt="">
					<span class="limit-title">
						{{ limit.title }} 
					</span>
					<em class="text">
						{{ limit.text }}
					</em>
				</div>
			</div>
		</div>
		<hr>
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
.plan 
	width: 100%
	&:last-child
		margin-top: 100px
	h2
		text-align: left 
		margin: 30px 0 
		@media screen and (max-width: 992px)
			text-align: center 
	img 
		width: 100px
	.cont-plan
		width: 100%
		display: flex
		flex-direction: row 
		justify-content: space-between
		// border: 2px solid #000
		@media screen and (min-width: 992px)
			padding: 0 100px
		@media screen and (max-width: 992px)
			flex-wrap: wrap 
			& > div 
				width: 100%
				margin-bottom: 30px
		[class^='icon-']
			font-size: 60px
		.plan-title 
			color: #000
			font-size: 18px
			// margin-bottom: 0
			margin: 20px 0
			@media screen and (max-width: 992px)
				margin: 10px 0
		.price 
			color: rgba(0, 0, 0, .6)
			// font-weight: bold 
			font-size: 40px
			span 
				font-size: 20px
	.alcance 
		font-size: 25px
		margin: 50px 0 30px
		// text-align: left
	.limits 
		display: flex
		flex-direction: row
		flex-wrap: wrap 
		margin: auto
		width: 100%
		@media screen and (min-width: 768px)
			width: 50%
		.limit 
			display: flex 
			flex-direction: row 
			width: 100%
			align-items: center
			img 
				width: 30px
				margin-right: 15px
			.limit-title
				width: 200px
				text-align: left
				font-weight: bold
				width: calc(50% - 30px)
				margin: 10px 0
			.text 
				width: 50%


</style>
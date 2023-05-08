<template>
	<div
	class="w-100">
		<div class="plan">
			<h2>
				{{ plan.title  }}
			</h2>
			<div class="cont-plan">
				<div class="plan-price">
					<i class="icon-user"></i>
					<p
					class="plan-title">
						Acceso a todas las funciones
					</p>
					<p
					class="price">
						{{ plan.price }}
					</p>
				</div>
				<div class="user-price">
					<i class="icon-user"></i>
					<p
					class="plan-title">
						Cada usuario extra
					</p>
					<p
					class="price">
						{{ plan.user_price }}
					</p>
				</div>
				<div class="online-price">
					<i class="icon-user"></i>
					<p
					class="plan-title">
						Tu propia Tienda Online
					</p>
					<p
					class="price">
						{{ plan.online_price }}
					</p>
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
	.cont-plan
		width: 100%
		display: flex
		flex-direction: row 
		justify-content: space-around
		// border: 2px solid #000
		@media screen and (max-width: 992px)
			flex-wrap: wrap 
		[class^='icon-']
			font-size: 60px
		.plan-title 
			color: #000
			font-size: 18px
			// margin-bottom: 0
			margin: 20px 0
		.price 
			color: rgba(0, 0, 0, .6)
			// font-weight: bold 
			font-size: 40px
	

</style>
<template>
	<div 
	@click="toWhatsApp"
	:class="scroll_bottom ? 'appear' : 'disappear'"
	class="btn-whatsapp btn-whatsapp-fixed s-1">
		<img src="@/assets/whastapp.png">
		<p>
			Pregunta lo que necesites...
		</p>
	</div>
</template>
<script>
export default {
	data() {
		return {
			scroll: 0,
			scroll_bottom: false,
		}
	},
	created() {
		window.addEventListener('scroll', () => {
			if (this.scroll < window.scrollY) {
				if (window.scrollY >= 30) {
					this.scroll_bottom = true
				}
			} else {
				this.scroll_bottom = false
			} 
			this.scroll = window.scrollY
		})
	},
	methods: {
		toWhatsApp() {
			window.open('https://api.whatsapp.com/send?phone=3444622139')
		}
	}
}
</script>
<style lang="sass">
.btn-whatsapp
	display: flex 
	flex-direction: row 
	justify-content: space-between
	align-items: center 
	background: #25D366
	padding: 10px
	border-radius: 7px
	cursor: pointer 
	&:hover 
		background: darken(#25D366, 10)
		transform: scale(1.02)
		p 
			font-weight: bold


	@media screen and (max-width: 768px)
		width: 200px
	@media screen and (min-width: 768px)
		width: 270px

	img 
		width: 50px

	p 
		margin-bottom: 0
		color: #FFF

.btn-whatsapp-fixed
	position: fixed
	bottom: 20px
	z-index: 1000

.appear 
	transition: all .5s ease-out
	transform: scale(1)
	@media screen and (max-width: 768px)
		translate: calc(100vw - 225px)
	@media screen and (min-width: 768px)
		translate: calc(100vw - 305px)

.disappear
	// translate: calc(100vw + 270px)
	transition: all .5s ease-out
	transform: scale(.1)


	@media screen and (max-width: 768px)
		translate: calc(100vw + 200px)
	@media screen and (min-width: 768px)
		translate: calc(100vw + 270px)

</style>
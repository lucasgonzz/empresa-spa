<template>
	<div 
	class="somos-diferentes">
		<h3>
			Conoce lo que nos hace <strong>UNICOS</strong>
		</h3>

		<div 
		@click="scrollTo('#prices')"
		class="button m-t-15">
			Nuestro servicio
		</div>
	</div>
</template>
<script>
export default {
	methods: {	
		scrollTo(element) {
			this.$scrollTo(element)
		}
	}
}
</script>
<style lang="sass">
@import "@/sass/_custom"
.somos-diferentes
	// width: 600px
	height: 100%
	display: flex 
	flex-direction: column
	justify-content: center
	align-items: center

	img 
		width: 600px

	h3 
		color: #FFF
		strong	
			font-size: 1.2em
			letter-spacing: 5px

		@media screen and (max-width: 768px)
			font-size: 2em
		@media screen and (min-width: 768px)
			font-size: 3em

	.button 
		background: $blue 
		// width: 100%
		padding: 10px 20px
		color: #FFF
		border-radius: 10px
		font-size: 25px
		transition: all .2s
		cursor: pointer
		&:hover 
			transform: scale(1.1)
</style>
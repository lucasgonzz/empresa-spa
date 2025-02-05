<template>
	<div
	class="nav-scroll-buttons">
		<div 
		@click="scrollTo('#prices')"
		class="scroll-button d-none d-lg-block">
			Precios
		</div>
		<div 
		@click="scrollTo('#features')"
		class="scroll-button d-none d-lg-block">
			Funcionalidades
		</div>
		<div 
		@click="scrollTo('#clients')"
		class="scroll-button d-none d-lg-block">
			Clientes
		</div>
		<div 
		@click="toLogin"
		id="login-btn"
		class="scroll-button d-lg-none">
	        Iniciar sesion
		</div>
	</div>
</template>
<script>
export default {
	methods: {
		toLogin() {
			this.$router.push({name: 'login'})
		},
		scrollTo(element) {
			this.$scrollTo(element)
		}
	}
}
</script>
<style lang="sass">
.nav-scroll-buttons 
	display: flex
	@media screen and (max-width: 992px) 
		flex-direction: column
		.scroll-button
			text-align: left
			padding: 10px 20px
			font-size: 17px
	@media screen and (min-width: 992px) 
		flex-direction: row
		.scroll-button
			padding: 0 15px
			cursor: pointer
			color: #FFF 
</style>
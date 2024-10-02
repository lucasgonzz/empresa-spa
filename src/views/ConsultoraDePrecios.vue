<template>
	<div class="consultora-de-precios">
		
		<logo-empresa></logo-empresa>

		<buscador></buscador>

	</div>
</template>
<script>
export default {
	components: {
		LogoEmpresa: () => import('@/components/consultora-de-precios/components/LogoEmpresa'),
		Buscador: () => import('@/components/consultora-de-precios/components/buscador/Index'),
	},
	created() {
		setTimeout(() => {

			this.focus()
		}, 500)
	},
	methods: {
		focus() {
			let input = document.getElementById('consultora-buscador-input')

			if (input) {

				input.focus()
			}
		}
	}
}
</script>
<style lang="sass">
.consultora-de-precios
	width: 100vw
	height: 100vh
	display: flex  
	flex-direction: row 
	position: absolute
	left: 0
	top: 0
	background: #EEEEEE
	// background: #e3e3e3 
	z-index: 1000
</style>
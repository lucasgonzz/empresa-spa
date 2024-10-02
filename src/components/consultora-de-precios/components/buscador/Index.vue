<template>

	<div
	class="buscador-wrapper">
		
		<buscador-input></buscador-input>

		<info-article></info-article>
	</div>

</template>
<script>
export default {
	components: {
		BuscadorInput: () => import('@/components/consultora-de-precios/components/buscador/BuscadorInput'),
		InfoArticle: () => import('@/components/consultora-de-precios/components/buscador/InfoArticle'),
	}
}
</script>
<style lang="sass">
.buscador-wrapper
	display: flex  
	flex-direction: column 
	justify-content: center
</style>
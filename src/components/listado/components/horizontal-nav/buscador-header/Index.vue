<template>
	<div
	class="align-center buscador-listado">
		<add-to-selected
		class="d-none d-md-block"></add-to-selected>
		<name-search
		v-if="buscar_por_nombre"></name-search>
		<barcode-search
		v-else></barcode-search>
	</div>
</template>
<script>
export default {
	components: {
		AddToSelected: () => import('@/components/listado/components/horizontal-nav/buscador-header/AddToSelected'),
		NameSearch: () => import('@/components/listado/components/horizontal-nav/buscador-header/NameSearch'),
		BarcodeSearch: () => import('@/components/listado/components/horizontal-nav/buscador-header/BarcodeSearch'),
	},
	computed: {
		buscar_por_nombre() {
			if (
				this.hasExtencion('no_usar_codigos_de_barra')
				|| this.hasExtencion('atajo_buscar_por_nombre')
				|| this.is_mobile
			) {
				return true
			}
			return false 
		}
	}
}
</script>
<style lang="sass">
.buscador-listado
	@media screen and (max-width: 766px)
		width: 100%

	.search-component 
		width: 100%

	button
		border-radius: 5px 0 0 5px !important

	.cont-search, .input-search 
		border-radius: 0 5px 5px 0 !important

	.cont-search > .icon
		border-radius: 0 !important

	.input-search
		height: 36.5px !important
</style>
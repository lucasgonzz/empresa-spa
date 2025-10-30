<template>
	<div
	class="align-center buscador-listado">
		<add-to-selected></add-to-selected>
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
	button
		border-radius: 5px 0 0 5px !important

	.cont-search, .input-search
		border-radius: 0 5px 5px 0 !important

	.input-search
		height: 38px !important
</style>
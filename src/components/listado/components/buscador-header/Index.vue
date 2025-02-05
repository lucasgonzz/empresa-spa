<template>
	<div
	class="align-center">
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
		AddToSelected: () => import('@/components/listado/components/buscador-header/AddToSelected'),
		NameSearch: () => import('@/components/listado/components/buscador-header/NameSearch'),
		BarcodeSearch: () => import('@/components/listado/components/buscador-header/BarcodeSearch'),
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
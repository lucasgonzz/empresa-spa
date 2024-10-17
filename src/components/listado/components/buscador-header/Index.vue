<template>
	<div
	class="m-l-15 m-t-15">
		<name-search
		v-if="hasExtencion('no_usar_codigos_de_barra')"></name-search>
		<barcode-search
		v-else></barcode-search>
	</div>
</template>
<script>
export default {
	components: {
		NameSearch: () => import('@/components/listado/components/buscador-header/NameSearch'),
		BarcodeSearch: () => import('@/components/listado/components/buscador-header/BarcodeSearch'),
	}
}
</script>
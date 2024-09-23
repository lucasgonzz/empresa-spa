<template>
	<div
	class="j-start"> 

		<btn-aperturas
		:caja="caja"></btn-aperturas>
		
		<btn-movimientos
		:caja="caja"></btn-movimientos>

		<btn-abrir
		:caja="caja"></btn-abrir>
	</div>
</template>
<script>
export default {
	props: {
		caja: Object,
	},
	components: {
		BtnAperturas: () => import('@/components/caja/components/table-buttons/BtnAperturas'),
		BtnMovimientos: () => import('@/components/caja/components/table-buttons/BtnMovimientos'),
		BtnAbrir: () => import('@/components/caja/components/table-buttons/BtnAbrir'),
	}
}
</script>
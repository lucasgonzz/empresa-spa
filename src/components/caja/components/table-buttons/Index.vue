<template>
	<div
	class="j-start"> 

		<btn-aperturas
		:caja="caja"></btn-aperturas>

		<btn-movimientos
		:caja="caja"></btn-movimientos>

		<btn-abrir
		:caja="caja"></btn-abrir>

		<btn-liquidacion-config
		:caja="caja"></btn-liquidacion-config>
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
		BtnLiquidacionConfig: () => import('@/components/caja/components/table-buttons/BtnLiquidacionConfig'),
	}
}
</script>
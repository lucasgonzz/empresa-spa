<template>
	<div
	class="j-end">
		<btn-excel
		:apertura_caja="apertura_caja"></btn-excel>

		<btn-reabrir
		:apertura_caja="apertura_caja"></btn-reabrir>
	</div>
</template>
<script>
export default {
	props: {
		apertura_caja: Object,
	},
	components: {
		BtnExcel: () => import('@/components/caja/modals/aperturas/table-buttons/BtnExcel'),
		BtnReabrir: () => import('@/components/caja/modals/aperturas/table-buttons/BtnReabrir'),
	}

}
</script>
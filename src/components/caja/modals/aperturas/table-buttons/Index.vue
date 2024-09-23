<template>
	<div>
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
		BtnReabrir: () => import('@/components/caja/modals/aperturas/table-buttons/BtnReabrir'),
	}

}
</script>
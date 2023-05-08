<template>
	<div
	v-if="view == 'reportes'">
		<previus-days
		model_name_for_get_models="sale"
		model_name="report"></previus-days>

		<ingresos></ingresos>	
		<egresos></egresos>	
	</div> 
</template>
<script>
export default {
	components: {
		PreviusDays: () => import('@/common-vue/components/previus-days/Index'),
		Ingresos: () => import('@/components/caja/components/reports/Ingresos'),
		Egresos: () => import('@/components/caja/components/reports/Egresos'),
	},
}
</script>
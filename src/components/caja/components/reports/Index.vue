<template>
	<div
	v-if="view == 'reportes'">
		<previus-days
		model_name_for_get_models="sale"
		model_name="report"></previus-days>

		<employee-nav></employee-nav>

		<ingresos></ingresos>	
		<egresos></egresos>	
	</div> 
</template>
<script>
export default {
	components: {
		PreviusDays: () => import('@/common-vue/components/previus-days/Index'),
		EmployeeNav: () => import('@/components/caja/components/reports/EmployeeNav'),
		Ingresos: () => import('@/components/caja/components/reports/Ingresos'),
		Egresos: () => import('@/components/caja/components/reports/Egresos'),
	},
	created() {
		if (this.is_owner || this.is_admin) {
			this.$router.push({name: this.route_name, params: {view: this.view, sub_view: 'todos'}})
		} else {
			this.$router.push({name: this.route_name, params: {view: this.view, sub_view: this.user.id}})
		}
	}
}
</script>
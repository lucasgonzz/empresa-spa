<template>
	<b-row
	class="j-start">
		<b-col
		v-for="user in users"
		cols="12"
		lg="6">
			
			<div 
			class="chart-card">

				<div class="header">
					<h4>Ingresos de {{ user.user.name }}</h4>
				</div>

				<chart
				:user_prop="user"></chart>

			</div>
		</b-col>

	</b-row>
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/graficos/empleados/ingresos-por-empleado/Chart'),
	},
	computed: {
		company_performance() {
			return this.$store.state.reportes.model
		},
		users() {
			if (this.can('reportes.empleados.index.all')) {

				return this.company_performance.users_payment_methods_formated
			}

			if (this.can('reportes.empleados.index.only_your')) {

				return this.company_performance.users_payment_methods_formated.filter(users => {
					return users.user.id == this.user.id 
				})
			}
		}
	}
}
</script>
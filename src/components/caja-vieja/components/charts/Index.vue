<template>
	<div
	v-if="view == 'estadisticas'">

		<previus-days
		model_name_for_get_models="sale"
		model_name="chart"></previus-days>
	
		<div 
		v-if="loading"
		class="all-center-md">
			<div>
				<p
				class="m-b-0">
					Aguarde, por favor.
				</p>
				<p>
					Esto podria tartar unos minutos...
				</p>
				<b-spinner
				variant="primary"></b-spinner>
			</div>
		</div>
		<div
		v-else>
			<chart
			title="Articulos mas vendidos"
			model_name="article"></chart>
			<hr>
			
			<chart
			title="Categorias mas vendidas"
			model_name="category"></chart>
			<hr>
			
			<chart
			title="Sub Categorias mas vendidas"
			model_name="sub_category"></chart>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		PreviusDays: () => import('@/common-vue/components/previus-days/Index'),
		Chart: () => import('@/components/caja/components/charts/chart/Index'),
	},
	computed: {
		loading() {
			return this.$store.state.chart.loading
		},
	}
}
</script>
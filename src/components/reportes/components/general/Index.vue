<template>
	<div
	class="p-b-100"
	v-if="view == 'generales'">

		<div
		v-if="!loading">

			<!-- <rango-temporal></rango-temporal> -->
	  
			<icon-cards></icon-cards>

		</div>

		<div 
		v-else
		class="all-center">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

	</div>
</template>
<script>
export default {
	components: {
		RangoTemporal: () => import('@/components/reportes/components/general/select-date/Index'),
		IconCards: () => import('@/components/reportes/components/general/IconCards'),
	},
	computed: {
		loading() {
			return this.$store.state.reportes.loading
		},
	},
	created() {
		this.$store.dispatch('reportes/getReportes')
	},
}
</script>
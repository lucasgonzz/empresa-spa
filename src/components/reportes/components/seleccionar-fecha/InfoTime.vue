<template>
	<b-col
	v-if="rango_temporal == 'dia-actual'"
	cols="12">
		<p
		class="text-left m-t-15">
			Ultima actualizacion: <strong>{{ date(company_performance.created_at, true) }}</strong> ({{ since(company_performance.created_at) }})
		</p>
	</b-col>
</template>
<script>
export default {
	computed: {
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},
		company_performance() {
			return this.$store.state.reportes.model
		},
	},
}
</script>
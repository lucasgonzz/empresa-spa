<template>
	<b-row>
		<b-col
		:lg="cols">
			<categories></categories>
		</b-col>
		<b-col
		:lg="cols">
			<providers></providers>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		Categories: () => import('@/components/reportes/components/articulos/graficos/categories/Index'),
		Providers: () => import('@/components/reportes/components/articulos/graficos/providers/Index'),
	},
	computed: {
		categories() {  
			return this.$store.state.reportes.article_purchase.categories
		},
		cols() {
			if (this.categories.length >= 8) {
				return 12
			}
			return 6
		}
	}
}
</script>